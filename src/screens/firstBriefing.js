// ---------------------------------------------
// Clarity 2.0 -- First-time Insights Briefing
// ---------------------------------------------
//
// A full-screen "welcome to Clara" landing that runs exactly ONCE
// per concept, immediately after onboarding's building animation
// fades out. Same visual language as the onboarding overlay
// (fixed inset 0, warm radial background, z-index above the
// dashboard shell) so the transition from "Clara is building"
// -> briefing -> Today feels like a single cinematic sequence.
//
// Layout is a HERO + 3 STAT CARDS mix. The hero re-uses the day's
// top insight (concept.today.insights[0]) as a large serif
// headline block with source + bullets, giving the briefing a
// centrepiece story. Below it, all three of the day's insights
// render as compact "market signals" stat cards -- one big
// extracted number per card, a short descriptor, and the source.
// The signals row previews what the Today screen will look like
// once the user continues, so there's no "wait, where did that
// go?" moment on the first Today render.
//
// Trigger + gate:
//   - concept.today.hasSeenFirstBriefing === false -> briefing shows
//   - "Continue to Today" flips the flag to true, saves state,
//     routes to Today. Flag is never reset, so every subsequent
//     login for this concept skips the briefing entirely.
//
// Structure:
//   .fb-fullscreen                fixed inset 0, warm radial bg
//     .fb-inner                   centered column, max 880
//       .fb-brand                 Clara avatar + name
//       .fb-title                 "Before you start, a quick read"
//       .fb-subtitle              intro copy
//       .fb-signals               3-card grid of market signals
//         .fb-signal              value + label + source
//       .fb-hero-card             serif headline + stat + bullets
//       .fb-cta-row               Continue to Today button
//       .fb-advising-pill         "Now advising {ConceptName}"

// ---------------------------------------------
// Public entry
// ---------------------------------------------

function renderFirstBriefing(container) {
  if (!container) return;

  const concept = getActiveConcept();
  if (!concept || !concept.today || !Array.isArray(concept.today.insights)
      || concept.today.insights.length === 0) {
    // Defensive: briefing was requested but there's no insight to
    // show. Skip past the briefing so the user isn't stranded on a
    // blank screen -- the router will paint Today on the re-render.
    if (concept && concept.today) concept.today.hasSeenFirstBriefing = true;
    appState.activeView = 'today';
    if (typeof _saveState === 'function') _saveState();
    if (typeof renderApp === 'function') renderApp();
    return;
  }

  const insights = concept.today.insights.slice(0, 3);
  const hero = insights[0] || {};

  const businessName = (concept.business && concept.business.name)
    ? String(concept.business.name).trim()
    : '';
  // Advising-pill label. The concept object doesn't carry a user-
  // facing name field (only an internal `id`) so the business name
  // is what we display; the "your concept" fallback only fires for
  // legacy concepts that predate the business step.
  const conceptName = businessName || 'your concept';

  const headlineHtml = _escape(hero.headline || '');
  const statHtml     = _fbEmphasiseStat(hero.stat || '');
  const sourceHtml   = _escape(hero.source || '');
  const bulletsSafe  = Array.isArray(hero.bullets) ? hero.bullets : [];

  const bulletsLabel = businessName
    ? 'WHAT THIS MEANS FOR ' + _escape(businessName.toUpperCase())
    : 'WHAT THIS MEANS FOR YOU';

  const bulletRowsHtml = bulletsSafe.slice(0, 3).map(function (b) {
    return ''
      + '<li class="fb-bullet">'
      +   '<span class="fb-bullet-dot" aria-hidden="true"></span>'
      +   '<span class="fb-bullet-text">' + _escape(b) + '</span>'
      + '</li>';
  }).join('');

  const signalsHtml = insights.map(function (ins, idx) {
    return _fbSignalCardHtml(ins, idx);
  }).join('');

  const subtitle = businessName
    ? 'A few things moving in ' + _escape(businessName) + '\u2019s market right now. I\u2019ll refresh these every day inside Today.'
    : 'A few things moving in your market right now. I\u2019ll refresh these every day inside Today.';

  container.innerHTML = ''
    + '<div class="fb-fullscreen" id="fbFullscreen" role="dialog"'
    +      ' aria-labelledby="fbTitle" aria-modal="true">'
    +   '<div class="fb-inner">'
    +     '<div class="fb-brand" aria-label="Clara">'
    +       '<span class="fb-brand-avatar" aria-hidden="true">C</span>'
    +       '<span class="fb-brand-name">Clara</span>'
    +     '</div>'
    +     '<h1 class="fb-title" id="fbTitle">Before you start, a quick read</h1>'
    +     '<p class="fb-subtitle">' + subtitle + '</p>'
    +     '<div class="fb-signals" role="list">' + signalsHtml + '</div>'
    +     '<div class="fb-hero-card" role="article" aria-labelledby="fbHeroHeadline">'
    +       '<div class="fb-hero-kicker">CLARA FOUND THIS FOR YOU</div>'
    +       '<h2 class="fb-hero-headline" id="fbHeroHeadline">' + headlineHtml + '</h2>'
    +       '<p class="fb-hero-stat">' + statHtml + '</p>'
    +       '<div class="fb-hero-source" aria-label="Source">'
    +         '<span class="fb-hero-source-dot" aria-hidden="true"></span>'
    +         '<span class="fb-hero-source-label">' + sourceHtml + '</span>'
    +       '</div>'
    +       '<div class="fb-hero-divider" aria-hidden="true"></div>'
    +       '<div class="fb-hero-bullets-label">' + bulletsLabel + '</div>'
    +       '<ul class="fb-hero-bullets">' + bulletRowsHtml + '</ul>'
    +     '</div>'
    +     '<div class="fb-cta-row">'
    +       '<button type="button" class="fb-cta-button" id="fbStartTodayBtn">'
    +         'Continue to Today \u2192'
    +       '</button>'
    +       '<div class="fb-footnote">'
    +         'Clara updates this every day based on your market.'
    +       '</div>'
    +     '</div>'
    +     '<div class="fb-advising-pill" aria-label="Currently advising">'
    +       '<span class="fb-advising-dot" aria-hidden="true"></span>'
    +       '<span class="fb-advising-text">Now advising '
    +         '<span class="fb-advising-name">' + _escape(conceptName) + '</span>'
    +       '</span>'
    +     '</div>'
    +   '</div>'
    + '</div>';

  _fbBindEvents();
}

