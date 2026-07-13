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
  // Fire Clara's returning-user check BEFORE the first render so the
  // welcome-back message is already on the log by the time the sidebar
  // and Chat view mount \u2014 the unread badge then shows on the very
  // first paint instead of popping in a beat later.
  if (typeof _claraCheckReturningUser === 'function') {
    try { _claraCheckReturningUser(); } catch (err) { console.error('Returning-user check failed:', err); }
  }
  renderApp();
});
