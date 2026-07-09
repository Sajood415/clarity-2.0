// ---------------------------------------------
// Clarity 2.0 — Concept header
// ---------------------------------------------
//
// A small horizontal badge that sits at the top of every home view. It
// makes it obvious which concept you're in — same shell, different
// concept. Uses the concept's assigned color for the avatar so switching
// concepts feels visually distinct.

function _renderConceptHeader() {
  const c = getActiveConcept();
  if (!c) return '';

  const b = c.business || {};
  const name = (b.name && b.name.trim()) || 'New concept';
  const initial = (name.trim().charAt(0) || 'C').toUpperCase();
  const color = c.color || '#F5A623';

  const typeLabel = (b.type && b.type !== 'other') ? _capitalize(b.type) : '';
  const reachLabel = b.reach === 'local' ? 'Local' : (b.reach === 'online' ? 'Online' : '');
  const meta = [typeLabel, reachLabel].filter(Boolean).join(' \u00b7 ');

  return `
    <div class="ch-header" style="--concept-color:${color}">
      <div class="ch-avatar" style="background:${color}">${_escape(initial)}</div>
      <div class="ch-info">
        <div class="ch-name">${_escape(name)}</div>
        ${meta ? `<div class="ch-meta">${_escape(meta)}</div>` : ''}
      </div>
    </div>
  `;
}

window._renderConceptHeader = _renderConceptHeader;
