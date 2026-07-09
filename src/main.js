// ---------------------------------------------
// Clarity 2.0 — Entry point
// ---------------------------------------------

window.clarityReset = function () {
  localStorage.removeItem(STATE_KEY);
  window.location.reload();
};

document.addEventListener('DOMContentLoaded', function () {
  _restoreState();
  renderApp();
});
