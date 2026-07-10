// ---------------------------------------------
// Clarity 2.0 — "New concept" modal
// ---------------------------------------------
//
// Small centered dialog that asks for the business/brand name upfront
// before dropping the user into Chat. This solves the problem where the
// extractor turned a user's first question ("How do I get more?") into
// the concept's name. With a name pre-set, Clara only extracts type /
// product / goal from the first chat message.

function _openNewConceptModal(opts) {
  if (document.getElementById('nmOverlay')) return;

  const mandatory = !!(opts && opts.mandatory);
  const firstTime = !!(opts && opts.firstTime);

  // First-time users get a warmer variant. Existing users adding a second
  // concept get the terser "New concept" header.
  const title = firstTime ? 'Let\u2019s name your business.' : 'New concept';
  const sub = firstTime
    ? 'What do you want to call this? Clara will build everything around it.'
    : 'Give this business or brand a name. Clara will take it from there.';
  const cta = firstTime ? 'Get started \u2192' : 'Create \u2192';

  const overlay = document.createElement('div');
  overlay.id = 'nmOverlay';
  overlay.className = 'nm-overlay' + (mandatory ? ' nm-overlay-mandatory' : '');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', title);
  overlay.setAttribute('data-mandatory', mandatory ? '1' : '0');
  overlay.innerHTML = `
    <div class="nm-modal">
      <div class="nm-header">
        <div class="nm-title">${_escape(title)}</div>
        <div class="nm-sub">${_escape(sub)}</div>
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
        ${mandatory ? '' : '<button type="button" class="nm-cancel" id="nmCancel">Cancel</button>'}
        <button type="button" class="nm-create" id="nmCreate" disabled>${_escape(cta)}</button>
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
  if (!input || !createBtn) return;

  setTimeout(function () { input.focus(); }, 50);

  input.addEventListener('input', function () {
    createBtn.disabled = input.value.trim() === '';
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !createBtn.disabled) {
      e.preventDefault();
      _submitNewConcept();
    } else if (e.key === 'Escape' && !mandatory) {
      e.preventDefault();
      _closeNewConceptModal();
    }
  });

  createBtn.addEventListener('click', _submitNewConcept);
  if (cancelBtn) cancelBtn.addEventListener('click', _closeNewConceptModal);

  overlay.addEventListener('click', function (e) {
    if (mandatory) return;
    if (e.target === overlay) _closeNewConceptModal();
  });
}

function _submitNewConcept() {
  const input = document.getElementById('nmInput');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  _closeNewConceptModal();
  // Dead code path: the sidebar/welcome flows no longer open this
  // modal (the concept-name step now lives inside Clara's onboarding
  // conversation). Kept here so the file compiles until we delete it.
  createConcept({ name: name });
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
