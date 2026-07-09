// ---------------------------------------------
// Clarity 2.0 — "New concept" modal
// ---------------------------------------------
//
// Small centered dialog that asks for the business/brand name upfront
// before dropping the user into Chat. This solves the problem where the
// extractor turned a user's first question ("How do I get more?") into
// the concept's name. With a name pre-set, Clara only extracts type /
// product / goal from the first chat message.

function _openNewConceptModal() {
  if (document.getElementById('nmOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'nmOverlay';
  overlay.className = 'nm-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'New concept');
  overlay.innerHTML = `
    <div class="nm-modal">
      <div class="nm-header">
        <div class="nm-title">New concept</div>
        <div class="nm-sub">Give this business or brand a name. Clara will take it from there.</div>
      </div>
      <input
        class="nm-input"
        id="nmInput"
        type="text"
        placeholder="e.g. Ahmed's Bakery"
        autocomplete="off"
        maxlength="60"
      />
      <div class="nm-actions">
        <button type="button" class="nm-cancel" id="nmCancel">Cancel</button>
        <button type="button" class="nm-create" id="nmCreate" disabled>Create \u2192</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  requestAnimationFrame(function () {
    overlay.classList.add('nm-overlay-open');
  });

  const input = document.getElementById('nmInput');
  const createBtn = document.getElementById('nmCreate');
  const cancelBtn = document.getElementById('nmCancel');
  if (!input || !createBtn || !cancelBtn) return;

  setTimeout(function () { input.focus(); }, 50);

  input.addEventListener('input', function () {
    createBtn.disabled = input.value.trim() === '';
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !createBtn.disabled) {
      e.preventDefault();
      _submitNewConcept();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      _closeNewConceptModal();
    }
  });

  createBtn.addEventListener('click', _submitNewConcept);
  cancelBtn.addEventListener('click', _closeNewConceptModal);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) _closeNewConceptModal();
  });
}

function _submitNewConcept() {
  const input = document.getElementById('nmInput');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  _closeNewConceptModal();
  createConcept({ name: name, focusChat: true });
  renderApp();
}

function _closeNewConceptModal() {
  const overlay = document.getElementById('nmOverlay');
  if (!overlay) return;
  overlay.classList.remove('nm-overlay-open');
  overlay.classList.add('nm-overlay-closing');
  setTimeout(function () {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, 180);
}

window._openNewConceptModal = _openNewConceptModal;
window._closeNewConceptModal = _closeNewConceptModal;
