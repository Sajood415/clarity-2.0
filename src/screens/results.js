// ---------------------------------------------
// Clarity 2.0 — Results View
// ---------------------------------------------
//
// Two screens live in this file, both rendered inside the dashboard
// content area:
//
//   1. renderInsights(container)        — list view (header + summary
//                                          bar + feed of content cards)
//                                          for the "Results" sidebar
//                                          tab. Legacy function name.
//   2. renderInsightsDetail(container)  — sub-page for a single item
//                                          with the full analytics
//                                          breakdown. Reached by
//                                          clicking a card; leaves via
//                                          the top-bar breadcrumb or
//                                          the in-page back link.
//
// NAMING: The sidebar tab and page title read "Results" now (previously
// "Insights"). The exported function names are still `renderInsights`
// and `renderInsightsDetail` for git-blame continuity and to avoid a
// wide rename \u2014 the router aliases both 'results' and 'insights' view
// keys to the same function, so callers can use either.
//
// State contract:
//   - The list reads `concept.results.items`. Each item has shape
//     { id, type, platform, angle, variation, timestamp, reach, status }.
//   - Card click sets `appState.insightsDetailId = item.id` and
//     `appState.activeView = 'insights-detail'`, then calls
//     `renderApp()`. The router dispatches to `renderInsightsDetail`.
//
// Everything the create flow doesn't track — reach, impressions,
// engagement, saves, follows, per-day timeline, audience mix, persona
// fit — is deterministically seeded from the item id via Math.sin so
// the same item always renders the same numbers. `_insdRand(id, offset)`
// is the primitive; higher-level helpers below layer on it.

const INS_PLATFORM_LABELS = {
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  facebook:  'Facebook',
  tiktok:    'TikTok',
  youtube:   'YouTube',
  x:         'X',
  email:     'Email',
  podcast:   'Podcast'
};

// External-link URL per platform for the detail-page "View on \u2026"
// button. Email and podcast are placeholders \u2014 there's no
// canonical destination to link to (mailto: opens a blank composer;
// Apple Podcasts is only one of many possible hosts), so both use
// '#' and the detail renderer switches the anchor to a disabled
// span when it sees a placeholder URL.
const INS_PLATFORM_URLS = {
  instagram: 'https://www.instagram.com/',
  linkedin:  'https://www.linkedin.com/',
  facebook:  'https://www.facebook.com/',
  tiktok:    'https://www.tiktok.com/',
  youtube:   'https://www.youtube.com/',
  x:         'https://x.com/',
  email:     '#',
  podcast:   '#'
};

// Business-type -> media-preview gradient. Warm amber/coral for food,
// cool blue/teal for tech, purple/indigo for creators, etc. Fallback
// is a neutral warm gradient.
const INS_MEDIA_GRADIENTS = {
  food:      'linear-gradient(135deg, #F5A623 0%, #E8523C 100%)',
  small:     'linear-gradient(135deg, #F5A623 0%, #D4860A 100%)',
  ecommerce: 'linear-gradient(135deg, #E8853C 0%, #C24A2E 100%)',
  service:   'linear-gradient(135deg, #5AAAB0 0%, #34677A 100%)',
  agency:    'linear-gradient(135deg, #5AAAB0 0%, #34677A 100%)',
  tech:      'linear-gradient(135deg, #4A9EE0 0%, #2E5FB0 100%)',
  saas:      'linear-gradient(135deg, #4A9EE0 0%, #2E5FB0 100%)',
  creator:   'linear-gradient(135deg, #A876E8 0%, #5C4CB8 100%)',
  nonprofit: 'linear-gradient(135deg, #C8A96E 0%, #7A5A34 100%)'
};
const INS_MEDIA_GRADIENT_DEFAULT = 'linear-gradient(135deg, #C8A96E 0%, #7A5A34 100%)';

const INS_TYPE_ICONS = {
  image:
    '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<rect x="3" y="3" width="18" height="18" rx="2.5"/>'
    + '<circle cx="8.5" cy="9" r="1.6"/>'
    + '<path d="M3 17l5-5 4 4 3-3 6 6"/>'
    + '</svg>',
  video:
    '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<rect x="3" y="5" width="18" height="14" rx="2.5"/>'
    + '<path d="M10 9v6l5-3-5-3z" fill="currentColor" stroke="none"/>'
    + '</svg>',
  audio:
    '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<rect x="9" y="3" width="6" height="12" rx="3"/>'
    + '<path d="M5 11a7 7 0 0 0 14 0"/>'
    + '<line x1="12" y1="18" x2="12" y2="22"/>'
    + '</svg>',
  post:
    '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<line x1="5" y1="7"  x2="19" y2="7"/>'
    + '<line x1="5" y1="12" x2="19" y2="12"/>'
    + '<line x1="5" y1="17" x2="13" y2="17"/>'
    + '</svg>'
};

const INS_PLAY_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">'
  + '<path d="M8 5v14l11-7z"/>'
  + '</svg>';

const INS_EMPTY_ICON =
  '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<line x1="6"  y1="20" x2="6"  y2="12"/>'
  + '<line x1="12" y1="20" x2="12" y2="6"/>'
  + '<line x1="18" y1="20" x2="18" y2="15"/>'
  + '</svg>';

const INS_BACK_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<polyline points="15 6 9 12 15 18"/>'
  + '</svg>';

const INS_FORMAT_LABELS = {
  post:  'Written Post',
  image: 'Image Post',
  video: 'Video',
  audio: 'Audio'
};

// Small monochrome icons for the metric grid on the detail page.
// Stroked in the accent color so they read as a family and echo the
// warm sidebar treatment.
const INS_METRIC_ICONS = {
  // Original 9 icons \u2014 kept intact so any legacy call site keeps
  // resolving. New platform-specific keys are appended below.
  reach:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  impressions:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3"/></svg>',
  engagement:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/></svg>',
  likes:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  comments:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  shares:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>',
  saves:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  ctr:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3-8L15 11l8 1-6 6 2 8-7-4-7 4 2-8-6-6 8-1z"/></svg>',
  followers:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',

  // Platform-specific additions. Each one visually distinct from the
  // original 9 so a mixed grid reads as a legible metric family.
  // Kept at the same 16x16 stroke=1.8 currentColor convention.
  views:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>',
  watchTime:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  completionRate:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  avgDuration:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12M6 22h12"/><path d="M8 2v4a4 4 0 0 0 8 0V2"/><path d="M8 22v-4a4 4 0 0 1 8 0v4"/></svg>',
  retweets:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  reactions:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5A5.5 5.5 0 0 1 7.5 3c1.74 0 3.41.81 4.5 2.09A5.99 5.99 0 0 1 16.5 3 5.5 5.5 0 0 1 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></svg>',
  clicks:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3l4.5 12 2-5.5L21 7.5z"/><path d="M15 15l6 6"/></svg>',
  replies:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  subscribers:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
  delivered:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
  openRate:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10.5V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8.5"/><path d="M2 10.5L12 4l10 6.5"/><path d="M2 10.5l10 5 10-5"/></svg>',
  clickRate:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3l4.5 12 2-5.5L21 7.5z"/><path d="M15 15l6 6"/></svg>',
  unsubscribes:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="8"/></svg>',
  bounces:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  plays:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
  listeners:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
  downloads:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',

  // ---- Icon aliases for the platform-specific metric additions.
  // Each new key gets its own SVG so a mixed grid still reads as a
  // consistent icon family; where a new metric is conceptually
  // adjacent to an existing one (bookmarks \u2248 saves, follows \u2248
  // subscribers) we reuse the existing glyph rather than invent a
  // near-duplicate that would only confuse the eye.
  profileVisits:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  follows:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
  followersGained:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
  bookmarks:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  thumbnailCTR:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><polygon points="10 9 15 12 10 15 10 9" fill="currentColor" stroke="none"/><path d="M17 20l3 2-1-4"/></svg>',
  dwellTime:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  totalOpens:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 6l-10 7L2 6"/><path d="M2 6h20v12H2z"/></svg>',
  totalClicks:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3l4.5 12 2-5.5L21 7.5z"/><path d="M15 15l6 6"/></svg>'
};

// ---------------------------------------------
// Seeded number helpers
// ---------------------------------------------

