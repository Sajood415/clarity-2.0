// ---------------------------------------------
// Clarity 2.0 — Clara Training Stats page
// ---------------------------------------------
//
// Full breakdown of how trained Clara is on the active concept.
// Reached from the top-bar More (⋯) menu, under Personas.
// Reads getTrainingBreakdown() / getTrainingScore() from state.js.

function renderTrainingStats(container) {
  if (!container) return;

  const concept = (typeof getActiveConcept === 'function') ? getActiveConcept() : null;
  if (!concept) {
    container.innerHTML = ''
      + '<div class="ts-page">'
      +   '<button type="button" class="ts-back" id="tsBackBtn" aria-label="Back to Today">'
      +     '<span aria-hidden="true">\u2190</span> Today'
      +   '</button>'
      +   '<p class="ts-empty">No active concept. Finish onboarding first.</p>'
      + '</div>';
    _tsBindEvents(container);
    return;
  }

  const breakdownFn = (typeof getTrainingBreakdown === 'function') ? getTrainingBreakdown : null;
  const b = breakdownFn ? breakdownFn(concept) : {
    score: 0,
    onboarding: { points: 0, max: 30 },
    tasks: { points: 0, max: 30 },
    results: { points: 0, max: 25 },
    days: { points: 0, max: 15 },
    copy: 'Just getting started. Complete more tasks to help Clara learn.'
  };

  const score = Math.max(0, Math.min(100, Number(b.score) || 0));
  const businessName = (concept.business && concept.business.name && concept.business.name.trim())
    ? concept.business.name.trim()
    : 'your business';

  const cards = [
    {
      key: 'onboarding',
      label: 'Onboarding completeness',
      part: b.onboarding,
      tip: 'Fill in every onboarding field — name, type, customer, goals, channels, budget, and location.'
    },
    {
      key: 'tasks',
      label: 'Tasks completed',
      part: b.tasks,
      tip: 'Mark Today tasks as done. Completing more of Clara\'s suggestions raises this score.'
    },
    {
      key: 'results',
      label: 'Results received',
      part: b.results,
      tip: 'Publish content from Create. Four published pieces unlock the full 25 points.'
    },
    {
      key: 'days',
      label: 'Days active',
      part: b.days,
      tip: 'Keep using this concept over time. Score fills fully after about 60 days of activity.'
    }
  ];

  const cardsHtml = cards.map(_tsRenderSignalCard).join('');

  container.innerHTML = ''
    + '<div class="ts-page">'
    +   '<button type="button" class="ts-back" id="tsBackBtn" aria-label="Back to Today">'
    +     '<span aria-hidden="true">\u2190</span> Today'
    +   '</button>'
    +   '<header class="ts-header">'
    +     '<p class="ts-eyebrow">CLARA TRAINING</p>'
    +     '<h1 class="ts-heading">Clara Training Stats</h1>'
    +     '<p class="ts-sub">How well Clara understands ' + _escape(businessName) + '.</p>'
    +   '</header>'
    +   '<section class="ts-hero" aria-label="Overall training score">'
    +     '<div class="ts-hero-top">'
    +       '<div class="ts-hero-copy-wrap">'
    +         '<p class="ts-hero-label">Overall score</p>'
    +         '<p class="ts-hero-copy">' + _escape(b.copy || '') + '</p>'
    +       '</div>'
    +       '<div class="ts-hero-score" aria-hidden="true">'
    +         '<span class="ts-hero-score-num">' + score + '</span>'
    +         '<span class="ts-hero-score-unit">%</span>'
    +       '</div>'
    +     '</div>'
    +     '<div class="ts-hero-track" aria-hidden="true">'
    +       '<div class="ts-hero-fill" style="width:' + score + '%"></div>'
    +     '</div>'
    +   '</section>'
    +   '<div class="ts-grid">' + cardsHtml + '</div>'
    + '</div>';

  _tsBindEvents(container);
}

function _tsRenderSignalCard(card) {
  const part = card.part || { points: 0, max: 1 };
  const max = Number(part.max) || 1;
  const pts = Number(part.points) || 0;
  const pct = Math.max(0, Math.min(100, (pts / max) * 100));
  const ptsLabel = (Math.round(pts * 10) / 10) + ' / ' + max;

  return ''
    + '<article class="ts-card">'
    +   '<div class="ts-card-top">'
    +     '<h2 class="ts-card-title">' + _escape(card.label) + '</h2>'
    +     '<span class="ts-card-pts">' + _escape(ptsLabel) + '</span>'
    +   '</div>'
    +   '<div class="ts-card-track" aria-hidden="true">'
    +     '<div class="ts-card-fill" style="width:' + pct + '%"></div>'
    +   '</div>'
    +   '<p class="ts-card-tip">' + _escape(card.tip) + '</p>'
    + '</article>';
}

function _tsBindEvents(container) {
  const back = container.querySelector('#tsBackBtn');
  if (back) {
    back.addEventListener('click', function () {
      if (typeof setActiveView === 'function') setActiveView('today');
      if (typeof renderApp === 'function') renderApp();
    });
  }
}

window.renderTrainingStats = renderTrainingStats;
