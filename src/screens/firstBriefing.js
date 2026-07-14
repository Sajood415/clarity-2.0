// ---------------------------------------------
// Clarity 2.0 — First-time Insights Briefing
// ---------------------------------------------
//
// A full-screen "welcome to Clara" landing that runs exactly ONCE per
// concept, immediately after onboarding's building animation fades
// out. Same visual language as the onboarding overlay (fixed inset 0,
// warm radial background, z-index above the dashboard shell) so the
// transition from "Clara is building" → briefing → Today feels like
// a single cinematic sequence rather than three unrelated screens.
//
// Content is pulled from `concept.today.insights[0]` — the seeder in
// clara/insights.js runs during _obCompleteFlow, so by the time we
// render the briefing that array is guaranteed to have three
// personalised insights. We use the first one; the other two remain
// visible via the standard Daily Insight cards on Today.
//
// Trigger + gate:
//   • concept.today.hasSeenFirstBriefing === false → briefing shows
//   • "Start Today →" flips the flag to true, saves state, routes to
//     Today. Flag is never reset, so every subsequent login for this
//     concept skips the briefing entirely.
//
// Structure:
//   .fb-fullscreen                fixed inset 0, warm radial bg
//     .fb-inner                   centered column, max 720, gap 32
//       .fb-kicker                "CLARA FOUND THIS FOR YOU" (amber)
//       .fb-headline              Playfair 42/bold, centered
//       .fb-stat                  emphasized number + muted sentence
//       .fb-source                amber dot + source name
//       .fb-divider               1px muted, 60% width
//       .fb-bullets-label         "WHAT THIS MEANS FOR {NAME}"
//       .fb-bullets               3 rows, amber dot + line
//       .fb-cta-button            "Start Today →" (max 400)
//       .fb-footnote              small muted sub-copy

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
    // blank screen — the router will paint Today on the re-render.
    if (concept && concept.today) concept.today.hasSeenFirstBriefing = true;
    appState.activeView = 'today';
    if (typeof _saveState === 'function') _saveState();
    if (typeof renderApp === 'function') renderApp();
    return;
  }

  const insight = concept.today.insights[0] || {};
  const businessName = (concept.business && concept.business.name)
    ? String(concept.business.name).trim()
    : '';

  const headlineHtml   = _escape(insight.headline || '');
  const statHtml       = _fbEmphasiseStat(insight.stat || '');
  const sourceHtml     = _escape(insight.source || '');
  const bulletsSafe    = Array.isArray(insight.bullets) ? insight.bullets : [];

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

  container.innerHTML = ''
    + '<div class="fb-fullscreen" id="fbFullscreen" role="dialog"'
    +      ' aria-labelledby="fbHeadline" aria-modal="true">'
    +   '<div class="fb-inner">'
    +     '<div class="fb-kicker">CLARA FOUND THIS FOR YOU</div>'
    +     '<h1 class="fb-headline" id="fbHeadline">' + headlineHtml + '</h1>'
    +     '<p class="fb-stat">' + statHtml + '</p>'
    +     '<div class="fb-source" aria-label="Source">'
    +       '<span class="fb-source-dot" aria-hidden="true"></span>'
    +       '<span class="fb-source-label">' + sourceHtml + '</span>'
    +     '</div>'
    +     '<div class="fb-divider" aria-hidden="true"></div>'
    +     '<div class="fb-bullets-label">' + bulletsLabel + '</div>'
    +     '<ul class="fb-bullets">' + bulletRowsHtml + '</ul>'
    +     '<button type="button" class="fb-cta-button" id="fbStartTodayBtn">'
    +       'Start Today \u2192'
    +     '</button>'
    +     '<div class="fb-footnote">'
    +       'Clara updates this every day based on your market.'
    +     '</div>'
    +   '</div>'
    + '</div>';

  _fbBindEvents();
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
  // ring paints after the fade-in animation has settled — otherwise
  // the outline flickers during the opacity transition.
  requestAnimationFrame(function () {
    try { btn.focus({ preventScroll: true }); } catch (_) { btn.focus(); }
  });
}

// "Start Today →" handler. Flips the per-concept gate, persists, and
// routes to Today. Wrapped in a fade-out so the transition to the
// dashboard shell feels intentional rather than a hard cut.
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

// Same stat-emphasis logic as today.js — wraps the first quantity
// (percent range, single percent, multiplier, "N out of M", ratio)
// in an accent span so the number reads at 24px inside the 18px
// muted sentence. Escape runs BEFORE the wrap so user-controllable
// stat text can never inject markup.
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
      return escaped.replace(m[1], '<span class="fb-stat-num">' + m[1] + '</span>');
    }
  }
  return escaped;
}

window.renderFirstBriefing = renderFirstBriefing;
