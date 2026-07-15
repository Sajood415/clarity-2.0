// ---------------------------------------------
// Clarity 2.0 — Entry point
// ---------------------------------------------

window.clarityReset = function () {
  localStorage.removeItem(STATE_KEY);
  window.location.reload();
};

// Alias \u2014 the sidebar's inline logout confirmation calls this once the
// user has actually confirmed. Same effect as `clarityReset` (wipe local
// state and reload), just named for the user-facing action.
window.clarityLogout = window.clarityReset;

document.addEventListener('DOMContentLoaded', function () {
  _restoreState();
  // Apply the persisted colour-mode preference BEFORE the first paint
  // so a returning light-mode user never sees the dark canvas flash.
  // The body class is the only source of truth CSS reads; appState
  // holds the value that survives reloads. See styles/tokens.css for
  // the body.light-mode override block.
  if (appState.colorMode === 'light') {
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
  }
  // Fire Clara's returning-user check BEFORE the first render so the
  // welcome-back message is already on the log by the time the sidebar
  // and Chat view mount \u2014 the unread badge then shows on the very
  // first paint instead of popping in a beat later.
  if (typeof _claraCheckReturningUser === 'function') {
    try { _claraCheckReturningUser(); } catch (err) { console.error('Returning-user check failed:', err); }
  }
  renderApp();
});