function _insSeedNum(idStr) {
  const digits = String(idStr).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

// Deterministic 0..1 for a given id + offset. Same input -> same
// output, forever, so we can layer this everywhere without state.
function _insdRand(idStr, offset) {
  const n = _insSeedNum(idStr);
  return (Math.sin(n + offset) + 1) / 2;
}

function _insSeededReach(idStr) {
  const raw = _insdRand(idStr, 0) * 2800 + 300;
  return Math.max(120, Math.round(raw / 10) * 10);
}

function _insSeededEngagement(idStr) {
  const raw = _insdRand(idStr, 1) * 4.7 + 1.8;
  const clamped = Math.max(1.8, Math.min(6.5, raw));
  return Math.round(clamped * 10) / 10;
}

function _insSeededPersonaFit(idStr) {
  const raw = _insdRand(idStr, 2) * 34 + 62;
  return Math.max(62, Math.min(96, Math.round(raw)));
}

function _insFormatReach(n) {
  if (n >= 1000) {
    const k = n / 1000;
    const rounded = k >= 10 ? Math.round(k).toString() : k.toFixed(1);
    return rounded.replace(/\.0$/, '') + 'K';
  }
  return String(n);
}

// Compact int with locale-style thousands separators (12,340).
function _insFormatInt(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function _insPlatformLabel(key) {
  return INS_PLATFORM_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '\u2014');
}

function _insBestFormat(items) {
  const counts = {};
  items.forEach(function (it) {
    const t = it && it.type ? it.type : null;
    if (!t) return;
    counts[t] = (counts[t] || 0) + 1;
  });
  let top = null;
  let max = 0;
  Object.keys(counts).forEach(function (k) {
    if (counts[k] > max) { max = counts[k]; top = k; }
  });
  if (!top) return '\u2014';
  return INS_FORMAT_LABELS[top] || (top.charAt(0).toUpperCase() + top.slice(1));
}

function _insMediaBackground(businessType) {
  const key = String(businessType || '').toLowerCase();
  return INS_MEDIA_GRADIENTS[key] || INS_MEDIA_GRADIENT_DEFAULT;
}

// ---------------------------------------------
// Platform-specific metric builders
// ---------------------------------------------
//
// Each returns an array of { key, label, num, rawNum, sub } entries.
// `key` doubles as the icon lookup into INS_METRIC_ICONS and as the
// selector into INS_PLATFORM_TOP_THREE. `rawNum` is the numeric
// value used for aggregate sums (summary bar totals); `num` is the
// pre-formatted display string used in the metric card.
//
// Deterministic seeding via _insdRand(id, offset) so the same item
// always renders the same numbers. Offset ranges reserved per
// platform to keep independence:
//   60-69  instagram      70-79  tiktok
//   80-89  youtube        90-99  facebook
//   100-109 linkedin      110-119 x
//   120-129 email         130-139 podcast
//   140+   shared 7-day / audience / etc.
//
// Realistic ranges per the product spec:
//   TikTok views: 500-50000     Instagram reach: 200-5000
//   YouTube views: 100-10000    Email open rate: 18-45%, click 2-12%
//   Podcast plays: 50-2000
//   Engagement rates per platform:
//     TikTok 4-18%, Instagram 1-6%, Facebook 0.5-2%,
//     LinkedIn 2-6%, X 1-4%.

// Format an amount of MINUTES as "Nm" or "1h 12m" for readability.
function _insFormatMinutes(mins) {
  const total = Math.max(0, Math.round(mins));
  if (total < 60) return total + 'm';
  const h = Math.floor(total / 60);
  const m = total - h * 60;
  return m > 0 ? (h + 'h ' + m + 'm') : (h + 'h');
}

// Format seconds as MM:SS. Used for "Avg View Duration" on YouTube.
function _insFormatMMSS(secs) {
  const total = Math.max(0, Math.round(secs));
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return m + ':' + String(s).padStart(2, '0');
}

function _insdInstagramMetrics(id) {
  const reach = Math.round(200 + _insdRand(id, 60) * 4800);              // 200-5000
  const impressions = Math.round(reach * (1.15 + _insdRand(id, 61) * 0.45));
  const engagementPct = Math.round((1 + _insdRand(id, 62) * 5) * 10) / 10;  // 1.0-6.0%
  const totalActions = reach * (engagementPct / 100);
  const likes    = Math.max(1, Math.round(totalActions * (0.55 + _insdRand(id, 63) * 0.15)));
  const comments = Math.max(0, Math.round(totalActions * (0.04 + _insdRand(id, 64) * 0.06)));
  const shares   = Math.max(0, Math.round(totalActions * (0.06 + _insdRand(id, 65) * 0.08)));
  const saves    = Math.max(0, Math.round(totalActions * (0.08 + _insdRand(id, 66) * 0.10)));
  // Two IG-native discovery signals: how many people tapped the
  // handle after seeing the piece, and how many actually followed
  // as a result. Offsets 67-68 stay inside the reserved 60-69 range.
  const profileVisits = Math.max(20, Math.round(20 + _insdRand(id, 67) * 380));  // 20-400
  const follows       = Math.max(1,  Math.round(1  + _insdRand(id, 68) * 29));   // 1-30
  return [
    { key: 'reach',         label: 'Reach',            num: _insFormatInt(reach),                     rawNum: reach,          sub: 'Unique accounts' },
    { key: 'impressions',   label: 'Impressions',      num: _insFormatInt(impressions),               rawNum: impressions,    sub: 'Times shown' },
    { key: 'likes',         label: 'Likes',            num: _insFormatInt(likes),                     rawNum: likes,          sub: 'Heart taps' },
    { key: 'comments',      label: 'Comments',         num: _insFormatInt(comments),                  rawNum: comments,       sub: 'Direct replies' },
    { key: 'shares',        label: 'Shares',           num: _insFormatInt(shares),                    rawNum: shares,         sub: 'Sent to others' },
    { key: 'saves',         label: 'Saves',            num: _insFormatInt(saves),                     rawNum: saves,          sub: 'Kept for later' },
    { key: 'profileVisits', label: 'Profile Visits',   num: _insFormatInt(profileVisits),             rawNum: profileVisits,  sub: 'Tapped your handle' },
    { key: 'follows',       label: 'Follows From Post',num: '+' + _insFormatInt(follows),             rawNum: follows,        sub: 'Net new followers' },
    { key: 'engagement',    label: 'Engagement Rate',  num: engagementPct.toFixed(1) + '%',           rawNum: engagementPct,  sub: 'Of reach' }
  ];
}

function _insdTiktokMetrics(id) {
  const views = Math.round(500 + _insdRand(id, 70) * 49500);              // 500-50000
  const engagementPct = Math.round((4 + _insdRand(id, 71) * 14) * 10) / 10;  // 4.0-18.0%
  const totalActions = views * (engagementPct / 100);
  const likes    = Math.max(1, Math.round(totalActions * (0.65 + _insdRand(id, 72) * 0.15)));
  const comments = Math.max(0, Math.round(totalActions * (0.04 + _insdRand(id, 73) * 0.05)));
  const shares   = Math.max(0, Math.round(totalActions * (0.15 + _insdRand(id, 74) * 0.10)));
  const saves    = Math.max(0, Math.round(totalActions * (0.05 + _insdRand(id, 75) * 0.06)));
  const avgSecPerView = 8 + _insdRand(id, 76) * 15;                       // 8-23s
  const watchMinutes = Math.round((views * avgSecPerView) / 60);
  const completion = Math.round(35 + _insdRand(id, 77) * 40);             // 35-75%
  // Profile-side discovery signals for TikTok. Ranges intentionally
  // dwarf the IG equivalents \u2014 a viral TT clip can send 10x the
  // profile taps of a big IG post. Offsets 78-79 close out the
  // reserved 70-79 range.
  const profileVisits = Math.max(100, Math.round(100 + _insdRand(id, 78) * 1900));  // 100-2000
  const follows       = Math.max(5,   Math.round(5   + _insdRand(id, 79) * 195));   // 5-200
  return [
    { key: 'views',          label: 'Views',            num: _insFormatInt(views),                  rawNum: views,          sub: 'Total plays' },
    { key: 'likes',          label: 'Likes',            num: _insFormatInt(likes),                  rawNum: likes,          sub: 'Heart taps' },
    { key: 'comments',       label: 'Comments',         num: _insFormatInt(comments),               rawNum: comments,       sub: 'Direct replies' },
    { key: 'shares',         label: 'Shares',           num: _insFormatInt(shares),                 rawNum: shares,         sub: 'Sent to others' },
    { key: 'saves',          label: 'Saves',            num: _insFormatInt(saves),                  rawNum: saves,          sub: 'Kept for later' },
    { key: 'watchTime',      label: 'Watch Time',       num: _insFormatMinutes(watchMinutes),       rawNum: watchMinutes,   sub: 'Total minutes' },
    { key: 'completionRate', label: 'Completion Rate',  num: completion + '%',                      rawNum: completion,     sub: 'Watched fully' },
    { key: 'profileVisits',  label: 'Profile Visits',   num: _insFormatInt(profileVisits),          rawNum: profileVisits,  sub: 'Tapped your handle' },
    { key: 'follows',        label: 'Follows From Video',num: '+' + _insFormatInt(follows),         rawNum: follows,        sub: 'Net new followers' },
    { key: 'engagement',     label: 'Engagement Rate',  num: engagementPct.toFixed(1) + '%',        rawNum: engagementPct,  sub: 'Of views' }
  ];
}

function _insdYoutubeMetrics(id) {
  const views = Math.round(100 + _insdRand(id, 80) * 9900);               // 100-10000
  const avgSec = Math.round(60 + _insdRand(id, 81) * 240);                // 1-5 min per view
  const watchMinutes = Math.round((views * avgSec) / 60);
  const likes    = Math.max(1, Math.round(views * (0.03 + _insdRand(id, 82) * 0.06)));
  const comments = Math.max(0, Math.round(views * (0.005 + _insdRand(id, 83) * 0.015)));
  const shares   = Math.max(0, Math.round(views * (0.01 + _insdRand(id, 84) * 0.02)));
  const subs     = Math.max(0, Math.round(views * (0.008 + _insdRand(id, 85) * 0.015)));
  // Three YouTube-native signals the previous bundle missed. Impressions
  // are the discovery denominator behind Thumbnail CTR (YouTube's #1
  // creator metric), and Completion Rate rounds out the retention
  // story that Watch Time + Avg View Duration only partially tell.
  // Impressions run 3-8x views (typical algorithm surfacing rate),
  // clamped to 500-80000 per spec. Offsets 86-88 close the 80-89 range.
  const impRaw     = Math.round(views * (3 + _insdRand(id, 86) * 5));
  const impressions = Math.max(500, Math.min(80000, impRaw));
  const thumbCTR   = Math.round((3 + _insdRand(id, 87) * 9) * 10) / 10;  // 3.0-12.0%
  const completion = Math.round(30 + _insdRand(id, 88) * 35);            // 30-65%
  return [
    { key: 'views',          label: 'Views',              num: _insFormatInt(views),               rawNum: views,          sub: 'Total plays' },
    { key: 'impressions',    label: 'Impressions',        num: _insFormatInt(impressions),         rawNum: impressions,    sub: 'Times shown in feed' },
    { key: 'watchTime',      label: 'Watch Time',         num: _insFormatMinutes(watchMinutes),    rawNum: watchMinutes,   sub: 'Total minutes' },
    { key: 'avgDuration',    label: 'Avg View Duration',  num: _insFormatMMSS(avgSec),             rawNum: avgSec,         sub: 'Per view' },
    { key: 'completionRate', label: 'Completion Rate',    num: completion + '%',                   rawNum: completion,     sub: 'Watched fully' },
    { key: 'thumbnailCTR',   label: 'Thumbnail CTR',      num: thumbCTR.toFixed(1) + '%',          rawNum: thumbCTR,       sub: 'Click-through' },
    { key: 'likes',          label: 'Likes',              num: _insFormatInt(likes),               rawNum: likes,          sub: 'Thumb ups' },
    { key: 'comments',       label: 'Comments',           num: _insFormatInt(comments),            rawNum: comments,       sub: 'Direct replies' },
    { key: 'shares',         label: 'Shares',             num: _insFormatInt(shares),              rawNum: shares,         sub: 'Sent to others' },
    { key: 'subscribers',    label: 'Subscribers Gained', num: '+' + _insFormatInt(subs),          rawNum: subs,           sub: 'From this piece' }
  ];
}

function _insdFacebookMetrics(id) {
  const reach = Math.round(300 + _insdRand(id, 90) * 5700);               // 300-6000
  const impressions = Math.round(reach * (1.10 + _insdRand(id, 91) * 0.5));
  const engagementPct = Math.round((0.5 + _insdRand(id, 92) * 1.5) * 10) / 10;  // 0.5-2.0%
  const totalActions = reach * (engagementPct / 100);
  const reactions = Math.max(1, Math.round(totalActions * (0.70 + _insdRand(id, 93) * 0.15)));
  const comments  = Math.max(0, Math.round(totalActions * (0.08 + _insdRand(id, 94) * 0.08)));
  const shares    = Math.max(0, Math.round(totalActions * (0.05 + _insdRand(id, 95) * 0.08)));
  const clicks    = Math.max(0, Math.round(reach * (0.008 + _insdRand(id, 96) * 0.02)));
  // Fixed 60/20/20 split for the reaction-type breakdown surfaced in
  // the sub-caption. Real FB tracks six reaction types \u2014 collapsing
  // to Like / Love / Other keeps the string legible in the small
  // caption slot while still conveying the shape of the response.
  // Any Math.round rounding drift lands in the 'Other' bucket so the
  // three sub-values always sum to `reactions`.
  const fbLikeShare  = Math.max(1, Math.round(reactions * 0.60));
  const fbLoveShare  = Math.max(1, Math.round(reactions * 0.20));
  const fbOtherShare = Math.max(0, reactions - fbLikeShare - fbLoveShare);
  const fbReactionSub = '\uD83D\uDC4D ' + _insFormatInt(fbLikeShare)
    + ' \u00B7 \u2764\uFE0F ' + _insFormatInt(fbLoveShare)
    + ' \u00B7 \uD83D\uDE2E ' + _insFormatInt(fbOtherShare);
  // Saves as a % of reach (2-5%) \u2014 lower rate than IG because FB
  // save behaviour is rarer even for high-performing posts. Offset
  // 97 fits in the reserved 90-99 range.
  const saves = Math.max(0, Math.round(reach * (0.02 + _insdRand(id, 97) * 0.03)));
  return [
    { key: 'reach',       label: 'Reach',           num: _insFormatInt(reach),                     rawNum: reach,          sub: 'Unique accounts' },
    { key: 'impressions', label: 'Impressions',     num: _insFormatInt(impressions),               rawNum: impressions,    sub: 'Times shown' },
    { key: 'reactions',   label: 'Reactions',       num: _insFormatInt(reactions),                 rawNum: reactions,      sub: fbReactionSub },
    { key: 'comments',    label: 'Comments',        num: _insFormatInt(comments),                  rawNum: comments,       sub: 'Direct replies' },
    { key: 'shares',      label: 'Shares',          num: _insFormatInt(shares),                    rawNum: shares,         sub: 'Sent to others' },
    { key: 'saves',       label: 'Saves',           num: _insFormatInt(saves),                     rawNum: saves,          sub: 'Kept for later' },
    { key: 'clicks',      label: 'Clicks',          num: _insFormatInt(clicks),                    rawNum: clicks,         sub: 'Link taps' },
    { key: 'engagement',  label: 'Engagement Rate', num: engagementPct.toFixed(1) + '%',           rawNum: engagementPct,  sub: 'Of reach' }
  ];
}

function _insdLinkedinMetrics(id) {
  const impressions = Math.round(400 + _insdRand(id, 100) * 3600);        // 400-4000
  const engagementPct = Math.round((2 + _insdRand(id, 101) * 4) * 10) / 10;   // 2.0-6.0%
  const clicks = Math.max(0, Math.round(impressions * (0.02 + _insdRand(id, 102) * 0.04)));
  const totalActions = impressions * (engagementPct / 100);
  const reactions = Math.max(1, Math.round(totalActions * (0.60 + _insdRand(id, 103) * 0.20)));
  const comments  = Math.max(0, Math.round(totalActions * (0.04 + _insdRand(id, 104) * 0.06)));
  const shares    = Math.max(0, Math.round(totalActions * (0.04 + _insdRand(id, 105) * 0.06)));
  // CTR removed \u2014 it duplicated the Engagement Rate story on a
  // shared denominator (impressions). Two LI-native replacements
  // fill the slot: Dwell Time (LinkedIn surfaces this prominently as
  // its retention signal) and Follows Gained. Offset 106 is now free
  // and re-used for dwellSecs; 107 is new. Offsets stay inside the
  // reserved 100-109 range.
  const dwellSecs = Math.round(15 + _insdRand(id, 106) * 75);            // 15-90s
  const follows   = Math.max(1, Math.round(1 + _insdRand(id, 107) * 24));  // 1-25
  return [
    { key: 'impressions', label: 'Impressions',     num: _insFormatInt(impressions),               rawNum: impressions,    sub: 'Times shown' },
    { key: 'clicks',      label: 'Clicks',          num: _insFormatInt(clicks),                    rawNum: clicks,         sub: 'Link taps' },
    { key: 'reactions',   label: 'Reactions',       num: _insFormatInt(reactions),                 rawNum: reactions,      sub: 'All reactions' },
    { key: 'comments',    label: 'Comments',        num: _insFormatInt(comments),                  rawNum: comments,       sub: 'Direct replies' },
    { key: 'shares',      label: 'Shares',          num: _insFormatInt(shares),                    rawNum: shares,         sub: 'Reposts' },
    { key: 'dwellTime',   label: 'Dwell Time',      num: dwellSecs + 's avg',                      rawNum: dwellSecs,      sub: 'Per impression' },
    { key: 'follows',     label: 'Follows Gained',  num: '+' + _insFormatInt(follows),             rawNum: follows,        sub: 'Net new followers' },
    { key: 'engagement',  label: 'Engagement Rate', num: engagementPct.toFixed(1) + '%',           rawNum: engagementPct,  sub: 'Of impressions' }
  ];
}

function _insdXMetrics(id) {
  const impressions = Math.round(300 + _insdRand(id, 110) * 4700);        // 300-5000
  const engagementPct = Math.round((1 + _insdRand(id, 111) * 3) * 10) / 10;   // 1.0-4.0%
  const likes      = Math.max(1, Math.round(impressions * (0.008 + _insdRand(id, 112) * 0.03)));
  const retweets   = Math.max(0, Math.round(impressions * (0.002 + _insdRand(id, 113) * 0.006)));
  const replies    = Math.max(0, Math.round(impressions * (0.001 + _insdRand(id, 114) * 0.005)));
  const linkClicks = Math.max(0, Math.round(impressions * (0.005 + _insdRand(id, 115) * 0.02)));
  // X-native "keeper" and profile-side discovery signals. Bookmarks
  // scale off likes (empirically 30-60% of like volume for high-save
  // posts) and Profile Visits use a flat 50-800 range. Offsets 116-117
  // stay within the reserved 110-119 range.
  const bookmarks     = Math.max(0,  Math.round(likes * (0.3 + _insdRand(id, 116) * 0.3)));  // 0.3-0.6x likes
  const profileVisits = Math.max(50, Math.round(50 + _insdRand(id, 117) * 750));             // 50-800
  return [
    { key: 'impressions',   label: 'Impressions',     num: _insFormatInt(impressions),               rawNum: impressions,    sub: 'Times shown' },
    { key: 'likes',         label: 'Likes',           num: _insFormatInt(likes),                     rawNum: likes,          sub: 'Heart taps' },
    { key: 'retweets',      label: 'Retweets',        num: _insFormatInt(retweets),                  rawNum: retweets,       sub: 'Republished' },
    { key: 'replies',       label: 'Replies',         num: _insFormatInt(replies),                   rawNum: replies,        sub: 'Direct replies' },
    { key: 'bookmarks',     label: 'Bookmarks',       num: _insFormatInt(bookmarks),                 rawNum: bookmarks,      sub: 'Kept for later' },
    { key: 'clicks',        label: 'Link Clicks',     num: _insFormatInt(linkClicks),                rawNum: linkClicks,     sub: 'Outbound taps' },
    { key: 'profileVisits', label: 'Profile Visits',  num: _insFormatInt(profileVisits),             rawNum: profileVisits,  sub: 'Tapped your handle' },
    { key: 'engagement',    label: 'Engagement Rate', num: engagementPct.toFixed(1) + '%',           rawNum: engagementPct,  sub: 'Of impressions' }
  ];
}

function _insdEmailMetrics(id) {
  const delivered   = Math.round(100 + _insdRand(id, 120) * 900);         // 100-1000
  const openPct     = Math.round((18 + _insdRand(id, 121) * 27) * 10) / 10;  // 18-45%
  const clickPct    = Math.round((2 + _insdRand(id, 122) * 10) * 10) / 10;   // 2-12%
  const unsubscribes = Math.max(0, Math.round(delivered * (0.001 + _insdRand(id, 123) * 0.005)));
  const bounces      = Math.max(0, Math.round(delivered * (0.005 + _insdRand(id, 124) * 0.02)));
  // Absolute counts derived from the rates + delivered volume. Users
  // scanning the card grid can read the story two ways: "45% opened"
  // (Open Rate) and "339 opens" (Total Opens) \u2014 the second one
  // is what almost every campaign postmortem actually cares about.
  const totalOpens  = Math.max(0, Math.round(delivered * (openPct  / 100)));
  const totalClicks = Math.max(0, Math.round(delivered * (clickPct / 100)));
  return [
    { key: 'delivered',    label: 'Delivered',    num: _insFormatInt(delivered),                    rawNum: delivered,      sub: 'Inboxes reached' },
    { key: 'openRate',     label: 'Open Rate',    num: openPct.toFixed(1) + '%',                    rawNum: openPct,        sub: 'Of delivered' },
    { key: 'totalOpens',   label: 'Total Opens',  num: _insFormatInt(totalOpens),                   rawNum: totalOpens,     sub: 'Absolute count' },
    { key: 'clickRate',    label: 'Click Rate',   num: clickPct.toFixed(1) + '%',                   rawNum: clickPct,       sub: 'Of delivered' },
    { key: 'totalClicks',  label: 'Total Clicks', num: _insFormatInt(totalClicks),                  rawNum: totalClicks,    sub: 'Absolute count' },
    { key: 'unsubscribes', label: 'Unsubscribes', num: _insFormatInt(unsubscribes),                 rawNum: unsubscribes,   sub: 'Opt-outs' },
    { key: 'bounces',      label: 'Bounces',      num: _insFormatInt(bounces),                      rawNum: bounces,        sub: 'Undelivered' }
  ];
}

function _insdPodcastMetrics(id) {
  const plays        = Math.round(50 + _insdRand(id, 130) * 1950);        // 50-2000
  const listeners    = Math.max(1, Math.round(plays * (0.60 + _insdRand(id, 131) * 0.30)));  // 60-90%
  const avgListenMin = Math.round(4 + _insdRand(id, 132) * 26);           // 4-30 min
  const completion   = Math.round(40 + _insdRand(id, 133) * 45);          // 40-85%
  const downloads    = Math.max(0, Math.round(plays * (0.30 + _insdRand(id, 134) * 0.40)));  // 30-70%
  // Podcast follower/subscriber gains for the episode. Range mirrors
  // the IG "follows from post" band but shifted higher since podcast
  // discovery generally converts a lower share of listeners into
  // subscribers than social does. Offset 135 sits in the 130-139 range.
  const followersGained = Math.max(2, Math.round(2 + _insdRand(id, 135) * 38));  // 2-40
  // Top-app hint surfaced as the Plays sub-caption. Uses offset 136
  // (still inside the reserved podcast range) as a deterministic
  // 50/50 coin flip between the two dominant apps \u2014 same id
  // renders the same app forever.
  const app = _insdRand(id, 136) < 0.5 ? 'Spotify' : 'Apple Podcasts';
  return [
    { key: 'plays',            label: 'Plays',               num: _insFormatInt(plays),               rawNum: plays,           sub: 'Top app: ' + app },
    { key: 'listeners',        label: 'Listeners',           num: _insFormatInt(listeners),           rawNum: listeners,       sub: 'Unique people' },
    { key: 'avgDuration',      label: 'Avg Listen Duration', num: _insFormatMinutes(avgListenMin),    rawNum: avgListenMin,    sub: 'Per listener' },
    { key: 'completionRate',   label: 'Completion Rate',     num: completion + '%',                   rawNum: completion,      sub: 'Finished fully' },
    { key: 'downloads',        label: 'Downloads',           num: _insFormatInt(downloads),           rawNum: downloads,       sub: 'Offline saves' },
    { key: 'followersGained',  label: 'Followers Gained',    num: '+' + _insFormatInt(followersGained), rawNum: followersGained, sub: 'Net new subscribers' }
  ];
}

// Dispatcher. Falls back to the Instagram profile for any unknown
// platform so downstream code always gets a legible metric bundle
// (a legacy item saved before this feature landed will still render).
function _insdMetricsForPlatform(item) {
  const platform = String(item && item.platform || '').toLowerCase();
  if (platform === 'instagram') return _insdInstagramMetrics(item.id);
  if (platform === 'tiktok')    return _insdTiktokMetrics(item.id);
  if (platform === 'youtube')   return _insdYoutubeMetrics(item.id);
  if (platform === 'facebook')  return _insdFacebookMetrics(item.id);
  if (platform === 'linkedin')  return _insdLinkedinMetrics(item.id);
  if (platform === 'x')         return _insdXMetrics(item.id);
  if (platform === 'email')     return _insdEmailMetrics(item.id);
  if (platform === 'podcast')   return _insdPodcastMetrics(item.id);
  return _insdInstagramMetrics(item.id);
}

// The metric that best summarises "how many people saw this on this
// platform" \u2014 drives the summary bar's second tile and the 7-day
// chart. Also drives the summary tile label ("Total Reach" vs
// "Total Views" etc.).
const INS_PLATFORM_VOLUME = {
  instagram: { key: 'reach',       word: 'Reach',       chart: 'Reach' },
  tiktok:    { key: 'views',       word: 'Views',       chart: 'Views' },
  youtube:   { key: 'views',       word: 'Views',       chart: 'Views' },
  facebook:  { key: 'reach',       word: 'Reach',       chart: 'Reach' },
  linkedin:  { key: 'impressions', word: 'Impressions', chart: 'Impressions' },
  x:         { key: 'impressions', word: 'Impressions', chart: 'Impressions' },
  // Chart label now matches the underlying series ('delivered'). It
  // previously read 'Opens' while the bars summed to delivered \u2014
  // the section header and metric grid disagreed, so users saw
  // numbers that didn't reconcile with the Open Rate card above.
  email:     { key: 'delivered',   word: 'Delivered',   chart: 'Delivered' },
  podcast:   { key: 'plays',       word: 'Plays',       chart: 'Plays' }
};

function _insdVolumeForItem(item) {
  const platform = String(item && item.platform || '').toLowerCase();
  const spec = INS_PLATFORM_VOLUME[platform] || INS_PLATFORM_VOLUME.instagram;
  const entries = _insdMetricsForPlatform(item);
  const found = entries.find(function (e) { return e.key === spec.key; });
  return {
    key:   spec.key,
    word:  spec.word,     // summary-bar tile label
    chart: spec.chart,    // 7-day chart section label
    value: found ? found.rawNum : 0
  };
}

// Item-level engagement rate. Every platform's entries include an
// `engagement` field (rate as %); we resolve it once per item so the
// summary bar and list cards can pull from a single source of truth.
function _insdEngagementForItem(item) {
  const entries = _insdMetricsForPlatform(item);
  const found = entries.find(function (e) { return e.key === 'engagement'; });
  if (found && typeof found.rawNum === 'number') return found.rawNum;
  return 0;
}

// The top-3 metric keys we surface on the list-view card per platform.
// Chosen so a scan of the feed reads well: primary volume + engagement
// signal + one platform-native "keeper" metric. Fallback list mirrors
// Instagram so a legacy item without a known platform still renders.
const INS_PLATFORM_TOP_THREE = {
  instagram: ['reach',       'engagement', 'saves'],
  tiktok:    ['views',       'engagement', 'watchTime'],
  youtube:   ['views',       'watchTime',  'subscribers'],
  facebook:  ['reach',       'engagement', 'clicks'],
  linkedin:  ['impressions', 'engagement', 'clicks'],
  x:         ['impressions', 'engagement', 'clicks'],
  email:     ['delivered',   'openRate',   'clickRate'],
  podcast:   ['plays',       'listeners',  'completionRate']
};

function _insdTopThreeForItem(item) {
  const platform = String(item && item.platform || '').toLowerCase();
  const wanted = INS_PLATFORM_TOP_THREE[platform] || INS_PLATFORM_TOP_THREE.instagram;
  const entries = _insdMetricsForPlatform(item);
  const byKey = {};
  entries.forEach(function (e) { byKey[e.key] = e; });
  return wanted.map(function (k) { return byKey[k]; }).filter(Boolean);
}

function _insFormatDateLong(ts) {
  const d = new Date(ts);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function _insFormatDateShort(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return 'Today';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}

// ---------------------------------------------
// List view
// ---------------------------------------------

// Module-local, session-only filter state. Not persisted \u2014 mirrors
// the Today screen filter's ephemeral-by-design contract. Keys:
//   format:   'all' | 'image' | 'video' | 'audio' | 'post'
//   platform: 'all' | any INS_PLATFORM_LABELS key
// Reset on hard reload; changed via _insSetFilter() so the filter bar
// re-render, feed re-render, and event rebinds happen together.
const _insListFilter = { format: 'all', platform: 'all' };

const INS_FORMAT_FILTERS = [
  { key: 'all',   label: 'All' },
  { key: 'image', label: 'Image' },
  { key: 'video', label: 'Video' },
  { key: 'audio', label: 'Audio' },
  { key: 'post',  label: 'Post' }
];

// Short lowercase labels for the list-card stat rows. Full labels
// (from the platform metric builders) read as headers on the detail
// grid; here we want a compact caption per key. Fallback derives from
// the entry.label so any new metric key still renders something.
const INS_METRIC_SHORT_LABEL = {
  reach:          'reach',
  impressions:    'impressions',
  views:          'views',
  likes:          'likes',
  comments:       'comments',
  shares:         'shares',
  saves:          'saves',
  engagement:     'engagement',
  ctr:            'CTR',
  watchTime:      'watch time',
  completionRate: 'completion',
  avgDuration:    'avg time',
  reactions:      'reactions',
  clicks:         'clicks',
  replies:        'replies',
  retweets:       'retweets',
  subscribers:    'new subs',
  delivered:      'delivered',
  openRate:       'open rate',
  clickRate:      'click rate',
  unsubscribes:   'unsubs',
  bounces:        'bounces',
  plays:            'plays',
  listeners:        'listeners',
  downloads:        'downloads',
  // Platform-specific additions. Kept lowercase and short so a mixed
  // top-3 row on a list card still reads as one visual family.
  profileVisits:    'profile visits',
  follows:          'new follows',
  followersGained:  'new followers',
  bookmarks:        'bookmarks',
  thumbnailCTR:     'thumb CTR',
  dwellTime:        'dwell time',
  totalOpens:       'total opens',
  totalClicks:      'total clicks'
};

function _insShortLabel(entry) {
  if (entry && INS_METRIC_SHORT_LABEL[entry.key]) return INS_METRIC_SHORT_LABEL[entry.key];
  return (entry && entry.label) ? entry.label.toLowerCase() : '';
}

// Platform icon lookup. We rely on the create screen having stamped
// its icon dictionary on the window (window.CR_PLATFORM_ICONS). If it
// hasn't loaded yet (e.g. someone deep-links straight into /results
// before create.js registers) we return an empty string so the chip
// still renders \u2014 the label carries the meaning either way.
function _insPlatformIcon(platformKey) {
  const dict = (typeof window !== 'undefined' && window.CR_PLATFORM_ICONS) || null;
  if (!dict) return '';
  return dict[platformKey] || '';
}

// Which platform "owns" the pool right now? Used to name the second
// summary tile ("Total Reach" vs "Total Views" vs \u2026). Ties break by
// the first platform that reached the top count (i.e. insertion order
// on the reduce, which is deterministic given the sorted feed).
function _insDominantPlatform(items) {
  if (!items || items.length === 0) return null;
  const counts = {};
  items.forEach(function (it) {
    const p = String(it && it.platform || '').toLowerCase();
    if (!p) return;
    counts[p] = (counts[p] || 0) + 1;
  });
  let top = null;
  let max = 0;
  Object.keys(counts).forEach(function (k) {
    if (counts[k] > max) { max = counts[k]; top = k; }
  });
  return top;
}

// Applies the current list filter. Never touches the source array \u2014
// returns a new slice so we can freely sort/render on the result. All
// filter dimensions are AND-combined; 'all' disables that dimension.
function _insApplyFilter(published) {
  return published.filter(function (it) {
    if (_insListFilter.format !== 'all' && it.type !== _insListFilter.format) return false;
    if (_insListFilter.platform !== 'all') {
      const p = String(it.platform || '').toLowerCase();
      if (p !== _insListFilter.platform) return false;
    }
    return true;
  });
}

function renderInsights(container) {
  const items = (getResults().items || []).slice();
  const published = items.filter(function (i) { return i && i.status === 'published'; });
  // Drafts live inside the Create screen now (Step 1's "Your drafts
  // \u2192" link opens a dedicated management view). Results only
  // renders published items.

  container.innerHTML = `
    <div class="ins-wrap">
      <div class="ins-header">
        <h1 class="ins-heading">Results</h1>
        <p class="ins-subtext">Everything you have published, and how it is performing.</p>
      </div>
      ${published.length === 0 ? _insRenderEmpty() : _insRenderContent(published)}
    </div>
  `;

  _insBindEvents(published);
}

function _insRenderEmpty() {
  return `
    <div class="ins-empty">
      <div class="ins-empty-icon" aria-hidden="true">${INS_EMPTY_ICON}</div>
      <div class="ins-empty-title">Nothing published yet.</div>
      <div class="ins-empty-sub">Create your first piece of content and publish it to start seeing insights here.</div>
      <button type="button" class="ins-empty-btn" id="insStartCreatingBtn">Start creating \u2192</button>
    </div>
  `;
}

function _insRenderContent(published) {
  // Aggregates run over ALL published items \u2014 the filter row below
  // only affects which cards render, not the summary tiles. That way
  // a user flipping between "Video" and "All" sees a stable top-line.
  const totalVolume = published.reduce(function (sum, it) {
    return sum + _insdVolumeForItem(it).value;
  }, 0);
  const avgEngagement = published.length
    ? published.reduce(function (sum, it) { return sum + _insdEngagementForItem(it); }, 0) / published.length
    : 0;
  const bestFormat = _insBestFormat(published);

  // Dominant platform decides the second-tile label. If no dominant
  // platform (empty or all unknown), fall back to "Total Reach".
  const dominant = _insDominantPlatform(published);
  const volumeSpec = INS_PLATFORM_VOLUME[dominant] || INS_PLATFORM_VOLUME.instagram;
  const volumeLabel = 'Total ' + volumeSpec.word;

  const filtered = _insApplyFilter(published);
  const sorted = filtered.slice().sort(function (a, b) {
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  const feedHtml = sorted.length === 0
    ? _insRenderFilteredEmpty()
    : sorted.map(_insRenderContentCard).join('');

  return `
    <div class="ins-summary-row">
      <div class="ins-stat-card ins-stat-card-primary">
        <div class="ins-stat-label">Total Published</div>
        <div class="ins-stat-value ins-stat-value-accent">${published.length}</div>
      </div>
      <div class="ins-stat-card">
        <div class="ins-stat-label">${_escape(volumeLabel)}</div>
        <div class="ins-stat-value">${_escape(_insFormatReach(totalVolume))}</div>
      </div>
      <div class="ins-stat-card">
        <div class="ins-stat-label">Avg Engagement</div>
        <div class="ins-stat-value">${avgEngagement.toFixed(1)}%</div>
      </div>
      <div class="ins-stat-card">
        <div class="ins-stat-label">Best Format</div>
        <div class="ins-stat-value ins-stat-value-small">${_escape(bestFormat)}</div>
      </div>
    </div>

    ${_insRenderFilterBar(published)}

    <div class="ins-feed">
      <div class="ins-feed-label">Your Content</div>
      ${feedHtml}
    </div>
  `;
}

// ---------------------------------------------
// Draft mutators
// ---------------------------------------------
//
// The drafts UI lives inside the Create screen now (Step 1's "Your
// drafts \u2192" link opens the management view). These helpers are
// kept here so the state mutation + persistence + re-render
// contract stays in one place; the Create screen calls them
// directly rather than duplicating the logic.

// Flip a draft to published + bump its timestamp so it slides to
// the top of the feed on re-render. Kept even though the in-Results
// Publish button is gone \u2014 downstream flows (e.g. a future
// "publish from drafts" action) can call it directly.
function _insPublishDraft(id) {
  const results = getResults();
  if (!results || !Array.isArray(results.items)) return;
  const idx = results.items.findIndex(function (it) { return it && it.id === id; });
  if (idx < 0) return;
  results.items[idx].status = 'published';
  results.items[idx].timestamp = Date.now();
  if (typeof _saveState === 'function') _saveState();
  // Full re-render so summary tiles + filter bar all reflect the new
  // publish. renderApp() is preferred since it also refreshes the
  // sidebar; the direct renderInsights() call is the fallback for
  // hosts that don't expose renderApp on window.
  if (typeof renderApp === 'function') renderApp();
  else renderInsights(_insContainer());
}

function _insDeleteDraft(id) {
  const results = getResults();
  if (!results || !Array.isArray(results.items)) return;
  const idx = results.items.findIndex(function (it) { return it && it.id === id; });
  if (idx < 0) return;
  results.items.splice(idx, 1);
  if (typeof _saveState === 'function') _saveState();
  if (typeof renderApp === 'function') renderApp();
  else renderInsights(_insContainer());
}

function _insRenderFilterBar(published) {
  const pillsHtml = INS_FORMAT_FILTERS.map(function (f) {
    const isActive = _insListFilter.format === f.key;
    return (
      '<button type="button" '
      + 'class="ins-filter' + (isActive ? ' ins-filter-active' : '') + '" '
      + 'data-format="' + _escape(f.key) + '" '
      + 'aria-pressed="' + (isActive ? 'true' : 'false') + '">'
      +   _escape(f.label)
      + '</button>'
    );
  }).join('');

  // Only offer platforms that actually appear in the pool. We keep a
  // stable order (matches INS_PLATFORM_LABELS keys) and prepend "All".
  const presentPlatforms = {};
  published.forEach(function (it) {
    const p = String(it.platform || '').toLowerCase();
    if (p) presentPlatforms[p] = true;
  });
  const platformOrder = ['instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'x', 'email', 'podcast'];
  const platformOptions = ['<option value="all">All Platforms</option>'].concat(
    platformOrder
      .filter(function (p) { return presentPlatforms[p]; })
      .map(function (p) {
        const label = INS_PLATFORM_LABELS[p] || p;
        const selected = (_insListFilter.platform === p) ? ' selected' : '';
        return '<option value="' + _escape(p) + '"' + selected + '>' + _escape(label) + '</option>';
      })
  ).join('');

  return (
    '<div class="ins-filters">'
    +   '<div class="ins-format-pills" role="tablist" aria-label="Filter by format">'
    +     pillsHtml
    +   '</div>'
    +   '<div class="ins-platform-wrap">'
    +     '<label class="ins-platform-label" for="insPlatformSelect">Platform</label>'
    +     '<select id="insPlatformSelect" class="ins-platform-select" aria-label="Filter by platform">'
    +       platformOptions
    +     '</select>'
    +   '</div>'
    + '</div>'
  );
}

function _insRenderFilteredEmpty() {
  return (
    '<div class="ins-empty-filter">'
    +   '<div class="ins-empty-filter-title">Nothing matches this filter.</div>'
    +   '<div class="ins-empty-filter-sub">Try a different format or platform to see more content.</div>'
    +   '<button type="button" class="ins-empty-filter-reset" id="insResetFilterBtn">Reset filters</button>'
    + '</div>'
  );
}

function _insRenderContentCard(item) {
  const business = (getActiveConcept() && getActiveConcept().business) || {};
  const gradient = _insMediaBackground(business.type);
  const typeKey = item.type || 'post';
  const typeIcon = INS_TYPE_ICONS[typeKey] || INS_TYPE_ICONS.post;
  const isVideo = typeKey === 'video';

  const platformKey = String(item.platform || '').toLowerCase();
  const platformLabel = _insPlatformLabel(platformKey);
  const platformIcon = _insPlatformIcon(platformKey);
  const typeBadgeLabel = (INS_FORMAT_LABELS[typeKey] || typeKey || 'Post').toUpperCase();
  const bodyText = (item.angle && item.angle.trim())
    || item.variation
    || 'Untitled piece';

  // Platform-specific top three. We accent the third slot to break up
  // the visual rhythm and echo the old "persona fit" highlight.
  const topThree = _insdTopThreeForItem(item);

  const statsHtml = topThree.map(function (entry, idx) {
    const numClass = 'ins-stat-num' + (idx === 2 ? ' ins-stat-num-accent' : '');
    return (
      '<div class="ins-stat">'
      +   '<div class="' + numClass + '">' + _escape(entry.num) + '</div>'
      +   '<div class="ins-stat-label">' + _escape(_insShortLabel(entry)) + '</div>'
      + '</div>'
    );
  }).join('');

  return (
    '<div class="ins-content-card" data-item-id="' + _escape(item.id) + '">'
    +   '<div class="ins-media-preview" style="background:' + gradient + '">'
    +     '<div class="ins-media-icon" aria-hidden="true">' + typeIcon + '</div>'
    +     (isVideo ? '<div class="ins-media-play" aria-hidden="true">' + INS_PLAY_ICON + '</div>' : '')
    +   '</div>'
    +   '<div class="ins-content-info">'
    +     '<div class="ins-info-top">'
    +       '<span class="ins-platform-chip">'
    +         (platformIcon ? '<span class="ins-platform-chip-icon" aria-hidden="true">' + platformIcon + '</span>' : '')
    +         '<span class="ins-platform-chip-label">' + _escape(platformLabel) + '</span>'
    +       '</span>'
    +       '<span class="ins-type-badge ins-type-badge-' + _escape(typeKey) + '">' + _escape(typeBadgeLabel) + '</span>'
    +       '<span class="ins-content-date">' + _insFormatDateShort(item.timestamp) + '</span>'
    +     '</div>'
    +     '<div class="ins-content-body">' + _escape(bodyText) + '</div>'
    +     _insRenderTagChips(item)
    +     '<div class="ins-stats-row">' + statsHtml + '</div>'
    +   '</div>'
    + '</div>'
  );
}

function _insRenderTagChips(item) {
  const tags = (item && Array.isArray(item.tags)) ? item.tags : [];
  if (tags.length === 0) return '';
  const chips = tags.map(function (tag) {
    return '<span class="ins-tag-chip">' + _escape(String(tag)) + '</span>';
  }).join('');
  return '<div class="ins-tags-row">' + chips + '</div>';
}

function _insBindEvents(published) {
  const startBtn = document.getElementById('insStartCreatingBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function () {
      if (typeof _resetCreate === 'function') _resetCreate();
      setActiveView('create');
      renderApp();
    });
  }

  const byId = {};
  published.forEach(function (it) { byId[it.id] = it; });

  // Format pills. Cheap re-render of the whole list container is
  // fine \u2014 the feed is tiny and this keeps state / DOM aligned.
  document.querySelectorAll('.ins-filter[data-format]').forEach(function (pill) {
    pill.addEventListener('click', function () {
      const key = pill.getAttribute('data-format') || 'all';
      if (_insListFilter.format === key) return;
      _insListFilter.format = key;
      renderInsights(_insContainer());
    });
  });

  // Platform dropdown. Same re-render strategy.
  const platformSelect = document.getElementById('insPlatformSelect');
  if (platformSelect) {
    platformSelect.addEventListener('change', function () {
      _insListFilter.platform = platformSelect.value || 'all';
      renderInsights(_insContainer());
    });
  }

  // Reset button in the filtered-empty state.
  const resetBtn = document.getElementById('insResetFilterBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      _insListFilter.format = 'all';
      _insListFilter.platform = 'all';
      renderInsights(_insContainer());
    });
  }

  // Card click -> navigate to the detail sub-page. We pin the id on
  // appState so the router / topbar / detail renderer can all find it,
  // then call renderApp() to swap the content area.
  document.querySelectorAll('.ins-content-card').forEach(function (card) {
    card.addEventListener('click', function () {
      const id = card.getAttribute('data-item-id');
      if (!id || !byId[id]) return;
      appState.insightsDetailId = id;
      setActiveView('insights-detail');
      renderApp();
    });
  });
}

// Container helper used by filter re-renders. We render into the same
// .ins-wrap parent the initial mount used. If nothing is found we
// bail out gracefully \u2014 something upstream will have re-rendered
// the app by then.
function _insContainer() {
  const wrap = document.querySelector('.ins-wrap');
  return wrap && wrap.parentElement ? wrap.parentElement : document.body;
}

// ---------------------------------------------
// Detail sub-page
// ---------------------------------------------
//
// Everything below is deterministic on the item id. If you change a
// seeding formula, every existing content item's numbers will shift
// \u2014 be intentional about that. All values are cosmetic; they don't
// affect any real business state or persisted data.

// Derives a rich metric bundle for a single item. Reach and engagement
// stay in sync with the list view; the rest are layered proportional
// derivations plus per-metric jitter from _insdRand so no two metrics
// move in lockstep.
function _insdMetrics(item) {
  const id = item.id;
  const reach = _insSeededReach(id);
  const engagementPct = _insSeededEngagement(id);
  // Impressions run 1.15x - 1.55x reach (some people see the post
  // more than once, especially on TikTok / YouTube).
  const impressions = Math.round(reach * (1.15 + _insdRand(id, 3) * 0.4));
  // Total "actions" = reach * engagement rate. We then split that
  // between likes / comments / shares / saves in believable ratios.
  const totalActions = reach * (engagementPct / 100);
  const likes    = Math.round(totalActions * (0.62 + _insdRand(id, 4) * 0.14));
  const comments = Math.round(totalActions * (0.06 + _insdRand(id, 5) * 0.06));
  const shares   = Math.round(totalActions * (0.09 + _insdRand(id, 6) * 0.08));
  const saves    = Math.round(totalActions * (0.07 + _insdRand(id, 7) * 0.09));
  const ctr = Math.round((2.1 + _insdRand(id, 8) * 3.4) * 10) / 10;   // 2.1 - 5.5 %
  const followers = Math.round(2 + _insdRand(id, 9) * 28);            // +2 to +30
  const personaFit = _insSeededPersonaFit(id);
  return {
    reach: reach,
    impressions: impressions,
    engagementPct: engagementPct,
    likes: likes,
    comments: comments,
    shares: shares,
    saves: saves,
    ctr: ctr,
    followers: followers,
    personaFit: personaFit
  };
}

// 7 daily buckets summing to `impressions`. Weighted so the middle
// days pull the most weight (typical algorithm distribution curve),
// with per-day jitter driven by _insdRand so different items get
// different-looking sparklines.
function _insdSevenDayCurve(item, impressions) {
  const id = item.id;
  const baseWeights = [0.06, 0.14, 0.22, 0.24, 0.17, 0.11, 0.06]; // sums to 1.00
  const jittered = baseWeights.map(function (w, i) {
    // ±30% jitter per day.
    return Math.max(0.02, w * (0.7 + _insdRand(id, 20 + i) * 0.6));
  });
  const sum = jittered.reduce(function (a, b) { return a + b; }, 0);
  return jittered.map(function (w) { return Math.round((w / sum) * impressions); });
}

// Weekday labels for the 7-day chart, ending on the item's timestamp
// day so the rightmost bar is "the day it was published".
function _insdDayLabels(timestamp) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date(timestamp || Date.now());
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(d.getTime() - i * 24 * 60 * 60 * 1000);
    out.push(names[day.getDay()]);
  }
  return out;
}

