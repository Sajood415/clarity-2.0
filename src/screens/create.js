// ---------------------------------------------
// Clarity 2.0 — Create View
// ---------------------------------------------
//
// Step-by-step flow: ask → type → platform → angle → generate → variations
// → select → publish/draft. Everything reads/writes the active concept's
// `create` sub-state, so switching concepts preserves each one's own draft.

function _resetCreate() {
  const c = getCreate();
  c.step = null;
  c.type = null;
  c.platform = null;
  c.angle = null;
  c.variations = [];
  c.selected = null;
  c.fromTask = null;
  c.generating = false;
  c.draftSaved = false;
  c.userRequest = '';
  c.askSubmitted = false;
}

function _businessName() {
  return getBusiness().name || 'your business';
}

function _angles() {
  const name = _businessName();
  return [
    {
      id: 'authenticity',
      text: 'Show what makes ' + name + ' different. Lead with one specific detail your competitors don\u2019t have.',
      label: 'Authenticity angle'
    },
    {
      id: 'process',
      text: 'Share a behind the scenes moment from ' + name + '. People connect with process, not just results.',
      label: 'Process angle'
    },
    {
      id: 'proof',
      text: 'Post a customer story or a problem ' + name + ' solved. Real outcomes build trust faster than any claim.',
      label: 'Proof angle'
    }
  ];
}

function _makeVariations() {
  const name = _businessName();
  const c = getCreate();
  const angle = c.angle;
  const dotIdx = angle.text.indexOf('.');
  const first = dotIdx >= 0 ? angle.text.slice(0, dotIdx + 1) : angle.text;
  return [
    { id: 'A', text: 'Here\u2019s something most people don\u2019t know about ' + name + '. ' + first + ' We think that matters.' },
    { id: 'B', text: 'A quick story about why we started ' + name + '. ' + first + ' That\u2019s still our focus every day.' },
    { id: 'C', text: 'If you\u2019ve never tried ' + name + ' before, here\u2019s what to expect. ' + first + ' Come see for yourself.' }
  ];
}

