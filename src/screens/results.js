// ---------------------------------------------
// Clarity 2.0 — Insights View (formerly "Results")
// ---------------------------------------------
//
// The `insights` nav item on the dashboard sidebar renders this view.
// File is still named results.js to preserve git blame for the recent
// warm-lux polish pass \u2014 the class prefix `rs-` is likewise kept as an
// internal identifier. Public entrypoint is `renderInsights`; a legacy
// `renderResults` alias is exposed for any lingering callers.

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  tiktok:   'TikTok',
  youtube:  'YouTube',
  x:        'X',
  email:    'Email',
  podcast:  'Podcast'
};

// Monochrome platform SVGs (14x14, tint via currentColor). Rendered
// inside the thumb of each content row so the list reads at a glance
// as "Instagram / LinkedIn / \u2026" instead of an anonymous letter tile.
const RS_PLATFORM_ICONS = {
  instagram:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">'
    + '<rect x="3" y="3" width="18" height="18" rx="5"/>'
    + '<circle cx="12" cy="12" r="4"/>'
    + '<circle cx="17.5" cy="6.5" r="0.7" fill="currentColor" stroke="none"/>'
    + '</svg>',
  tiktok:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">'
    + '<path d="M19.5 8.5c-1.6 0-3-.8-3.9-2v9c0 3.1-2.5 5.6-5.6 5.6S4.4 18.6 4.4 15.5 6.9 10 10 10c.3 0 .7 0 1 .1v3.2c-.3-.1-.6-.2-1-.2-1.4 0-2.6 1.1-2.6 2.5s1.1 2.5 2.6 2.5 2.6-1.1 2.6-2.5V3h3c.4 2.6 2.4 4.5 5 4.5v3z"/>'
    + '</svg>',
  youtube:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">'
    + '<path d="M22 8.4c-.2-1.2-1-2.2-2.2-2.4C17.7 5.5 12 5.5 12 5.5s-5.7 0-7.8.5C3 6.2 2.2 7.2 2 8.4 1.5 10.5 1.5 12 1.5 12s0 1.5.5 3.6c.2 1.2 1 2.2 2.2 2.4 2.1.5 7.8.5 7.8.5s5.7 0 7.8-.5c1.2-.2 2-1.2 2.2-2.4.5-2.1.5-3.6.5-3.6s0-1.5-.5-3.6zM10 15V9l5 3-5 3z"/>'
    + '</svg>',
  facebook:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">'
    + '<path d="M13 22v-8h3l.5-4H13V7.5c0-1.1.4-2 2-2h1.5V2c-.5-.1-1.5-.2-2.5-.2-3 0-5 1.8-5 5V10H6v4h3v8h4z"/>'
    + '</svg>',
  linkedin:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">'
    + '<rect x="3" y="9" width="4" height="12" rx="0.5"/>'
    + '<circle cx="5" cy="5" r="2"/>'
    + '<path d="M9 9h4v1.8c.7-1 2-2 3.8-2 3.2 0 4.2 2 4.2 5V21h-4v-6.1c0-1.4-.6-2.3-2-2.3s-2 .9-2 2.3V21H9V9z"/>'
    + '</svg>',
  x:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">'
    + '<path d="M17.5 3h3.4l-7.4 8.5L22 21h-6.8l-5.3-6.9L3.7 21H.3l7.9-9L.5 3h6.9l4.8 6.3L17.5 3zm-1.2 16h1.9L7.8 5H5.8l10.5 14z"/>'
    + '</svg>',
  email:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="3" y="5" width="18" height="14" rx="2"/>'
    + '<path d="M3 7l9 6 9-6"/>'
    + '</svg>',
  podcast:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="9" y="3" width="6" height="12" rx="3"/>'
    + '<path d="M5 11a7 7 0 0 0 14 0"/>'
    + '<line x1="12" y1="18" x2="12" y2="22"/>'
    + '</svg>'
};