// Age brackets sum to 100. Different distributions per business type
// so the "audience" doesn't look identical for every concept. Small
// per-item jitter (±3pp) then re-normalized.
function _insdAudienceAge(item, businessType) {
  const buckets = ['18\u201324', '25\u201334', '35\u201344', '45\u201354', '55+'];
  const presets = {
    food:      [22, 34, 24, 14, 6],
    small:     [18, 32, 25, 17, 8],
    ecommerce: [28, 36, 20, 12, 4],
    service:   [10, 30, 32, 20, 8],
    agency:    [8,  28, 34, 22, 8],
    tech:      [14, 40, 28, 14, 4],
    saas:      [12, 42, 28, 14, 4],
    creator:   [38, 34, 18, 8,  2],
    nonprofit: [14, 24, 26, 22, 14]
  };
  const key = String(businessType || '').toLowerCase();
  const base = presets[key] || [22, 32, 24, 15, 7];
  const jittered = base.map(function (v, i) {
    return Math.max(1, v + Math.round(_insdRand(item.id, 30 + i) * 6 - 3));
  });
  const sum = jittered.reduce(function (a, b) { return a + b; }, 0);
  return buckets.map(function (bucket, i) {
    return { label: bucket, pct: Math.round((jittered[i] / sum) * 100) };
  });
}

