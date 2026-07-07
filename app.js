// ---------------------------------------------
// Clarity 2.0 — Core App State & Render Router
// ---------------------------------------------

const STATE_KEY = 'clarity_v2';

let appState = {
  mode: 'onboarding',
  user: null,
  business: { name: '', goal: '', reach: '' },
  clara: { messages: [], onboardingComplete: false },
  today: { tasks: [], lastUpdated: null },
  create: { step: null, type: null, platform: null, angle: null, variations: [], selected: null },
  results: { items: [], unlocked: false }
};

function _saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

function _restoreState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      appState = JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to restore state:', err);
  }
}

function renderApp() {
  const root = document.getElementById('app');
  if (!root) return;

  switch (appState.mode) {
    case 'onboarding':
      root.innerHTML = '';
      break;
    case 'home':
      root.innerHTML = '';
      break;
    case 'create':
      root.innerHTML = '';
      break;
    case 'results':
      root.innerHTML = '';
      break;
    default:
      root.innerHTML = '';
      break;
  }
}

window.clarityReset = function () {
  localStorage.removeItem(STATE_KEY);
  window.location.reload();
};

document.addEventListener('DOMContentLoaded', function () {
  _restoreState();
  renderApp();
});