// Fallback icon (generic doc) used when a row's platform isn't in the
// map above \u2014 keeps the thumb visual instead of falling back to a
// bare letter tile.
const RS_FALLBACK_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
  + '<rect x="4" y="3" width="16" height="18" rx="2"/>'
  + '<line x1="8" y1="8" x2="16" y2="8"/>'
  + '<line x1="8" y1="12" x2="16" y2="12"/>'
  + '<line x1="8" y1="16" x2="12" y2="16"/>'
  + '</svg>';

// Icons for the three summary stat cards (rendered top-left inside each
// card's icon chip). Kept flat + stroke-based so the amber accent tint
// reads consistently against the card gradients.
const RS_STAT_ICON_PUBLISHED =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
  + '<polyline points="20 6 9 17 4 12"/>'
  + '</svg>';
const RS_STAT_ICON_REACH =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>'
  + '<circle cx="12" cy="12" r="3"/>'
  + '</svg>';
const RS_STAT_ICON_CHANNEL =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
  + '<polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/>'
  + '</svg>';

function _seededReach(idStr) {
  const digits = String(idStr).replace(/\D/g, '');
  const num = digits ? parseInt(digits, 10) : 0;
  const raw = Math.sin(num) * 1400 + 1400;
  return Math.round(raw / 10) * 10;
}

function _formatReach(n) {
  if (n >= 1000) {
    const k = n / 1000;
    const rounded = k >= 10 ? Math.round(k).toString() : k.toFixed(1);
    return rounded.replace(/\.0$/, '') + 'K';
  }
  return String(n);
}

function _mostCommonPlatform(items) {
  const counts = {};
  items.forEach(function (it) {
    if (!it.platform) return;
    counts[it.platform] = (counts[it.platform] || 0) + 1;
  });
  let top = null;
  let max = 0;
  Object.keys(counts).forEach(function (k) {
    if (counts[k] > max) {
      max = counts[k];
      top = k;
    }
  });
  return top;
}

function _platformLabel(key) {
  return PLATFORM_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '');
}

function _claraInsight(items, totalReach) {
  if (totalReach === 0) {
    return 'your content is out there. Engagement takes a few days to build.';
  }
  const types = new Set(items.map(function (i) { return i.type; }));
  if (types.size === 1 && types.has('post')) {
    return 'written posts are your strongest format. Keep that going.';
  }
  return 'you\u2019re testing different formats which is smart. Double down on what gets shared.';
}

function _formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return 'Today';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}

function renderInsights(container) {
  const items = getResults().items || [];
  const hasItems = items.length > 0;

  let html = `
    <div class="rs-wrap">
      <div class="rs-glow" aria-hidden="true"></div>
      <div class="rs-header">
        <div class="rs-eyebrow">Performance</div>
        <h1 class="rs-heading">Insights</h1>
        <p class="rs-subtext">Every time you publish, Clara learns what works for your audience.</p>
      </div>
  `;

  if (!hasItems) {
    html += _renderLockedState();
  } else {
    html += _renderUnlockedState(items);
  }

  html += '</div>';
  container.innerHTML = html;
  _bindResultsEvents();
}

function _renderLockedState() {
  const cards = [
    { label: 'REACH', desc: 'How many people saw your content' },
    { label: 'BEST TIME', desc: 'When your audience is most active' },
    { label: 'WHAT\u2019S WORKING', desc: 'Which content type gets the most response' }
  ];

  return `
    <div class="rs-locked-cards">
      ${cards.map(function (c) {
        return `
          <div class="rs-locked-card">
            ${RESULTS_LOCK_ICON}
            <div class="rs-locked-label">${c.label}</div>
            <div class="rs-locked-dash">\u2014</div>
            <div class="rs-locked-desc">${c.desc}</div>
          </div>
        `;
      }).join('')}
    </div>
    <button type="button" class="rs-unlock-cta" id="rsFirstBtn">Create your first post \u2192</button>
  `;
}

