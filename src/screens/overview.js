// ---------------------------------------------
// Clarity 2.0 — Overview View
// ---------------------------------------------
//
// The concept's landing page. After Clara finishes onboarding a concept
// we drop the user here instead of straight into Today, so they see the
// whole workspace at a glance and can decide where to go.
//
// Three tiles: TODAY (task preview), CREATE (start CTA), RESULTS (status).
// Each tile is clickable and swaps the active view. Below the tiles is a
// small "Ask Clara" link that jumps back to Chat for anything ad hoc.
//
// This view is only reachable once `chat.onboardingComplete` is true —
// the sidebar disables it otherwise and the router forces Chat.

function renderOverview(container) {
  const concept = getActiveConcept();
  if (!concept) return;

  const b = concept.business || {};
  const name = (b.name && b.name.trim()) ? b.name.trim() : 'your business';
  const color = concept.color || '#F5A623';

  // Read tasks with their live status from the concept's persisted list
  // rather than the raw generator, so a task marked Done in the Today
  // view (or via the workspace widget) is reflected on the Overview too.
  // Seed lazily if the user hasn't opened Today yet.
  if (typeof _seedTodayTasks === 'function') _seedTodayTasks(concept);
  const allTasks = (concept.today && Array.isArray(concept.today.tasks))
    ? concept.today.tasks
    : [];
  const openTasks = allTasks.filter(function (t) {
    return !t || t.status !== 'done';
  });
  const allDone = allTasks.length > 0 && openTasks.length === 0;

  const items = (concept.results && Array.isArray(concept.results.items))
    ? concept.results.items
    : [];
  const publishedCount = items.filter(function (i) {
    return i && i.status && i.status !== 'draft';
  }).length;
  const draftCount = items.filter(function (i) {
    return i && (!i.status || i.status === 'draft');
  }).length;

  const typeLabel = (b.type && b.type !== 'other') ? _capitalize(b.type) : '';
  const reachLabel = b.reach === 'local' ? 'Local' : (b.reach === 'online' ? 'Online' : '');
  const meta = [typeLabel, reachLabel].filter(Boolean).join(' \u00b7 ');

  container.innerHTML = `
    <section class="ov-wrap" style="--concept-color:${color}">
      <div class="ov-blob-1"></div>
      <div class="ov-blob-2"></div>

      <div class="ov-hero">
        <div class="ov-greeting">${_greeting()}</div>
        <h1 class="ov-heading">${_escape(name)}</h1>
        ${meta ? '<div class="ov-meta">' + _escape(meta) + '</div>' : ''}
      </div>

      <div class="ov-tiles">
        ${_renderTodayTile(openTasks, allDone)}
        ${_renderCreateTile(draftCount)}
        ${_renderResultsTile(publishedCount)}
      </div>

      ${_renderResearchInsights(b)}
    </section>
  `;

  container.querySelectorAll('[data-nav]').forEach(function (el) {
    el.addEventListener('click', function () {
      const target = el.getAttribute('data-nav');
      if (!target || target === appState.activeView) return;
      setActiveView(target);
      renderApp();
    });
  });
}

function _renderTodayTile(openTasks, allDone) {
  if (allDone) {
    return `
      <button type="button" class="ov-tile ov-tile-today" data-nav="today">
        <div class="ov-tile-head">
          <span class="ov-tile-label">TODAY</span>
          <span class="ov-tile-arrow">\u2192</span>
        </div>
        <div class="ov-today-empty">All done for today. Clara will have new tasks tomorrow.</div>
        <div class="ov-tile-cta">Review today \u2192</div>
      </button>
    `;
  }

  // No JS truncation \u2014 CSS -webkit-line-clamp handles wrapping so we
  // never end up cutting a sentence mid-word with an ugly ellipsis.
  const preview = openTasks.slice(0, 3).map(function (t) {
    const typeKey = String(t.type || '').toLowerCase();
    return (
      '<li class="ov-task ov-task-' + typeKey + '">'
      +   '<span class="ov-task-type">' + _escape(t.type) + '</span>'
      +   '<span class="ov-task-desc">' + _escape(t.description) + '</span>'
      + '</li>'
    );
  }).join('');

  const remaining = openTasks.length;
  const title = remaining === 1
    ? '1 task left today.'
    : remaining + ' tasks Clara wants you to focus on.';

  return `
    <button type="button" class="ov-tile ov-tile-today" data-nav="today">
      <div class="ov-tile-head">
        <span class="ov-tile-label">TODAY</span>
        <span class="ov-tile-arrow">\u2192</span>
      </div>
      <div class="ov-tile-title">${_escape(title)}</div>
      <ul class="ov-task-list">${preview}</ul>
      <div class="ov-tile-cta">See today \u2192</div>
    </button>
  `;
}

