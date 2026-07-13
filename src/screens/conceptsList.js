// ---------------------------------------------
// Clarity 2.0 \u2014 Concepts List page ("View all concepts")
// ---------------------------------------------
//
// A gallery of every concept the user owns. Clicking a card switches
// the active concept and lands on its Today view (or resumes onboarding
// if it isn't done). Reached from the sidebar concept picker's
// "View all concepts" action.

// Status pill copy per lifecycle stage. Kept minimal: teal Ready for
// concepts that finished onboarding, amber In progress for anything
// mid-flow.
const CL_STATUS_READY_LABEL = 'Ready';
const CL_STATUS_INPROG_LABEL = 'In progress';

function renderConceptsList(container) {
  if (!container) return;

  const ids = Object.keys(appState.concepts).sort(function (a, b) {
    return (appState.concepts[a].createdAt || 0) - (appState.concepts[b].createdAt || 0);
  });

  const empty = ids.length === 0;
  const cardsHtml = empty
    ? _renderConceptsListEmpty()
    : ids.map(function (id) { return _renderConceptCard(appState.concepts[id]); }).join('');

  container.innerHTML = `
    <div class="cl-page">
      <div class="cl-page-header">
        <div>
          <h1 class="cl-page-heading">Your concepts</h1>
          <p class="cl-page-sub">Every business Clara is running for you. Open one to keep working, or start a new one.</p>
        </div>
        <button type="button" class="cl-page-new" id="clpNewBtn">
          <span class="cl-page-new-glyph" aria-hidden="true">+</span>
          <span>New concept</span>
        </button>
      </div>
      <div class="cl-grid ${empty ? 'cl-grid-empty' : ''}">${cardsHtml}</div>
    </div>
  `;

  _bindConceptsListEvents();
}

function _renderConceptCard(c) {
  const b = c.business || {};
  const name = (b.name && b.name.trim()) || 'New concept';
  const typeLabel = (window.SB_TYPE_LABELS && b.type) ? (window.SB_TYPE_LABELS[b.type] || '') : '';
  const location = (b.location || '').trim();
  const created = _clpFormatDate(c.createdAt || Date.now());
  const ready = !!(c.chat && c.chat.onboardingComplete);
  const statusLabel = ready ? CL_STATUS_READY_LABEL : CL_STATUS_INPROG_LABEL;
  const statusClass = ready ? 'cl-card-status-ready' : 'cl-card-status-inprog';
  const color = c.color || 'var(--accent)';

  const meta = [typeLabel, location].filter(Boolean).join(' \u00b7 ');

  return `
    <button type="button" class="cl-card" data-concept="${_escape(c.id)}" style="--concept-color:${color}">
      <div class="cl-card-head">
        <div class="cl-card-name" title="${_escape(name)}">${_escape(name)}</div>
        <span class="cl-card-status ${statusClass}">
          <span class="cl-card-status-dot" aria-hidden="true"></span>
          ${_escape(statusLabel)}
        </span>
      </div>
      ${meta ? '<div class="cl-card-meta">' + _escape(meta) + '</div>' : '<div class="cl-card-meta cl-card-meta-empty">Onboarding in progress</div>'}
      <div class="cl-card-foot">
        <span class="cl-card-created">Created ${_escape(created)}</span>
        <span class="cl-card-arrow" aria-hidden="true">\u2192</span>
      </div>
    </button>
  `;
}

function _renderConceptsListEmpty() {
  return `
    <div class="cl-empty">
      <div class="cl-empty-title">No concepts yet.</div>
      <div class="cl-empty-sub">Start your first business and Clara will build a workspace around it.</div>
    </div>
  `;
}

function _clpFormatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return sameYear
    ? months[d.getMonth()] + ' ' + d.getDate()
    : months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function _bindConceptsListEvents() {
  document.querySelectorAll('[data-concept]').forEach(function (card) {
    card.addEventListener('click', function () {
      const id = card.getAttribute('data-concept');
      if (!id) return;
      switchConcept(id);
      renderApp();
    });
  });

  const newBtn = document.getElementById('clpNewBtn');
  if (newBtn) {
    newBtn.addEventListener('click', function () {
      // Same guard as the sidebar's + New concept button: block spawning
      // a second concept while any current one is still being onboarded.
      const ids = Object.keys(appState.concepts || {});
      for (let i = 0; i < ids.length; i++) {
        const c = appState.concepts[ids[i]];
        if (c && c.chat && c.chat.onboardingComplete === false) {
          _clpFlashHint('Finish setting up your current concept first.');
          return;
        }
      }
      createConcept({});
      renderApp();
    });
  }
}

// Small transient hint pinned near the page header when the user tries
// to create a second concept while the current one is incomplete.
function _clpFlashHint(msg) {
  const host = document.querySelector('.cl-page-header');
  if (!host) return;
  const existing = host.querySelector('.cl-page-hint');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  const el = document.createElement('div');
  el.className = 'cl-page-hint';
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('cl-page-hint-visible'); });
  setTimeout(function () {
    el.classList.remove('cl-page-hint-visible');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
  }, 2400);
}

window.renderConceptsList = renderConceptsList;