// Male / Female / Other split. Preset per business type, jittered.
function _insdAudienceGender(item, businessType) {
  const presets = {
    food:      [42, 55, 3],
    small:     [46, 51, 3],
    ecommerce: [40, 57, 3],
    service:   [52, 45, 3],
    agency:    [55, 42, 3],
    tech:      [62, 35, 3],
    saas:      [64, 33, 3],
    creator:   [30, 66, 4],
    nonprofit: [44, 52, 4]
  };
  const key = String(businessType || '').toLowerCase();
  const base = presets[key] || [48, 49, 3];
  const jitter = Math.round(_insdRand(item.id, 40) * 8 - 4);
  const m = Math.max(20, Math.min(80, base[0] + jitter));
  const f = Math.max(20, Math.min(80, base[1] - jitter));
  const o = Math.max(1, 100 - m - f);
  return [
    { label: 'Male',   pct: m },
    { label: 'Female', pct: f },
    { label: 'Other',  pct: o }
  ];
}

// Top locations. Uses the concept's own business.location as the
// primary marker, then fills 2 more slots from a global city pool.
// Percentages are seeded so the same item always shows the same list.
function _insdTopLocations(item, business) {
  const globalPool = [
    'New York', 'Los Angeles', 'London', 'Toronto', 'Sydney',
    'San Francisco', 'Chicago', 'Berlin', 'Melbourne', 'Dublin'
  ];
  const home = (business.location && business.location.trim()) || null;
  const chosen = [];
  if (home) chosen.push(home);
  // Deterministically pick two more that aren't the home city.
  const seed = _insSeedNum(item.id);
  const filtered = globalPool.filter(function (c) {
    return c.toLowerCase() !== (home || '').toLowerCase();
  });
  const idxA = Math.abs(seed) % filtered.length;
  const idxB = Math.abs(seed + 3) % filtered.length;
  chosen.push(filtered[idxA]);
  if (filtered[idxB] !== filtered[idxA]) chosen.push(filtered[idxB]);
  else chosen.push(filtered[(idxB + 1) % filtered.length]);
  // Assign descending percentages (home city always leads if present).
  const rawPcts = [32, 21, 14].map(function (v, i) {
    return v + Math.round(_insdRand(item.id, 50 + i) * 8 - 4);
  });
  return chosen.slice(0, 3).map(function (city, i) {
    return { label: city, pct: Math.max(6, rawPcts[i]) };
  });
}

