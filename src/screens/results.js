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

const INS_PLATFORM_URLS = {
  instagram: 'https://www.instagram.com/',
  linkedin:  'https://www.linkedin.com/',
  facebook:  'https://www.facebook.com/',
  tiktok:    'https://www.tiktok.com/',
  youtube:   'https://www.youtube.com/',
  x:         'https://x.com/',
  email:     'mailto:',
  podcast:   'https://podcasts.apple.com/'
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
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
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

function renderInsights(container) {
  const items = (getResults().items || []).slice();
  const published = items.filter(function (i) { return i && i.status === 'published'; });

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
  const totalReach = published.reduce(function (sum, it) {
    return sum + _insSeededReach(it.id);
  }, 0);
  const avgEngagement = published.length
    ? published.reduce(function (sum, it) { return sum + _insSeededEngagement(it.id); }, 0) / published.length
    : 0;
  const bestFormat = _insBestFormat(published);

  const sorted = published.slice().sort(function (a, b) {
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  const feedHtml = sorted.map(function (item) {
    return _insRenderContentCard(item);
  }).join('');

  return `
    <div class="ins-summary-row">
      <div class="ins-stat-card ins-stat-card-primary">
        <div class="ins-stat-label">Total Published</div>
        <div class="ins-stat-value ins-stat-value-accent">${published.length}</div>
      </div>
      <div class="ins-stat-card">
        <div class="ins-stat-label">Total Reach</div>
        <div class="ins-stat-value">${_escape(_insFormatReach(totalReach))}</div>
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

    <div class="ins-feed">
      <div class="ins-feed-label">Your Content</div>
      ${feedHtml}
    </div>
  `;
}

function _insRenderContentCard(item) {
  const business = (getActiveConcept() && getActiveConcept().business) || {};
  const gradient = _insMediaBackground(business.type);
  const typeKey = item.type || 'post';
  const typeIcon = INS_TYPE_ICONS[typeKey] || INS_TYPE_ICONS.post;
  const isVideo = typeKey === 'video';

  const platformKey = String(item.platform || '').toLowerCase();
  const platformLabel = _insPlatformLabel(platformKey);
  const bodyText = (item.angle && item.angle.trim())
    || item.variation
    || 'Untitled piece';

  const reachStr = _insFormatReach(_insSeededReach(item.id));
  const engagementStr = _insSeededEngagement(item.id).toFixed(1) + '%';
  const personaStr = _insSeededPersonaFit(item.id) + '%';

  return (
    '<div class="ins-content-card" data-item-id="' + _escape(item.id) + '">'
    +   '<div class="ins-media-preview" style="background:' + gradient + '">'
    +     '<div class="ins-media-icon" aria-hidden="true">' + typeIcon + '</div>'
    +     (isVideo ? '<div class="ins-media-play" aria-hidden="true">' + INS_PLAY_ICON + '</div>' : '')
    +   '</div>'
    +   '<div class="ins-content-info">'
    +     '<div class="ins-info-top">'
    +       '<span class="ins-platform-chip">' + _escape(platformLabel) + '</span>'
    +       '<span class="ins-content-date">' + _insFormatDateShort(item.timestamp) + '</span>'
    +     '</div>'
    +     '<div class="ins-content-body">' + _escape(bodyText) + '</div>'
    +     '<div class="ins-stats-row">'
    +       '<div class="ins-stat">'
    +         '<div class="ins-stat-num">' + _escape(reachStr) + '</div>'
    +         '<div class="ins-stat-label">reach</div>'
    +       '</div>'
    +       '<div class="ins-stat">'
    +         '<div class="ins-stat-num">' + engagementStr + '</div>'
    +         '<div class="ins-stat-label">engagement</div>'
    +       '</div>'
    +       '<div class="ins-stat">'
    +         '<div class="ins-stat-num ins-stat-num-accent">' + personaStr + '</div>'
    +         '<div class="ins-stat-label">persona fit</div>'
    +       '</div>'
    +     '</div>'
    +   '</div>'
    + '</div>'
  );
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
function _insdClaraAnalysis(item, metrics, business) {
  const platform = _insPlatformLabel(item.platform);
  const formatLabel = INS_FORMAT_LABELS[item.type] || 'post';

  const worked = [
    'You led with a specific outcome, not a claim. That\u2019s why people paused instead of scrolling \u2014 the hook did its job.',
    'The tone here was unmistakably yours. Personal, direct, no marketing polish. That\u2019s the voice your audience actually leans into.',
    'The first line named a real problem your audience is already thinking about. That\u2019s the fastest way to earn a save.',
    'You anchored the piece to a moment, not a concept. Concrete beats abstract every single time on ' + platform + '.',
    'The pacing was clean \u2014 short setup, clear middle, one takeaway. This is the shape most of your best content will share.'
  ];
  const sharper = [
    'The middle section drifts a little. Cutting 1\u20132 sentences would tighten the arc without losing anything material.',
    'The call-to-action is soft. Give the reader one specific thing to do next \u2014 not "let me know your thoughts", but "reply with X".',
    'You buried the strongest line. Move it up top; make it the hook the reader sees first.',
    'A single visual reference would have compounded the reach here. Even a screenshot would have added a full point of engagement.',
    'The framing is generic. Say the customer\u2019s name out loud in the copy \u2014 the exact type of person you want reading this.'
  ];
  const tryNext = [
    'Ship a follow-up this week. Same angle, different example. Series compounds far better than one-offs on ' + platform + '.',
    'Repurpose the strongest line into a standalone ' + formatLabel.toLowerCase() + ' next week. It earns a second impression from the same audience.',
    'Test the same idea on a different platform. If it worked on ' + platform + ', a 60-second cut of it will likely work on Reels too.',
    'Reply to every comment on this piece in the next 24 hours. That\u2019s where the next 3 leads are hiding.',
    'Write one more piece that answers the follow-up question this one raised. Audiences reward continuity.'
  ];

  const pick = function (pool, offset) {
    const idx = Math.abs(_insSeedNum(item.id) + offset) % pool.length;
    return pool[idx];
  };

  return {
    worked:  pick(worked,   0),
    sharper: pick(sharper,  1),
    tryNext: pick(tryNext,  2)
  };
}

// Three concrete follow-up cards keyed on the item's format + platform.
// Same seeding rules as the analysis.
function _insdSuggestedActions(item) {
  const platform = _insPlatformLabel(item.platform);
  const formatLabel = (INS_FORMAT_LABELS[item.type] || 'post').toLowerCase();
  const pool = [
    { title: 'Turn this into a series',      desc: 'This angle resonated. Ship two more pieces this week that expand on the same idea.' },
    { title: 'Cut a 60-second version',       desc: 'Reels and Shorts of proven ' + formatLabel + 's tend to outperform the original by 2\u20134x.' },
    { title: 'Repost the top comment',        desc: 'Pin the strongest reply as social proof and screenshot it into your next piece.' },
    { title: 'Cross-post to a second channel',desc: 'This worked on ' + platform + '. Try it on the channel where your ideal buyer also lives.' },
    { title: 'DM your 5 warmest leads',       desc: 'Send them this piece directly with one line: "This is why I built the thing."' },
    { title: 'Write the follow-up',           desc: 'This piece raised a question. The next one should answer it \u2014 same voice, same shape.' },
    { title: 'Bundle 3 pieces into an email', desc: 'Your list wants curation. Package this + two more into a Friday sendout.' }
  ];
  const seed = _insSeedNum(item.id);
  const picks = [];
  const used = {};
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
  const days = _insdSevenDayCurve(item, m.impressions);
  const dayLabels = _insdDayLabels(item.timestamp);
  const ageBuckets = _insdAudienceAge(item, business.type);
  const genderSplit = _insdAudienceGender(item, business.type);
  const topLocations = _insdTopLocations(item, business);
  const analysis = _insdClaraAnalysis(item, m, business);
  const suggested = _insdSuggestedActions(item);

  // ---- metric grid html ----------------------------------------
  const metricEntries = [
    { key: 'reach',       label: 'Reach',        num: _insFormatInt(m.reach),        sub: 'Unique accounts' },
    { key: 'impressions', label: 'Impressions',  num: _insFormatInt(m.impressions),  sub: 'Times shown' },
    { key: 'engagement',  label: 'Engagement',   num: m.engagementPct.toFixed(1) + '%', sub: 'Rate of reach' },
    { key: 'likes',       label: 'Likes',        num: _insFormatInt(m.likes),        sub: 'Total reactions' },
    { key: 'comments',    label: 'Comments',     num: _insFormatInt(m.comments),     sub: 'Direct replies' },
    { key: 'shares',      label: 'Shares',       num: _insFormatInt(m.shares),       sub: 'Sent to others' },
    { key: 'saves',       label: 'Saves',        num: _insFormatInt(m.saves),        sub: 'Kept for later' },
    { key: 'ctr',         label: 'Link CTR',     num: m.ctr.toFixed(1) + '%',        sub: 'Profile clicks' },
    { key: 'followers',   label: 'New Followers',num: '+' + m.followers,             sub: 'From this piece' }
  ];
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
    return (
      '<div class="insd-bar-col">'
      +   '<div class="insd-bar-track"><div class="insd-bar-fill" style="height:' + heightPct + '%" title="' + _insFormatInt(v) + ' impressions"></div></div>'
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
            <span class="ins-platform-chip">${_escape(platformLabel)}</span>
            <span class="insd-head-date">${_insFormatDateLong(item.timestamp)}</span>
          </div>
          <h1 class="insd-title">${_escape(angle)}</h1>
        </div>
        <a class="insd-external" href="${_escape(platformUrl)}" target="_blank" rel="noopener noreferrer">
          View on ${_escape(platformLabel)} \u2192
        </a>
      </div>

      ${hasVariation ? '<div class="insd-fulltext">' + _escape(variation) + '</div>' : ''}

      <div class="insd-section">
        <div class="insd-section-label">Performance</div>
        <div class="insd-metrics-grid">${metricsHtml}</div>
      </div>

      <div class="insd-section">
        <div class="insd-section-label">Impressions over 7 days</div>
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
            <div class="insd-persona-ring" style="background:conic-gradient(var(--accent) 0deg ${ringDeg}deg, rgba(255,240,220,0.08) ${ringDeg}deg 360deg)">
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
