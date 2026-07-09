// ---------------------------------------------
// Clarity 2.0 — Utils
// ---------------------------------------------

function _escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _capitalize(str) {
  const s = String(str || '');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function _greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function _firstName() {
  const raw = (appState.user && appState.user.name) ? String(appState.user.name) : '';
  return raw ? raw.split(' ')[0] : 'there';
}

window._escape = _escape;
window._capitalize = _capitalize;
window._greeting = _greeting;
window._firstName = _firstName;