// Persona fit copy that pairs with the ring visual. Bands: <70 =
// mixed audience, 70-84 = strong match, 85+ = spot on.
function _insdPersonaCopy(score) {
  if (score >= 85) {
    return 'Nearly everyone this piece reached matches the customer profile Clara built for you. Keep this angle in rotation.';
  }
  if (score >= 70) {
    return 'Strong match with your ideal customer. A few outliers, but the core audience saw this and stayed.';
  }
  return 'Reached a wider mix than usual. Not a bad thing \u2014 but if you want this to convert, tighten the hook toward your core buyer.';
}

// Clara's three-paragraph analysis. Each paragraph is drawn from an
// id-seeded pool so we get variety, but the same item always gets the
// same read.
// Per-platform copy pools for Clara's three-paragraph read on a
// published piece. Each platform pool has three lines per section
// (worked / sharper / tryNext) that reference platform-native
// mechanics \u2014 Reels/Stories for IG, thumbnails/retention for
// YouTube, subject lines/segmentation for Email, and so on \u2014
// so the copy actually sounds like feedback for that channel rather
// than generic advice. The `default` pool (kept from the original
// generic copy) is the fallback for any unknown platform value.
const INS_CLARA_POOLS = {
  instagram: {
    worked: [
      'Your visual hook stopped the scroll. On Instagram, the first frame does 80% of the work \u2014 and this one earned the swipe.',
      'Carousels like this one over-index on saves because each swipe is a fresh dopamine hit. You paced the reveal well.',
      'The caption led with a hook, not a preamble. Instagram rewards captions that read like a Reel script \u2014 you did that here.'
    ],
    sharper: [
      'The last two lines of the caption trail off. Instagram cuts previews aggressively \u2014 put the CTA in the first two lines next time.',
      'This would have hit harder as a Reel. Static posts under-perform Reels by 3\u20134x on new-audience reach right now.',
      'You didn\u2019t seed a Story teaser before publishing. Stories drive 20-30% of feed post reach for accounts your size \u2014 don\u2019t skip that step.'
    ],
    tryNext: [
      'Cut this into a 15-second Reel and re-post with a text-on-video hook. Same idea, 3\u20134x the reach ceiling.',
      'Save this to a Highlight the moment engagement plateaus. Highlights keep top posts working for months after the feed forgets them.',
      'Post a Story teaser 4\u20136 hours before your next feed post. Stories warm the algorithm and pull reach up by 15-25%.'
    ]
  },
  tiktok: {
    worked: [
      'The first three seconds did the job. TikTok\u2019s completion curve is brutal below 3 seconds \u2014 you cleared it and kept them watching.',
      'Your hook rewarded the loop. A visual pattern that only resolves on the second watch is why watch time on this one runs above average.',
      'You leaned on a trending sound without letting it eat the message. That\u2019s the FYP sweet spot \u2014 relevant audio, original content.'
    ],
    sharper: [
      'You lost the audience between seconds 8 and 12. That\u2019s where 40% of the drop-off happened \u2014 tighten the pacing there.',
      'The CTA at the end is where TikTok watch time falls off a cliff. Move it to the middle, or cut it entirely and let the hook do the CTA work.',
      'No text-on-video hook. Even 4\u20135 words at the top of frame lifts completion rate by 10-15% because sound-off viewers can\u2019t follow otherwise.'
    ],
    tryNext: [
      'Stitch this with a trending video in your niche. Stitches get a For You Page boost from the source video\u2019s existing traction.',
      'Re-post a 15-second cut of this in 48 hours. Shorter reposts of proven hooks routinely out-perform the original on TikTok.',
      'Reply to the top comment with a video. Video replies get pushed to the original comment thread and pull new eyeballs back to the source.'
    ]
  },
  youtube: {
    worked: [
      'Your thumbnail earned the click. A 6%+ Thumbnail CTR at your subscriber count means the algorithm will keep testing this on new audiences.',
      'Retention held above 50% past the halfway point. That\u2019s the retention shape YouTube rewards with impressions on the browse feed.',
      'The subscribe CTA landed at the natural pause after the payoff \u2014 not tacked on at the end. That\u2019s the shape that converts.'
    ],
    sharper: [
      'Retention dips hard around the 20% mark. That\u2019s usually a signal the intro is too long \u2014 tighten it to 15 seconds max next video.',
      'Your thumbnail and title tell the same joke twice. Give them two different reasons to click; the CTR ceiling is higher when they complement instead of echo.',
      'No end-screen CTA to your next video. That\u2019s a session-length metric YouTube uses to decide whether to keep promoting the channel.'
    ],
    tryNext: [
      'Cut a 60-second Short from the highest-retention moment. Shorts route new viewers back into the long-form video within 48 hours.',
      'Test a new thumbnail using YouTube\u2019s A/B tool. Even a small CTR lift compounds \u2014 a 2% CTR bump at 10K impressions is 200 more views.',
      'Add this to a playlist alongside your two top-performing videos. Playlists lift average session time, which lifts new-video impressions.'
    ]
  },
  facebook: {
    worked: [
      'Reach held up even without a boost. That\u2019s the shape of content Facebook\u2019s algorithm is happy to keep serving organically.',
      'The comment section stayed on-topic \u2014 that\u2019s a community signal. Facebook actively favors posts with substantive replies over passive reactions.',
      'Your share-to-reach ratio is strong. Shares are the metric Facebook currently weights hardest for cold-audience reach.'
    ],
    sharper: [
      'Reactions skewed heavily toward Likes with almost no Loves. That\u2019s a "read and moved on" pattern \u2014 the hook needed more emotional stakes.',
      'You didn\u2019t reply to any comments in the first 90 minutes. Facebook\u2019s reach algorithm gives an early-reply boost that closed before you engaged.',
      'This is exactly the kind of post that would have doubled its reach with a $10 boost. The organic ceiling here was low from the start.'
    ],
    tryNext: [
      'Boost this post with a $20\u201350 spend targeted at existing page fans + lookalikes. The engagement rate here justifies the paid amplification.',
      'Cross-post the same angle into 2\u20133 relevant Facebook Groups where your buyers actually spend time. Group reach dwarfs page reach right now.',
      'Turn this into a Facebook Story with a poll sticker. Stories catch the fraction of your fans who never see the feed post.'
    ]
  },
  linkedin: {
    worked: [
      'Your dwell time is well above average \u2014 people actually read this. That\u2019s the LinkedIn signal that keeps the post surfacing all week, not just day one.',
      'You wrote like a peer, not a brand. LinkedIn\u2019s current algorithm rewards first-person operator voice over polished corporate voice by a wide margin.',
      'The framing landed like thought leadership without the buzzwords. That\u2019s rare and it\u2019s why your comment section skewed toward decision-makers.'
    ],
    sharper: [
      'The hook takes too long to land. LinkedIn now truncates at 3\u20134 lines \u2014 the strongest sentence needs to be visible before the "see more" click.',
      'No specific ask at the end. LinkedIn comments reward a targeted prompt ("what\u2019s your experience with X?") rather than an open invitation.',
      'This would have doubled its dwell time as a carousel. Text posts cap out; carousels keep readers on the slide for 20-30 seconds each.'
    ],
    tryNext: [
      'Repurpose this as a LinkedIn carousel with 6\u20138 slides. Same idea, 3x the dwell time, and native LinkedIn reach LinkedIn currently favors.',
      'DM the top three commenters. LinkedIn\u2019s algorithm won\u2019t \u2014 but your pipeline will \u2014 reward that one-to-one follow-up while the post is still warm.',
      'Package the last month of these into a LinkedIn newsletter issue. Newsletters compound because subscribers get notified for every issue.'
    ]
  },
  x: {
    worked: [
      'Your hook fit in the preview crop. That\u2019s the game on X now \u2014 the first line has to survive being cut off, and this one did.',
      'Replies out-ran retweets. That\u2019s the ratio X\u2019s algorithm currently prizes; conversation drives more reach than passive amplification.',
      'You timed this right. Posting in the 2-hour window when your audience is actually on the platform beats crafting the perfect tweet at 3am.'
    ],
    sharper: [
      'The tweet reads like the middle of a thought. Complete the loop \u2014 or explicitly frame it as a thread \u2014 so the reply guy instinct kicks in.',
      'No thread continuation. X\u2019s current algorithm treats a solo tweet as a dead end; threads keep serving replies deep into day two.',
      'You included a link. Native tweets without links out-reach tweets with links by 2\u20133x on X. Put the link in a reply instead.'
    ],
    tryNext: [
      'Turn the second half of this into a thread. Threads compound because each new reply from you signals the algorithm to re-serve the whole chain.',
      'Quote-tweet this in 48 hours with a "here\u2019s what happened next" update. Quote-tweets recycle reach without competing with the original tweet.',
      'Pin this to your profile for a week. Profile visits are the highest-intent traffic on X and a pinned post converts a share of them into follows.'
    ]
  },
  email: {
    worked: [
      'Your open rate cleared 30%. That\u2019s the number that separates a healthy list from a burnt one \u2014 a subject line this direct will keep clearing it.',
      'The click-through pattern shows readers actually finished the email. That\u2019s the metric your list will be worth on \u2014 not opens alone.',
      'Your unsubscribe rate stayed below 0.3%. Well-segmented sends look like this; the audience got the email they signed up for.'
    ],
    sharper: [
      'The subject line was too clever. Email opens are won by clarity, not curiosity \u2014 A/B test a plainer version next send.',
      'You sent to the whole list. Segmenting by last-click behavior would have lifted the open rate 10-15 points on the engaged half.',
      'The single CTA is buried below three paragraphs. Move it to the first screen \u2014 anyone still reading past the second scroll is 3x more likely to click.'
    ],
    tryNext: [
      'A/B test the subject line on your next send. Even a 2-point open-rate lift compounds across the year into thousands of extra opens.',
      'Resend this to non-openers with a different subject line 4\u20135 days later. You typically recover 15-25% of the original open volume that way.',
      'Segment the click-through audience into its own list and send them the follow-up sequence. That\u2019s where your highest-intent readers actually live.'
    ]
  },
  podcast: {
    worked: [
      'Your first-60-seconds retention held. Podcast listeners bail fast \u2014 anyone still there past the intro is now committed to the whole episode.',
      'The episode length matched the content weight. Consistency is what builds a podcast audience, and this one felt on-brand for the show.',
      'Your listener-to-play ratio is healthy. That means real people are finishing the episode, not autoplay tallies inflating the number.'
    ],
    sharper: [
      'The intro is 90 seconds too long. Podcast listeners drop 20% of the audience in the first two minutes when the value doesn\u2019t start immediately.',
      'No listener CTA. Ask for a review, a share, or a follow-up question \u2014 podcast growth is downstream of listeners doing something after the episode.',
      'You released off your usual cadence. Podcast subscriber growth compounds hardest when every listener knows when the next episode is coming.'
    ],
    tryNext: [
      'Clip the best 60 seconds and post it as a video on Instagram Reels and TikTok. Podcast discovery is a social problem now, not a directory problem.',
      'Ask three specific listeners for reviews by name in your next episode. Named asks convert 5-10x better than "please leave a review".',
      'Transcribe this episode and publish it as a long-form blog post. Podcast episodes bleed most of their value when they never leave the audio player.'
    ]
  },
  default: {
    worked: [
      'You led with a specific outcome, not a claim. That\u2019s why people paused instead of scrolling \u2014 the hook did its job.',
      'The tone here was unmistakably yours. Personal, direct, no marketing polish. That\u2019s the voice your audience actually leans into.',
      'The first line named a real problem your audience is already thinking about. That\u2019s the fastest way to earn a save.'
    ],
    sharper: [
      'The middle section drifts a little. Cutting 1\u20132 sentences would tighten the arc without losing anything material.',
      'The call-to-action is soft. Give the reader one specific thing to do next \u2014 not "let me know your thoughts", but "reply with X".',
      'You buried the strongest line. Move it up top; make it the hook the reader sees first.'
    ],
    tryNext: [
      'Ship a follow-up this week. Same angle, different example. Series compounds far better than one-offs.',
      'Reply to every comment on this piece in the next 24 hours. That\u2019s where the next 3 leads are hiding.',
      'Write one more piece that answers the follow-up question this one raised. Audiences reward continuity.'
    ]
  }
};