function renderCreate(container) {
  const c = getCreate();
  const showFlow = !!(c.fromTask || c.askSubmitted);

  let html = '<div class="cr-wrap">';

  if (c.fromTask) {
    html += `
      <div class="cr-from-pill">From Today\u2019s plan</div>
      <div class="cr-task-preview">${_escape(c.fromTask.description)}</div>
    `;
  } else if (!c.askSubmitted) {
    html += `
      <h1 class="cr-ask-heading">What do you want to make?</h1>
      <p class="cr-ask-sub">Tell Clara what you need.</p>
      <div class="cr-ask-wrap">
        <textarea class="cr-ask-input" id="crAskInput" placeholder="e.g. I want to post about our new weekend menu"></textarea>
        <button class="cr-ask-btn" id="crAskBtn">Ask Clara \u2192</button>
      </div>
    `;
  }

  if (showFlow) {
    html += `
      <div class="cr-section-label">What type of content?</div>
      <div class="cr-type-grid">
        ${_typeTileHtml('post', 'Post', 'Written post')}
        ${_typeTileHtml('image', 'Image', 'Photo or graphic')}
        ${_typeTileHtml('video', 'Video', 'Short video')}
        ${_typeTileHtml('audio', 'Audio', 'Podcast or voice')}
      </div>
    `;
  }

  if (c.type) {
    const platforms = [
      { key: 'instagram', label: 'Instagram' },
      { key: 'linkedin', label: 'LinkedIn' },
      { key: 'facebook', label: 'Facebook' },
      { key: 'email', label: 'Email' }
    ];
    html += `
      <div class="cr-section-label cr-section-label-spaced">Where are you posting?</div>
      <div class="cr-platform-row">
        ${platforms.map(function (p) {
          const active = c.platform === p.key ? ' cr-platform-chip-active' : '';
          return '<button type="button" class="cr-platform-chip' + active + '" data-platform="' + p.key + '">' + p.label + '</button>';
        }).join('')}
      </div>
    `;
  }

  if (c.platform) {
    const angles = _angles();
    html += `
      <div class="cr-section-label cr-section-label-spaced">Pick your angle</div>
      <p class="cr-angle-sub">Clara prepared these based on your business.</p>
      <div class="cr-angle-cards">
        ${angles.map(function (a) {
          const active = c.angle && c.angle.id === a.id ? ' cr-angle-card-active' : '';
          return `
            <div class="cr-angle-card${active}" data-angle="${a.id}">
              <div class="cr-angle-text">${_escape(a.text)}</div>
              <div class="cr-angle-label">${a.label}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  if (c.selected) {
    if (c.draftSaved) {
      html += '<div class="cr-draft-saved">Saved as draft</div>';
    } else {
      html += `
        <div class="cr-publish-preview">
          <div class="cr-variation-label">VARIATION ${_escape(c.selected.id)}</div>
          <div class="cr-variation-text">${_escape(c.selected.text)}</div>
        </div>
        <div class="cr-publish-options">
          <button type="button" class="cr-publish-btn" id="crPublishBtn">Publish now</button>
          <button type="button" class="cr-publish-draft" id="crDraftBtn">Save as draft</button>
          <button type="button" class="cr-publish-reset" id="crResetBtn">Start over</button>
        </div>
      `;
    }
  } else if (c.variations && c.variations.length) {
    html += `
      <h2 class="cr-variations-heading">Pick one to publish</h2>
      <div class="cr-variations">
        ${c.variations.map(function (v) {
          return `
            <div class="cr-variation-card" data-variation="${v.id}">
              <div class="cr-variation-label">VARIATION ${v.id}</div>
              <div class="cr-variation-text">${_escape(v.text)}</div>
              <span class="cr-variation-select">Select this \u2192</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (c.generating) {
    html += `
      <div class="cr-loading">
        <span class="cl-thinking-dots">
          <span class="cl-dot"></span>
          <span class="cl-dot"></span>
          <span class="cl-dot"></span>
        </span>
        <div class="cr-loading-label">Clara is creating your variations...</div>
      </div>
    `;
  } else if (c.angle) {
    html += '<button type="button" class="cr-generate-btn" id="crGenerateBtn">Generate \u2192</button>';
  }

  html += '</div>';
  container.innerHTML = html;

  _bindCreateEvents();
}

function _typeTileHtml(key, title, sub) {
  const active = getCreate().type === key ? ' cr-type-tile-active' : '';
  return `
    <button type="button" class="cr-type-tile${active}" data-type="${key}">
      <div class="cr-type-icon">${CREATE_TYPE_ICONS[key]}</div>
      <div class="cr-type-title">${title}</div>
      <div class="cr-type-sub">${sub}</div>
    </button>
  `;
}

function _bindCreateEvents() {
  const askBtn = document.getElementById('crAskBtn');
  const askInput = document.getElementById('crAskInput');
  if (askBtn && askInput) {
    askInput.focus();
    askBtn.addEventListener('click', _handleAskSubmit);
    askInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        _handleAskSubmit();
      }
    });
  }

  document.querySelectorAll('.cr-type-tile').forEach(function (el) {
    el.addEventListener('click', function () {
      getCreate().type = el.getAttribute('data-type');
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  });

  document.querySelectorAll('.cr-platform-chip').forEach(function (el) {
    el.addEventListener('click', function () {
      getCreate().platform = el.getAttribute('data-platform');
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  });

  document.querySelectorAll('.cr-angle-card').forEach(function (el) {
    el.addEventListener('click', function () {
      const id = el.getAttribute('data-angle');
      const found = _angles().find(function (a) { return a.id === id; });
      getCreate().angle = found;
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  });

  const gen = document.getElementById('crGenerateBtn');
  if (gen) {
    gen.addEventListener('click', function () {
      const c = getCreate();
      c.generating = true;
      _saveState();
      renderCreate(document.getElementById('homeContent'));
      setTimeout(function () {
        const c2 = getCreate();
        c2.generating = false;
        c2.variations = _makeVariations();
        _saveState();
        renderCreate(document.getElementById('homeContent'));
      }, 2000);
    });
  }

  document.querySelectorAll('.cr-variation-card').forEach(function (el) {
    el.addEventListener('click', function () {
      const id = el.getAttribute('data-variation');
      const c = getCreate();
      const v = (c.variations || []).find(function (x) { return x.id === id; });
      if (!v) return;
      c.selected = v;
      c.step = 'publish';
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  });

  const publishBtn = document.getElementById('crPublishBtn');
  if (publishBtn) {
    publishBtn.addEventListener('click', function () {
      _pushResultItem('published');
      _resetCreate();
      appState.activeView = 'results';
      _saveState();
      renderApp();
    });
  }

  const draftBtn = document.getElementById('crDraftBtn');
  if (draftBtn) {
    draftBtn.addEventListener('click', function () {
      _pushResultItem('draft');
      getCreate().draftSaved = true;
      _saveState();
      renderCreate(document.getElementById('homeContent'));
      setTimeout(function () {
        _resetCreate();
        _saveState();
        renderCreate(document.getElementById('homeContent'));
      }, 2000);
    });
  }

  const resetBtn = document.getElementById('crResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      _resetCreate();
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  }
}

function _handleAskSubmit() {
  const input = document.getElementById('crAskInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const c = getCreate();
  c.userRequest = text;
  c.askSubmitted = true;
  _saveState();
  renderCreate(document.getElementById('homeContent'));
}

function _pushResultItem(status) {
  const c = getCreate();
  const item = {
    id: 'item-' + Date.now(),
    type: c.type,
    platform: c.platform,
    angle: c.angle,
    variation: c.selected ? c.selected.text : '',
    timestamp: Date.now(),
    reach: 0,
    status: status
  };
  getResults().items.push(item);
}

window.renderCreate = renderCreate;
window._resetCreate = _resetCreate;
