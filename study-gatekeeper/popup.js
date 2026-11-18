const studyMaterial = document.getElementById('studyMaterial');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const setupView = document.getElementById('setupView');
const activeView = document.getElementById('activeView');
const setupError = document.getElementById('setupError');
const materialPreview = document.getElementById('materialPreview');

chrome.storage.local.get(['isFocusActive', 'studyMaterial'], (data) => {
  if (data.isFocusActive) {
    showActiveView(data.studyMaterial || '');
  } else {
    showSetupView(data.studyMaterial || '');
  }
});

startBtn.addEventListener('click', () => {
  const text = studyMaterial.value.trim();

  if (text.length < 20) {
    setupError.textContent = 'Please paste at least a few sentences of study material.';
    setupError.classList.remove('hidden');
    return;
  }
  setupError.classList.add('hidden');

  chrome.storage.local.set({
    studyMaterial: text,
    isFocusActive: true,
    whitelist: {}
  }, () => {
    showActiveView(text);
  });
});

stopBtn.addEventListener('click', () => {
  chrome.storage.local.set({
    isFocusActive: false,
    whitelist: {}
  }, () => {
    showSetupView('');
  });
});

function showSetupView(savedText) {
  setupView.classList.remove('hidden');
  activeView.classList.add('hidden');
  if (savedText) studyMaterial.value = savedText;
}

function showActiveView(text) {
  setupView.classList.add('hidden');
  activeView.classList.remove('hidden');
  materialPreview.textContent = text.substring(0, 80) + (text.length > 80 ? '...' : '');
}