function _insdClaraAnalysis(item, metrics, business) {
  // Platform lookup with a default fallback. Any unknown platform
  // string (legacy items, custom platforms) falls through to the
  // original generic pool so we never render blank.
  const platformKey = String(item && item.platform || '').toLowerCase();
  const pool = INS_CLARA_POOLS[platformKey] || INS_CLARA_POOLS.default;

  // Seed offsets 0/1/2 keep each of the three sections drawing from
  // an independent slot on the same id \u2014 same item always
  // renders the same three paragraphs.
  const pick = function (arr, offset) {
    const idx = Math.abs(_insSeedNum(item.id) + offset) % arr.length;
    return arr[idx];
  };

  return {
    worked:  pick(pool.worked,  0),
    sharper: pick(pool.sharper, 1),
    tryNext: pick(pool.tryNext, 2)
  };
}

// Per-platform pools of 5 concrete follow-up plays keyed to the
// mechanics that actually move the needle on each network. Every
// pool has exactly 5 items \u2014 the picker below draws 3
// deterministically per item id, so the same item always shows the
// same three cards while different items on the same platform
// rotate through the full pool. Unknown platforms fall back to
// `default` (the original generic pool).
const INS_ACTION_POOLS = {
  instagram: [
    { title: 'Turn this into a Reel',                desc: 'Reels out-reach static posts by 3\u20134x on new-audience discovery. Same idea, 15\u201330 seconds, text-on-video hook.' },
    { title: 'Post a Story teaser',                  desc: 'Warm the algorithm before your next feed post \u2014 Story reach primes reach on the piece that follows.' },
    { title: 'Add to Highlights',                    desc: 'Save this to a Highlight so it keeps earning impressions long after the feed forgets it.' },
    { title: 'Reply to every comment in the first hour', desc: 'The first-60-minutes reply spike is the strongest reach signal Instagram currently reads.' },
    { title: 'Test the same content at a different time', desc: 'A/B test evening vs morning next week. Reach ceiling shifts by 30\u201350% for most accounts based on window alone.' }
  ],
  tiktok: [
    { title: 'Stitch this with a trending sound',    desc: 'Stitches ride the source video\u2019s existing FYP momentum \u2014 highest-leverage way to buy new reach.' },
    { title: 'Reply to top comment with a video',    desc: 'Video replies get pinned in-thread and re-pull viewers back to the source clip.' },
    { title: 'Post a Part 2',                        desc: 'Sequels on TikTok routinely out-perform the original because Part 1\u2019s viewers self-select as your warm audience.' },
    { title: 'Cross-post to Instagram Reels',        desc: 'A proven TikTok hook re-cut for Reels typically hits 60\u201380% of its TikTok reach on IG within 48 hours.' },
    { title: 'Trim to 15 seconds and repost',        desc: 'Short reposts of proven hooks routinely out-perform the original. 48 hours is the ideal gap.' }
  ],
  youtube: [
    { title: 'Add an end-screen CTA',                desc: 'End screens are the single biggest lever on session length, and session length is what promotes the channel.' },
    { title: 'Create a Short from this',             desc: 'Cut the highest-retention 60 seconds. Shorts route new viewers into the long-form video within 48 hours.' },
    { title: 'Update the thumbnail and test CTR',    desc: 'YouTube\u2019s built-in A/B tool. A 2-point CTR lift on 10K impressions is 200 more views \u2014 free upside.' },
    { title: 'Pin a comment with next-video link',   desc: 'Pinned comments are read by ~30% of viewers and are the cleanest way to hand-off session time.' },
    { title: 'Add to a playlist',                    desc: 'Playlists lift average session time. Higher session time = more impressions on future uploads.' }
  ],
  facebook: [
    { title: 'Boost this post',                      desc: 'The engagement rate here justifies a $20\u201350 boost targeted at existing fans + lookalikes.' },
    { title: 'Share to relevant Groups',             desc: 'Group reach dwarfs page reach right now. Cross-post the same angle into 2\u20133 groups where buyers hang out.' },
    { title: 'Turn into a Facebook Story',           desc: 'Stories catch the fraction of your fans who never see the feed. Add a poll sticker for a reach kicker.' },
    { title: 'Reply to every comment',               desc: 'Facebook\u2019s early-reply boost closes fast \u2014 replying within 90 minutes doubles the reach ceiling.' },
    { title: 'Repurpose as an Instagram post',       desc: 'Same audience overlap, different discovery mechanic. Meta\u2019s cross-post tools make this a 2-minute task.' }
  ],
  linkedin: [
    { title: 'Turn into a carousel post',            desc: 'Carousels 3x the dwell time of text posts and LinkedIn currently favors dwell over any other signal.' },
    { title: 'Tag people mentioned',                 desc: 'Named tags trigger notifications and pull the tagged person\u2019s network into your post\u2019s reach graph.' },
    { title: 'Follow up with commenters via DM',     desc: 'LinkedIn\u2019s algorithm won\u2019t reward this \u2014 but your pipeline will. Best done while the post is still warm.' },
    { title: 'Repurpose as a newsletter article',    desc: 'LinkedIn newsletters compound: every subscriber gets notified on every issue, unlike feed posts.' },
    { title: 'Schedule a follow-up post',            desc: 'Post a related-but-distinct angle within 5\u20137 days while the same audience is still primed by this one.' }
  ],
  x: [
    { title: 'Turn into a thread',                   desc: 'Threads keep serving replies deep into day two because each new reply from you signals the algorithm.' },
    { title: 'Quote-tweet with added context',       desc: 'Recycles reach without competing with the original. Do this at the 48-hour mark for best effect.' },
    { title: 'Pin this tweet',                       desc: 'Profile visits are the highest-intent traffic on X. A pinned post converts a share of them into follows.' },
    { title: 'Screenshot and post to LinkedIn',      desc: 'Text-only tweets that landed become LinkedIn posts with 3\u20135x the dwell time when reframed as commentary.' },
    { title: 'Follow up 48hrs later with results',   desc: 'A "here\u2019s what happened" follow-up tweet on a hit original often out-performs the original itself.' }
  ],
  email: [
    { title: 'A/B test the subject line',            desc: 'Even a 2-point open-rate lift compounds across the year into thousands of extra opens. Test one variable at a time.' },
    { title: 'Resend to non-openers',                desc: 'Resend 4\u20135 days later with a different subject line. Typically recovers 15\u201325% of the original open volume.' },
    { title: 'Segment by click behavior',            desc: 'Split the clicked-through cohort into its own list. That\u2019s where your highest-intent readers actually live.' },
    { title: 'Turn the top click into a landing page', desc: 'The link with the most engagement is your customer\u2019s real question. Build a page that answers it.' },
    { title: 'Send a follow-up sequence',            desc: 'A 3-email drip to the click cohort within 2 weeks typically converts 2\u20135x better than a single follow-up.' }
  ],
  podcast: [
    { title: 'Clip the best 60 seconds for social',  desc: 'Podcast discovery is a social problem now. Post the highest-energy clip on Reels and TikTok this week.' },
    { title: 'Ask listeners to leave a review',      desc: 'Named asks convert 5\u201310x better than generic ones. Call out three specific listeners in the next episode.' },
    { title: 'Transcribe and turn into a blog post', desc: 'Episodes bleed most of their value when they never leave the audio player. Transcripts capture search traffic.' },
    { title: 'Create a short video teaser',          desc: 'A 30-second video teaser \u2014 face + hook \u2014 doubles as promo and warms up your video-native audience.' },
    { title: 'Pitch the episode to a newsletter',    desc: 'Newsletter operators are always hungry for pre-packaged content. One placement can equal a week of organic downloads.' }
  ],
  default: [
    { title: 'Turn this into a series',              desc: 'This angle resonated. Ship two more pieces this week that expand on the same idea.' },
    { title: 'Cut a 60-second version',              desc: 'Reels and Shorts of proven content tend to outperform the original by 2\u20134x.' },
    { title: 'Repost the top comment',               desc: 'Pin the strongest reply as social proof and screenshot it into your next piece.' },
    { title: 'Write the follow-up',                  desc: 'This piece raised a question. The next one should answer it \u2014 same voice, same shape.' },
    { title: 'DM your 5 warmest leads',              desc: 'Send them this piece directly with one line: "This is why I built the thing."' }
  ]
};

