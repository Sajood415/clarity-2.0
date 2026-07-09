// ---------------------------------------------
// Clarity 2.0 — Splash Screen
// ---------------------------------------------

function renderSplash(root) {
  const word = 'Clarity';
  const letters = word.split('').map(function (ch, i) {
    return '<span class="sp-letter" style="animation-delay:' + (i * 80) + 'ms">' + ch + '</span>';
  }).join('');

  root.innerHTML = `
    <div class="sp-screen" id="spScreen">
      <div class="sp-glow"></div>
      <div class="sp-content">
        <div class="sp-letters">${letters}</div>
        <div class="sp-subtitle">Your business advisor.</div>
      </div>
    </div>
  `;

  setTimeout(function () {
    if (appState.mode !== 'splash') return;
    const screen = document.getElementById('spScreen');
    if (screen) screen.classList.add('sp-screen-out');
  }, 2600);

  setTimeout(function () {
    if (appState.mode !== 'splash') return;
    appState.mode = 'auth';
    _saveState();
    renderApp();
  }, 3000);
}

window.renderSplash = renderSplash;
