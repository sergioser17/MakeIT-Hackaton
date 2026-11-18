let GEMINI_API_KEY = (typeof CONFIG_GEMINI_KEY !== 'undefined') ? CONFIG_GEMINI_KEY : 'YOUR_GEMINI_API_KEY';

const loadingState = document.getElementById('loadingState');
const questionState = document.getElementById('questionState');
const failState = document.getElementById('failState');
const errorState = document.getElementById('errorState');
const questionText = document.getElementById('questionText');
const answerInput = document.getElementById('answerInput');
const submitBtn = document.getElementById('submitBtn');
const evaluatingSpinner = document.getElementById('evaluatingSpinner');
const roastText = document.getElementById('roastText');
const errorText = document.getElementById('errorText');
const retryBtn = document.getElementById('retryBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');
const quickPassBtn = document.getElementById('quickPassBtn');
const quickPassLoadingBtn = document.getElementById('quickPassLoadingBtn');

const params = new URLSearchParams(window.location.search);
const targetUrl = params.get('target') || '';

let studyText = '';
let currentAnswerContext = '';

function showState(state) {
  loadingState.classList.add('hidden');
  questionState.classList.add('hidden');
  failState.classList.add('hidden');
  errorState.classList.add('hidden');

  if (state === 'loading') loadingState.classList.remove('hidden');
  if (state === 'question') questionState.classList.remove('hidden');
  if (state === 'fail') failState.classList.remove('hidden');
  if (state === 'error') errorState.classList.remove('hidden');
}

function safeParseJSON(raw) {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  if (cleaned.includes("'") && !cleaned.includes('"')) {
    cleaned = cleaned.replace(/'/g, '"');
  }

  return JSON.parse(cleaned);
}

const MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview'];
const REQUEST_TIMEOUT_MS = 10000;

function setLoadingStatus(msg) {
  const el = document.getElementById('loadingStatus');
  if (el) el.textContent = msg;
}

async function callGemini(systemPrompt, userPrompt) {
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }]
  });

  let lastError = null;

  for (const model of MODELS) {
    setLoadingStatus(`Connecting to ${model}...`);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal
      });

      clearTimeout(timer);

      if (response.status === 503 || response.status === 429) {
        lastError = new Error(`${model}: overloaded (${response.status})`);
        continue;
      }

      if (response.status === 404) {
        lastError = new Error(`${model}: not found`);
        continue;
      }

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from model');
      return text;

    } catch (err) {
      if (err.name === 'AbortError') {
        lastError = new Error(`${model}: timed out`);
        continue;
      }
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('Models unavailable. Please retry in a moment.');
}

async function generateQuestion() {
  showState('loading');

  try {
    const data = await chrome.storage.local.get(['studyMaterial']);
    studyText = data.studyMaterial || '';

    if (!studyText) {
      throw new Error('No study material found. Open the popup to save your notes.');
    }

    const systemPrompt =
      'You are a strict teacher. Generate 1 hard question strictly based on the provided text. ' +
      'The question should test deep understanding, not simple recall. ' +
      'Return ONLY a valid JSON object with no extra text: { "question": "the question text", "answer_context": "the expected concept or key answer points" }';

    const rawResponse = await callGemini(systemPrompt, studyText);
    const parsed = safeParseJSON(rawResponse);

    if (!parsed.question || !parsed.answer_context) {
      throw new Error('Malformed question data received.');
    }

    currentAnswerContext = parsed.answer_context;
    questionText.textContent = parsed.question;
    showState('question');
    answerInput.value = '';
    answerInput.focus();

  } catch (err) {
    console.error('generateQuestion error:', err);
    errorText.textContent = err.message;
    showState('error');
  }
}

async function evaluateAnswer() {
  const userAnswer = answerInput.value.trim();
  if (!userAnswer) {
    answerInput.classList.add('shake');
    setTimeout(() => answerInput.classList.remove('shake'), 600);
    return;
  }

  submitBtn.disabled = true;
  evaluatingSpinner.classList.remove('hidden');

  try {
    const systemPrompt =
      'You are a strict but fair teacher evaluating a student answer. ' +
      'Evaluate if the answer demonstrates correct understanding based on the source text. ' +
      'Be lenient with phrasing but strict with factual accuracy. ' +
      'Return ONLY a valid JSON object: { "isCorrect": boolean, "roast": "a 15-word aggressive roast if wrong, or empty string if correct" }';

    const userPrompt =
      `SOURCE TEXT:\n${studyText}\n\n` +
      `EXPECTED CONCEPT:\n${currentAnswerContext}\n\n` +
      `STUDENT ANSWER:\n${userAnswer}`;

    const rawResponse = await callGemini(systemPrompt, userPrompt);
    const parsed = safeParseJSON(rawResponse);

    if (typeof parsed.isCorrect !== 'boolean') {
      throw new Error('Invalid evaluation format received.');
    }

    if (parsed.isCorrect) {
      await handleCorrectAnswer();
    } else {
      handleWrongAnswer(parsed.roast || 'Wrong. Try harder.');
    }

  } catch (err) {
    console.error('evaluateAnswer error:', err);
    errorText.textContent = err.message;
    showState('error');
  } finally {
    submitBtn.disabled = false;
    evaluatingSpinner.classList.add('hidden');
  }
}

function unlockForDuration(durationMs) {
  let domain = '';
  try {
    domain = new URL(targetUrl).hostname.replace(/^www\./, '');
    const blockedDomains = ['youtube.com', 'instagram.com', 'facebook.com', 'reddit.com'];
    const matched = blockedDomains.find(d => domain === d || domain.endsWith('.' + d));
    if (matched) domain = matched;
  } catch {
    domain = targetUrl;
  }

  chrome.runtime.sendMessage({
    type: 'WHITELIST_AND_REDIRECT',
    domain,
    targetUrl,
    durationMs
  }, (response) => {
    if (!response?.success) {
      window.location.href = targetUrl;
    }
  });
}

async function handleCorrectAnswer() {
  unlockForDuration(5 * 60 * 1000);
}

function handleQuickPass() {
  unlockForDuration(60 * 1000);
}

function handleWrongAnswer(roast) {
  roastText.textContent = 'WROOOONGG! BACK TO LEARNING!!';
  showState('fail');
  failState.classList.add('shake');
  setTimeout(() => failState.classList.remove('shake'), 600);
  if (tryAgainBtn) tryAgainBtn.focus();
}

submitBtn.addEventListener('click', evaluateAnswer);

answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') evaluateAnswer();
});

if (tryAgainBtn) {
  tryAgainBtn.addEventListener('click', () => {
    showState('question');
    answerInput.value = '';
    answerInput.focus();
  });
}

if (quickPassBtn) {
  quickPassBtn.addEventListener('click', handleQuickPass);
}

if (quickPassLoadingBtn) {
  quickPassLoadingBtn.addEventListener('click', handleQuickPass);
}

retryBtn.addEventListener('click', () => {
  generateQuestion();
});

generateQuestion();
