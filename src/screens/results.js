// ---------------------------------------------
// Clarity 2.0 — Results View
// ---------------------------------------------

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  email: 'Email'
};

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

function renderResults(container) {
  const items = getResults().items || [];
  const hasItems = items.length > 0;

  let html = `
    <div class="rs-wrap">
      <h1 class="rs-heading">Results</h1>
      <p class="rs-subtext">Every time you publish, Clara learns what works for your audience.</p>
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
      <div class="rs-stat-card">
        <div class="rs-stat-value rs-stat-value-accent">${items.length}</div>
        <div class="rs-stat-label">Published</div>
      </div>
      <div class="rs-stat-card">
        <div class="rs-stat-value">${_formatReach(totalReach)}</div>
        <div class="rs-stat-label">Total reach</div>
      </div>
      <div class="rs-stat-card">
        <div class="rs-stat-value rs-stat-value-small">${topPlatform ? _platformLabel(topPlatform) : '\u2014'}</div>
        <div class="rs-stat-label">Top channel</div>
      </div>
    </div>
    <div class="rs-insight-card">
      <div class="rs-insight-label">CLARA\u2019S TAKE</div>
      <div class="rs-insight-text">Based on what you\u2019ve published so far, ${insight}</div>
    </div>
    <div class="rs-content-label">YOUR CONTENT</div>
    <div class="rs-content-list">
      ${sorted.map(_renderContentRow).join('')}
    </div>
    <button type="button" class="rs-unlock-cta" id="rsAnotherBtn">Create another \u2192</button>
  `;
}

function _renderContentRow(item) {
  const type = item.type || 'post';
  const platformStr = _platformLabel(item.platform);
  const isDraft = item.status === 'draft';
  const reachStr = isDraft ? '\u2014' : _formatReach(_seededReach(item.id));
  const timeStr = _formatTimestamp(item.timestamp);
  const letter = type.charAt(0).toUpperCase();

  return `
    <div class="rs-content-row">
      <div class="rs-content-thumb rs-thumb-${type}">${letter}</div>
      <div class="rs-content-mid">
        <div class="rs-content-platform">${_escape(platformStr)}</div>
        <div class="rs-content-status rs-status-${isDraft ? 'draft' : 'published'}">${isDraft ? 'Draft' : 'Published'}</div>
        <div class="rs-content-time">${timeStr}</div>
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

window.renderResults = renderResults;
