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
  renderApp();
});