function _renderCreateTile(draftCount) {
  const draftLine = draftCount > 0
    ? draftCount + (draftCount === 1 ? ' draft in progress.' : ' drafts in progress.')
    : 'No drafts yet.';

  return `
    <button type="button" class="ov-tile ov-tile-create" data-nav="create">
      <div class="ov-tile-head">
        <span class="ov-tile-label">CREATE</span>
        <span class="ov-tile-arrow">\u2192</span>
      </div>
      <div class="ov-tile-title">Turn today into content.</div>
      <div class="ov-tile-body">
        Post, image, video, or audio. Clara drafts variations you can publish or save.
      </div>
      <div class="ov-tile-foot">
        <span class="ov-tile-status">${_escape(draftLine)}</span>
        <span class="ov-tile-cta">Start \u2192</span>
      </div>
    </button>
  `;
}

function _renderResultsTile(publishedCount) {
  const empty = publishedCount === 0;

  const title = empty
    ? 'Nothing published yet.'
    : (publishedCount === 1 ? '1 piece shipped.' : publishedCount + ' pieces shipped.');
  const body = empty
    ? 'Ship your first post and Clara will start tracking reach, engagement, and what\u2019s working.'
    : 'See reach, top channels, and Clara\u2019s take on what\u2019s working right now.';
  const cta = empty ? 'Preview \u2192' : 'View insights \u2192';

  return `
    <button type="button" class="ov-tile ov-tile-results${empty ? ' ov-tile-results-empty' : ''}" data-nav="insights">
      <div class="ov-tile-head">
        <span class="ov-tile-label">INSIGHTS</span>
        <span class="ov-tile-arrow">\u2192</span>
      </div>
      <div class="ov-tile-title">${_escape(title)}</div>
      <div class="ov-tile-body">${_escape(body)}</div>
      <div class="ov-tile-cta">${cta}</div>
    </button>
  `;
}

// ---------------------------------------------
// Research insights (below the three tiles)
// ---------------------------------------------
//
// A static 2×2 grid of Clara-authored insights derived entirely from
// onboarding answers. Purely presentational for now — no click targets,
// no follow-through actions — but the copy is keyed on business.type,
// business.customer, business.goal and business.channels so switching
// concept gives you a different read every time.

function _renderResearchInsights(b) {
  const cards = [
    { label: 'YOUR MARKET',   color: 'var(--accent)',                text: _ovMarketInsight(b) },
    { label: 'YOUR CUSTOMER', color: 'var(--accent-secondary)',      text: _ovCustomerInsight(b) },
    { label: 'YOUR EDGE',     color: '#7C6AE8',                      text: _ovEdgeInsight(b) },
    { label: 'FIRST MOVE',    color: 'rgba(245, 166, 35, 0.7)',      text: _ovFirstMoveInsight(b) }
  ];

  const cardsHtml = cards.map(function (c) {
    return ''
      + '<div class="ov-research-card" style="--card-accent:' + c.color + '">'
      +   '<div class="ov-research-eye">' + _escape(c.label) + '</div>'
      +   '<div class="ov-research-text">' + _escape(c.text) + '</div>'
      +   '<div class="ov-research-foot">'
      +     '<span class="ov-research-foot-label">Clara\u2019s read</span>'
      +     '<span class="ov-research-foot-arrow" aria-hidden="true">\u2192</span>'
      +   '</div>'
      + '</div>';
  }).join('');

  return ''
    + '<section class="ov-research-section">'
    +   '<div class="ov-research-label">WHAT CLARA FOUND</div>'
    +   '<div class="ov-research-grid">' + cardsHtml + '</div>'
    + '</section>';
}

