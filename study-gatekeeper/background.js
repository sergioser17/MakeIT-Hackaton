const BLOCKED_DOMAINS = [
  'youtube.com',
  'instagram.com',
  'facebook.com',
  'reddit.com'
];

const WHITELIST_DURATION_MS = 5 * 60 * 1000;

let focusActive = false;
let whitelist = {};

chrome.storage.local.get(['isFocusActive', 'whitelist'], (data) => {
  focusActive = !!data.isFocusActive;
  whitelist = data.whitelist || {};
  cleanExpiredWhitelist();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.isFocusActive) {
    focusActive = !!changes.isFocusActive.newValue;
  }
  if (changes.whitelist) {
    whitelist = changes.whitelist.newValue || {};
  }
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  if (details.url.startsWith('chrome-extension://')) return;
  if (details.url.startsWith('chrome://')) return;

  if (!focusActive) return;

  const matchedDomain = getBlockedDomain(details.url);
  if (!matchedDomain) return;

  if (isDomainWhitelisted(matchedDomain)) return;

  const blockUrl = chrome.runtime.getURL('block.html')
    + '?target=' + encodeURIComponent(details.url);

  chrome.tabs.update(details.tabId, { url: blockUrl });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'WHITELIST_AND_REDIRECT') {
    const { domain, targetUrl } = message;
    const tabId = sender.tab?.id;

    if (!domain || !targetUrl || !tabId) {
      sendResponse({ success: false, error: 'Missing data' });
      return;
    }

    const expiry = Date.now() + WHITELIST_DURATION_MS;
    whitelist[domain] = expiry;

    chrome.storage.local.set({ whitelist }, () => {
      chrome.tabs.update(tabId, { url: targetUrl }, () => {
        const onUpdated = (updatedTabId, changeInfo) => {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            chrome.scripting.executeScript({
              target: { tabId },
              files: ['content.js']
            }).catch(() => {});
          }
        };
        chrome.tabs.onUpdated.addListener(onUpdated);
        setTimeout(() => chrome.tabs.onUpdated.removeListener(onUpdated), 15000);
      });

      sendResponse({ success: true });
    });

    return true;
  }

  if (message.type === 'GET_TIMER_DURATION') {
    const url = sender.tab?.url || '';
    const domain = getBlockedDomainFromUrl(url);
    if (domain && whitelist[domain]) {
      const remaining = Math.max(0, whitelist[domain] - Date.now());
      sendResponse({ remainingMs: remaining });
    } else {
      sendResponse({ remainingMs: 0 });
    }
    return true;
  }

  if (message.type === 'END_BREAK_NOW') {
    const url = sender.tab?.url || '';
    const domain = getBlockedDomainFromUrl(url);
    if (domain && whitelist[domain]) {
      delete whitelist[domain];
      chrome.storage.local.set({ whitelist });
    }
    sendResponse({ success: true });
    return true;
  }
});

function getBlockedDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BLOCKED_DOMAINS.find(d =>
      hostname === d || hostname.endsWith('.' + d)
    ) || null;
  } catch {
    return null;
  }
}

function getBlockedDomainFromUrl(url) {
  return getBlockedDomain(url);
}

function isDomainWhitelisted(domain) {
  if (!whitelist[domain]) return false;
  if (Date.now() > whitelist[domain]) {
    delete whitelist[domain];
    chrome.storage.local.set({ whitelist });
    return false;
  }
  return true;
}

function cleanExpiredWhitelist() {
  const now = Date.now();
  let changed = false;
  for (const domain of Object.keys(whitelist)) {
    if (now > whitelist[domain]) {
      delete whitelist[domain];
      changed = true;
    }
  }
  if (changed) {
    chrome.storage.local.set({ whitelist });
  }
}