function _renderUnlockedState(items) {
  const totalReach = items.reduce(function (sum, item) {
    return sum + (item.status === 'draft' ? 0 : _seededReach(item.id));
  }, 0);
  const topPlatform = _mostCommonPlatform(items);
  const insight = _claraInsight(items, totalReach);

  const sorted = items.slice().sort(function (a, b) {
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  return `
    <div class="rs-summary-row">
      <div class="rs-stat-card rs-stat-card-primary">
        <div class="rs-stat-icon">${RS_STAT_ICON_PUBLISHED}</div>
        <div class="rs-stat-value rs-stat-value-accent">${items.length}</div>
        <div class="rs-stat-label">Published</div>
        <div class="rs-stat-pulse" aria-hidden="true"><span></span></div>
      </div>
      <div class="rs-stat-card">
        <div class="rs-stat-icon">${RS_STAT_ICON_REACH}</div>
        <div class="rs-stat-value">${_formatReach(totalReach)}</div>
        <div class="rs-stat-label">Total reach</div>
      </div>
      <div class="rs-stat-card">
        <div class="rs-stat-icon">${RS_STAT_ICON_CHANNEL}</div>
        <div class="rs-stat-value rs-stat-value-small">${topPlatform ? _platformLabel(topPlatform) : '\u2014'}</div>
        <div class="rs-stat-label">Top channel</div>
      </div>
    </div>
    <div class="rs-insight-card">
      <div class="rs-insight-glow" aria-hidden="true"></div>
      <div class="rs-insight-head">
        <span class="rs-insight-avatar" aria-hidden="true">C</span>
        <span class="rs-insight-label">Clara\u2019s take</span>
      </div>
      <div class="rs-insight-text">Based on what you\u2019ve published so far, ${insight}</div>
    </div>
    <div class="rs-content-head">
      <div class="rs-content-label">Your content</div>
      <div class="rs-content-count">${items.length} ${items.length === 1 ? 'item' : 'items'}</div>
    </div>
    <div class="rs-content-list">
      ${sorted.map(_renderContentRow).join('')}
    </div>
    <button type="button" class="rs-unlock-cta" id="rsAnotherBtn">
      <span class="rs-cta-plus" aria-hidden="true">+</span>
      <span>Create another</span>
    </button>
  `;
}

function _renderContentRow(item) {
  const type = item.type || 'post';
  const platformStr = _platformLabel(item.platform);
  const isDraft = item.status === 'draft';
  const reachStr = isDraft ? '\u2014' : _formatReach(_seededReach(item.id));
  const timeStr = _formatTimestamp(item.timestamp);
  const platformKey = String(item.platform || '').toLowerCase();
  const icon = RS_PLATFORM_ICONS[platformKey] || RS_FALLBACK_ICON;

  return `
    <div class="rs-content-row">
      <div class="rs-content-thumb rs-thumb-${type}">${icon}</div>
      <div class="rs-content-mid">
        <div class="rs-content-platform">${_escape(platformStr)}</div>
        <div class="rs-content-meta">
          <span class="rs-content-status-chip rs-status-${isDraft ? 'draft' : 'published'}">
            <span class="rs-status-dot" aria-hidden="true"></span>
            ${isDraft ? 'Draft' : 'Published'}
          </span>
          <span class="rs-content-time">${timeStr}</span>
        </div>
      </div>
      <div class="rs-content-reach-wrap">
        <div class="rs-content-reach">${reachStr}</div>
        <div class="rs-content-reach-label">reach</div>
      </div>
    </div>
  `;
}

function _bindResultsEvents() {
  const goCreate = function () {
    _resetCreate();
    appState.activeView = 'create';
    _saveState();
    renderApp();
  };
  const first = document.getElementById('rsFirstBtn');
  const another = document.getElementById('rsAnotherBtn');
  if (first) first.addEventListener('click', goCreate);
  if (another) another.addEventListener('click', goCreate);
}

window.renderInsights = renderInsights;
// Legacy alias so any lingering `renderResults` caller still functions
// during the dashboard restructure rollout. Safe to drop later.
window.renderResults = renderInsights;