// --- Card 1: market gap keyed on business type ---
function _ovMarketInsight(b) {
  const t = String(b.type || '').toLowerCase();
  if (t === 'small' || t === 'food') {
    return 'Local demand is strong but most competitors are undifferentiated. The gap is trust and consistency.';
  }
  if (t === 'ecommerce') {
    return 'Online buyers are comparing 3\u20135 options before buying. The gap is clear positioning and social proof.';
  }
  if (t === 'service' || t === 'agency') {
    return 'Most service businesses win on referrals but lose on visibility. The gap is a consistent content presence.';
  }
  if (t === 'tech' || t === 'saas') {
    return 'The simple, highly specialised quadrant is the least contested. Complexity is your biggest competitor.';
  }
  if (t === 'creator') {
    return 'Authenticity beats production quality right now. The gap is showing the real person behind the brand.';
  }
  if (t === 'nonprofit') {
    return 'Donor fatigue is real. The gap is impact storytelling that feels personal, not institutional.';
  }
  return 'Your market has room for a business that communicates clearly and consistently.';
}

// --- Card 2: customer profile — always a Clara-authored type-keyed
//     description. Raw Q3 text was too uneven to display verbatim in a
//     research card ("dddvdfvdfvv" etc.), so the card now reads as
//     Clara's synthesized read of the customer, not the user's transcript.
//     Raw Q3 text still lives on business.customer for the post-onboarding
//     validation read-back and for downstream copy that needs it.
function _ovCustomerInsight(b) {
  const t = String(b.type || '').toLowerCase();
  if (t === 'food' || t === 'small') {
    return 'Local customers who value quality, consistency, and supporting businesses they trust.';
  }
  if (t === 'ecommerce') {
    return 'Online shoppers comparing options who need a clear reason to choose you over alternatives.';
  }
  if (t === 'service' || t === 'agency') {
    return 'Decision makers who prioritise reliability, clear communication, and proven results.';
  }
  if (t === 'tech') {
    return 'Professionals who want tools that work without complexity or wasted time.';
  }
  if (t === 'creator') {
    return 'Followers who want authentic access to the real person behind the brand.';
  }
  if (t === 'nonprofit') {
    return 'Donors and supporters who respond to impact stories that feel personal.';
  }
  return 'Customers who care about quality and want to feel heard and understood.';
}

// --- Card 3: competitive whitespace keyed on goal ---
function _ovEdgeInsight(b) {
  const g = String(b.goal || '').toLowerCase();
  if (g.indexOf('leads') !== -1 || g.indexOf('sales') !== -1) {
    return 'Most competitors in your space are not nurturing leads after first contact. That\u2019s your opening.';
  }
  if (g.indexOf('content') !== -1 || g.indexOf('marketing') !== -1) {
    return 'Consistent, valuable content in your niche is rare. Showing up regularly is itself a differentiator.';
  }
  if (g.indexOf('launch') !== -1) {
    return 'A well-documented launch builds an audience before you even sell. Most skip this entirely.';
  }
  if (g.indexOf('customers') !== -1 || g.indexOf('understand') !== -1) {
    return 'Businesses that actually talk to their customers outperform those that guess. You\u2019re already ahead.';
  }
  return 'Your edge is clarity. Most businesses in your space don\u2019t communicate what makes them different.';
}

// --- Card 4: first move keyed on channels first, then goal ---
function _ovFirstMoveInsight(b) {
  const channels = Array.isArray(b.channels) ? b.channels : [];
  const notMarketing = channels.length === 0 || channels.some(function (c) {
    return /not marketing/i.test(String(c || ''));
  });
  if (notMarketing) {
    return 'Start with one platform. Pick the one where your customer already spends time and post once this week.';
  }
  const has = function (needle) {
    return channels.some(function (c) { return new RegExp(needle, 'i').test(String(c || '')); });
  };
  if (has('instagram')) {
    return 'Your Instagram presence is your fastest growth lever right now. Post something real today.';
  }
  if (has('linkedin')) {
    return 'LinkedIn rewards consistency more than any other platform. One post a week compounds fast.';
  }
  const g = String(b.goal || '').toLowerCase();
  if (g.indexOf('leads') !== -1) {
    return 'Your fastest path to leads is a direct outreach message to 5 people who already know you.';
  }
  return 'Pick one channel, one message, one week. Consistency beats perfection every time.';
}

window.renderOverview = renderOverview;
// The four insight-card generators are pure functions of the business
// context, so Clara can reuse them verbatim when a chat message asks
// about "market", "customer", "edge" or "first move". Exposed as an
// object so the caller doesn't need to hard-code four separate globals.
window._ovInsights = {
  market:    _ovMarketInsight,
  customer:  _ovCustomerInsight,
  edge:      _ovEdgeInsight,
  firstMove: _ovFirstMoveInsight
};
