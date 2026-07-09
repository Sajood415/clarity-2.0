// ---------------------------------------------
// Clarity 2.0 — Loading Screen
// ---------------------------------------------

function renderLoading(root) {
  root.innerHTML = `
    <div class="ld-screen">
      <div class="ld-logo">C</div>
      <div class="ld-brand">Clarity</div>
      <div class="ld-bar-wrap"><div class="ld-bar-fill"></div></div>
      <div class="ld-status" id="ldStatus">Setting up your workspace...</div>
    </div>
  `;

  const messages = [
    'Setting up your workspace...',
    'Loading your profile...',
    'Almost ready...'
  ];
  let idx = 0;
  const statusEl = document.getElementById('ldStatus');

  const interval = setInterval(function () {
    if (appState.mode !== 'loading') {
      clearInterval(interval);
      return;
    }
    idx = (idx + 1) % messages.length;
    if (statusEl) statusEl.textContent = messages[idx];
  }, 500);

  setTimeout(function () {
    clearInterval(interval);
    if (appState.mode !== 'loading') return;
    appState.mode = 'welcome';
    _saveState();
    renderApp();
  }, 1500);
}

window.renderLoading = renderLoading;
