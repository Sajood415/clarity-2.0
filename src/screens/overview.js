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

  const preview = openTasks.slice(0, 3).map(function (t) {
    const desc = t.description.length > 80
      ? t.description.slice(0, 80).trim() + '\u2026'
      : t.description;
    return (
      '<li class="ov-task">'
      +   '<span class="ov-task-tag ov-task-tag-' + t.type.toLowerCase() + '">' + _escape(t.type) + '</span>'
      +   '<span class="ov-task-desc">' + _escape(desc) + '</span>'
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
  const cta = empty ? 'Preview \u2192' : 'View results \u2192';

  return `
    <button type="button" class="ov-tile ov-tile-results${empty ? ' ov-tile-results-empty' : ''}" data-nav="results">
      <div class="ov-tile-head">
        <span class="ov-tile-label">RESULTS</span>
        <span class="ov-tile-arrow">\u2192</span>
      </div>
      <div class="ov-tile-title">${_escape(title)}</div>
      <div class="ov-tile-body">${_escape(body)}</div>
      <div class="ov-tile-cta">${cta}</div>
    </button>
  `;
}

window.renderOverview = renderOverview;