// ---------------------------------------------
// Signal card -- compact stat tile
// ---------------------------------------------
//
// Extracts the primary number from `insight.stat` and renders it
// as a large "hero" digit at the top of the card. The rest of the
// sentence becomes the descriptor beneath. If extraction fails
// (no number found -- shouldn't happen with our templates) we
// fall back to the full sentence so the card is never blank.
function _fbSignalCardHtml(insight, idx) {
  const ins = insight || {};
  const parts = (typeof window._insExtractStat === 'function')
    ? window._insExtractStat(ins.stat || '')
    : { value: '', label: String(ins.stat || '') };
  const value = parts.value || '';
  const label = parts.label || String(ins.stat || '');
  const source = String(ins.source || '');

  return ''
    + '<div class="fb-signal" role="listitem" data-signal-idx="' + idx + '">'
    +   (value
        ? '<div class="fb-signal-value">' + _escape(value) + '</div>'
        : '')
    +   '<div class="fb-signal-label">' + _escape(label) + '</div>'
    +   (source
        ? '<div class="fb-signal-source">'
        +   '<span class="fb-signal-source-dot" aria-hidden="true"></span>'
        +   '<span class="fb-signal-source-label">' + _escape(source) + '</span>'
        + '</div>'
        : '')
    + '</div>';
}

// ---------------------------------------------
// Event wiring
// ---------------------------------------------

function _fbBindEvents() {
  const btn = document.getElementById('fbStartTodayBtn');
  if (!btn) return;
  btn.addEventListener('click', _fbStartToday);
  // Autofocus the CTA so keyboard users can Enter-through immediately
  // without hunting for the button. Wrapped in a rAF so the focus
  // ring paints after the fade-in animation has settled -- otherwise
  // the outline flickers during the opacity transition.
  requestAnimationFrame(function () {
    try { btn.focus({ preventScroll: true }); } catch (_) { btn.focus(); }
  });
}

// "Continue to Today" handler. Flips the per-concept gate, persists,
// and routes to Today. Wrapped in a fade-out so the transition to
// the dashboard shell feels intentional rather than a hard cut.
function _fbStartToday() {
  const concept = getActiveConcept();
  if (concept && concept.today) {
    concept.today.hasSeenFirstBriefing = true;
  }
  appState.activeView = 'today';
  if (typeof _saveState === 'function') _saveState();

  const screen = document.getElementById('fbFullscreen');
  if (screen) screen.classList.add('fb-fullscreen-out');

  // 260ms matches the fade-out keyframe duration. Slightly shorter
  // than the onboarding fade so the pause between "briefing done"
  // and "Today paints" feels snappy on second glance.
  setTimeout(function () {
    if (typeof renderApp === 'function') renderApp();
  }, 260);
}

// ---------------------------------------------
// Helpers
// ---------------------------------------------

// Same stat-emphasis logic as today.js -- wraps the first quantity
// (percent range, single percent, multiplier, "N out of M", ratio)
// in an accent span so the number reads big inside the muted
// sentence. Escape runs BEFORE the wrap so user-controllable stat
// text can never inject markup.
function _fbEmphasiseStat(stat) {
  if (!stat) return '';
  const escaped = _escape(String(stat));
  const patterns = [
    /(\d+(?:[.,]\d+)?[-\u2013]\d+(?:[.,]\d+)?%\+?)/,
    /(\d+(?:[.,]\d+)?%\+?)/,
    /(\d+(?:[.,]\d+)?[-\u2013]\d+(?:[.,]\d+)?x)/,
    /(\d+(?:[.,]\d+)?x)/,
    /(\d+ out of \d+)/,
    /(\d+:\d+)/
  ];
  for (let i = 0; i < patterns.length; i++) {
    const m = escaped.match(patterns[i]);
    if (m) {
      return escaped.replace(m[1], '<span class="fb-hero-stat-num">' + m[1] + '</span>');
    }
  }
  return escaped;
}

window.renderFirstBriefing = renderFirstBriefing;