// Three concrete follow-up cards keyed on the item's platform.
// Draws deterministically from the platform-specific pool above so
// the same id always shows the same three cards, but different
// items on the same platform rotate through all 5 pool entries.
function _insdSuggestedActions(item) {
  const platformKey = String(item && item.platform || '').toLowerCase();
  const pool = INS_ACTION_POOLS[platformKey] || INS_ACTION_POOLS.default;
  const seed = _insSeedNum(item.id);
  const picks = [];
  const used = {};
  // Coprime stride (7) with a 5-item pool guarantees full coverage
  // before repeats. The outer bound (`pool.length * 2`) is a safety
  // net for pools that shrink in the future.
  for (let i = 0; picks.length < 3 && i < pool.length * 2; i++) {
    const idx = Math.abs(seed + i * 7) % pool.length;
    if (used[idx]) continue;
    used[idx] = true;
    picks.push(pool[idx]);
  }
  return picks;
}

// Public entrypoint for the detail sub-page. If the pinned id is
// missing or doesn't match any item on the active concept, we bounce
// back to /results so the user isn't stuck on an empty shell.
function renderInsightsDetail(container) {
  const concept = getActiveConcept();
  const items = (concept && concept.results && Array.isArray(concept.results.items))
    ? concept.results.items
    : [];
  const id = appState.insightsDetailId;
  const item = id ? items.find(function (i) { return i && i.id === id; }) : null;

  if (!item) {
    setActiveView('results');
    renderInsights(container);
    return;
  }

  const business = (concept && concept.business) || {};
  const platformKey = String(item.platform || '').toLowerCase();
  const platformLabel = _insPlatformLabel(platformKey);
  const platformUrl = INS_PLATFORM_URLS[platformKey] || '#';
  const gradient = _insMediaBackground(business.type);
  const typeKey = item.type || 'post';
  const typeIcon = INS_TYPE_ICONS[typeKey] || INS_TYPE_ICONS.post;
  const isVideo = typeKey === 'video';
  const formatLabel = INS_FORMAT_LABELS[typeKey] || 'Post';

  const angle = (item.angle && item.angle.trim()) || 'Untitled piece';
  const variation = (item.variation && item.variation.trim()) || '';
  // Only render the variation block if it's meaningfully different
  // from the angle (avoids duplicate copy in the detail body).
  const hasVariation = variation && variation.toLowerCase() !== angle.toLowerCase();

  const m = _insdMetrics(item);
  // Platform-specific volume metric drives the 7-day chart (label +
  // total). Falls back to `m.impressions` for legacy items whose
  // platform doesn't resolve to a known volume spec.
  const volumeSpec = _insdVolumeForItem(item);
  const chartTotal = volumeSpec.value || m.impressions;
  const chartNoun = (volumeSpec.chart || 'Impressions');
  const chartNounLower = chartNoun.toLowerCase();

  const days = _insdSevenDayCurve(item, chartTotal);
  const dayLabels = _insdDayLabels(item.timestamp);
  const ageBuckets = _insdAudienceAge(item, business.type);
  const genderSplit = _insdAudienceGender(item, business.type);
  const topLocations = _insdTopLocations(item, business);
  const analysis = _insdClaraAnalysis(item, m, business);
  const suggested = _insdSuggestedActions(item);

  // ---- metric grid html ----------------------------------------
  // Platform-specific metric bundle. Cardinality varies by platform
  // (5 for Email/Podcast, 6 for X, 7 for Instagram/YouTube/Facebook/
  // LinkedIn, 8 for TikTok) \u2014 the grid picks a responsive column
  // count via the CSS modifier below so no one row is left orphaned.
  const metricEntries = _insdMetricsForPlatform(item);
  const gridColClass = metricEntries.length >= 7 ? ' insd-metrics-grid--4col' : ' insd-metrics-grid--3col';

  const metricsHtml = metricEntries.map(function (mm) {
    const icon = INS_METRIC_ICONS[mm.key] || '';
    return (
      '<div class="insd-metric-card">'
      +   '<div class="insd-metric-head">'
      +     '<span class="insd-metric-icon" aria-hidden="true">' + icon + '</span>'
      +     '<span class="insd-metric-label">' + _escape(mm.label) + '</span>'
      +   '</div>'
      +   '<div class="insd-metric-num">' + _escape(mm.num) + '</div>'
      +   '<div class="insd-metric-sub">' + _escape(mm.sub) + '</div>'
      + '</div>'
    );
  }).join('');

  // ---- 7-day bar chart html ------------------------------------
  const chartMax = Math.max.apply(null, days);
  const barsHtml = days.map(function (v, i) {
    const heightPct = chartMax > 0 ? Math.max(6, Math.round((v / chartMax) * 100)) : 0;
    const label = dayLabels[i] || '';
    const tooltip = _insFormatInt(v) + ' ' + chartNounLower;
    return (
      '<div class="insd-bar-col">'
      +   '<div class="insd-bar-track"><div class="insd-bar-fill" style="height:' + heightPct + '%" title="' + _escape(tooltip) + '"></div></div>'
      +   '<div class="insd-bar-label">' + _escape(label) + '</div>'
      + '</div>'
    );
  }).join('');

  // ---- audience html -------------------------------------------
  const ageRowsHtml = ageBuckets.map(function (a) {
    return (
      '<div class="insd-aud-row">'
      +   '<div class="insd-aud-key">' + _escape(a.label) + '</div>'
      +   '<div class="insd-aud-bar-wrap">'
      +     '<div class="insd-aud-bar-fill" style="width:' + a.pct + '%"></div>'
      +   '</div>'
      +   '<div class="insd-aud-pct">' + a.pct + '%</div>'
      + '</div>'
    );
  }).join('');

  const genderHtml = genderSplit.map(function (g) {
    return (
      '<div class="insd-aud-row">'
      +   '<div class="insd-aud-key">' + _escape(g.label) + '</div>'
      +   '<div class="insd-aud-bar-wrap">'
      +     '<div class="insd-aud-bar-fill" style="width:' + g.pct + '%"></div>'
      +   '</div>'
      +   '<div class="insd-aud-pct">' + g.pct + '%</div>'
      + '</div>'
    );
  }).join('');

  const locHtml = topLocations.map(function (l, i) {
    return (
      '<div class="insd-loc-row">'
      +   '<span class="insd-loc-rank">' + (i + 1) + '</span>'
      +   '<span class="insd-loc-city">' + _escape(l.label) + '</span>'
      +   '<span class="insd-loc-pct">' + l.pct + '%</span>'
      + '</div>'
    );
  }).join('');

  // ---- persona ring conic gradient -----------------------------
  const ringDeg = Math.round((m.personaFit / 100) * 360);
  // The unfilled portion of the doughnut is drawn with an rgba tint
  // that has to invert between modes: cream-on-dark for the default
  // canvas, warm-brown-on-parchment for light mode. Read the current
  // body class rather than a CSS variable because the conic-gradient
  // interpolates raw colour stops \u2014 var() inside a gradient stop
  // works but keeps the same value even after a theme swap unless the
  // element re-renders, and the ring itself doesn't. Recomputing on
  // every render keeps it in sync when the user toggles at runtime.
  const ringTrackRgba = document.body.classList.contains('light-mode')
    ? 'rgba(26, 17, 8, 0.08)'
    : 'rgba(255, 240, 220, 0.08)';

  // ---- suggested actions html ----------------------------------
  const suggestedHtml = suggested.map(function (s, i) {
    const num = (i + 1 < 10 ? '0' : '') + (i + 1);
    return (
      '<div class="insd-action-card">'
      +   '<div class="insd-action-num">' + num + '</div>'
      +   '<div class="insd-action-title">' + _escape(s.title) + '</div>'
      +   '<div class="insd-action-desc">' + _escape(s.desc) + '</div>'
      + '</div>'
    );
  }).join('');

  container.innerHTML = `
    <div class="insd-wrap">
      <button type="button" class="insd-back" id="insdBackBtn">
        <span class="insd-back-icon" aria-hidden="true">${INS_BACK_ICON}</span>
        <span>Back to Results</span>
      </button>

      <div class="insd-hero" style="background:${gradient}">
        <div class="insd-hero-icon" aria-hidden="true">${typeIcon}</div>
        ${isVideo ? '<div class="insd-hero-play" aria-hidden="true">' + INS_PLAY_ICON + '</div>' : ''}
        <div class="insd-hero-tag">${_escape(formatLabel)}</div>
      </div>

      <div class="insd-head">
        <div class="insd-head-left">
          <div class="insd-head-meta">
            <span class="ins-platform-chip">
              ${(function () {
                const ic = _insPlatformIcon(platformKey);
                return ic ? '<span class="ins-platform-chip-icon" aria-hidden="true">' + ic + '</span>' : '';
              })()}
              <span class="ins-platform-chip-label">${_escape(platformLabel)}</span>
            </span>
            <span class="ins-type-badge ins-type-badge-${_escape(typeKey)}">${_escape((INS_FORMAT_LABELS[typeKey] || typeKey || 'Post').toUpperCase())}</span>
            <span class="insd-head-date">${_insFormatDateLong(item.timestamp)}</span>
          </div>
          <h1 class="insd-title">${_escape(angle)}</h1>
        </div>
        ${platformUrl === '#'
          ? '<span class="insd-external insd-external-disabled" aria-disabled="true" title="No canonical destination for this platform">View on ' + _escape(platformLabel) + ' \u2192</span>'
          : '<a class="insd-external" href="' + _escape(platformUrl) + '" target="_blank" rel="noopener noreferrer">View on ' + _escape(platformLabel) + ' \u2192</a>'}
      </div>

      ${hasVariation ? '<div class="insd-fulltext">' + _escape(variation) + '</div>' : ''}

      <div class="insd-section">
        <div class="insd-section-label">Performance</div>
        <div class="insd-metrics-grid${gridColClass}">${metricsHtml}</div>
      </div>

      <div class="insd-section">
        <div class="insd-section-label">${_escape(chartNoun)} over 7 days</div>
        <div class="insd-chart">
          <div class="insd-bars">${barsHtml}</div>
        </div>
      </div>

      <div class="insd-two-col">
        <div class="insd-panel">
          <div class="insd-panel-label">Audience \u00b7 Age</div>
          <div class="insd-aud-list">${ageRowsHtml}</div>
          <div class="insd-panel-label insd-panel-label-sub">Gender split</div>
          <div class="insd-aud-list">${genderHtml}</div>
        </div>

        <div class="insd-panel">
          <div class="insd-panel-label">Top locations</div>
          <div class="insd-loc-list">${locHtml}</div>
          <div class="insd-panel-label insd-panel-label-sub">Persona fit</div>
          <div class="insd-persona">
            <div class="insd-persona-ring" style="background:conic-gradient(var(--accent) 0deg ${ringDeg}deg, ${ringTrackRgba} ${ringDeg}deg 360deg)">
              <div class="insd-persona-ring-inner">
                <div class="insd-persona-num">${m.personaFit}%</div>
                <div class="insd-persona-cap">match</div>
              </div>
            </div>
            <div class="insd-persona-copy">${_escape(_insdPersonaCopy(m.personaFit))}</div>
          </div>
        </div>
      </div>

      <div class="insd-section insd-clara-section">
        <div class="insd-section-label">Clara\u2019s take</div>
        <div class="insd-clara-block">
          <div class="insd-clara-sub">What worked</div>
          <p class="insd-clara-para">${_escape(analysis.worked)}</p>
        </div>
        <div class="insd-clara-block">
          <div class="insd-clara-sub">What could be sharper</div>
          <p class="insd-clara-para">${_escape(analysis.sharper)}</p>
        </div>
        <div class="insd-clara-block">
          <div class="insd-clara-sub">Try next</div>
          <p class="insd-clara-para">${_escape(analysis.tryNext)}</p>
        </div>
      </div>

      <div class="insd-section">
        <div class="insd-section-label">Suggested next actions</div>
        <div class="insd-actions">${suggestedHtml}</div>
      </div>
    </div>
  `;

  _insdBindEvents();
}

function _insdBindEvents() {
  const backBtn = document.getElementById('insdBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      setActiveView('results');
      renderApp();
    });
  }
}

window.renderInsights = renderInsights;
window.renderInsightsDetail = renderInsightsDetail;
// Alias so callers using the canonical 'results' name resolve to the
// same renderer as the legacy 'insights' one. Both point at the list
// entry point (renderInsights); the detail sub-page is reached via
// setActiveView('insights-detail') from the list.
window.renderResults = renderInsights;
