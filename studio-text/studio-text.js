/* Studio: Text — mockup module (library, wizard, post editor) */
var StudioText = (function () {
  var ST_PLATFORMS = [
    { id: 'LinkedIn', icon: 'in', desc: 'Posts, articles, polls' },
    { id: 'Instagram', icon: '📷', desc: 'Captions, carousel, stories' },
    { id: 'X', icon: '𝕏', desc: 'Tweets and threads' },
    { id: 'Email', icon: '✉', desc: 'Subject lines, newsletters' },
    { id: 'Threads', icon: '@', desc: 'Community posts' },
    { id: 'TikTok', icon: '♪', desc: 'Caption text' }
  ];
  var ST_FORMATS = {
    LinkedIn: [{ id: 'Post', limit: '1,300 chars' }, { id: 'Article', limit: '125,000 chars' }, { id: 'Poll', limit: '140 chars' }],
    Instagram: [{ id: 'Caption', limit: '2,200 chars' }, { id: 'Carousel text', limit: '2,200 chars/slide' }, { id: 'Story text', limit: '220 chars' }],
    X: [{ id: 'Single tweet', limit: '280 chars' }, { id: 'Thread', limit: '280 chars/tweet' }],
    Email: [{ id: 'Subject + preview', limit: '60 + 140 chars' }, { id: 'Newsletter block', limit: 'No limit' }],
    Threads: [{ id: 'Post', limit: '500 chars' }],
    TikTok: [{ id: 'Caption', limit: '2,200 chars' }]
  };
  var ST_VARIATIONS = [
    { label: 'A', pf: 81, text: 'While ghost kitchens rise and fall, artisan baking keeps winning. Patience isn\'t a trend — it\'s the moat. Our 72-hour cold ferment isn\'t marketing. It\'s the reason customers drive across town on Saturday mornings.' },
    { label: 'B', pf: 88, text: 'Hot take: the best food businesses aren\'t chasing trends — they\'re outlasting them.\n\nWe\'ve watched 68% of food-tech startups shutter since 2023. Meanwhile, bakeries focused on craft grew 14% CAGR.\n\nSourdough Saturday is back. Pre-orders open now. 🍞' },
    { label: 'C', pf: 74, text: 'Every Saturday, the same ritual: flour, water, time. No shortcuts. No ghost kitchen playbook. Just bread worth waiting for. Sourdough Saturday pre-orders are live — link in bio.' }
  ];
  var DEFAULT_POSTS = [
    { id: 'p1', platform: 'LinkedIn', icon: 'in', format: 'Post', preview: 'Why artisan baking outlasts every food trend — while ghost kitchens rise and fall, the craft that shaped civilization keeps winning.', body: 'Why artisan baking outlasts every food trend.\n\nWhile ghost kitchens rise and fall, the craft that shaped civilization keeps winning. Here\'s why patience is the ultimate competitive moat.\n\nIn 2023, venture capitalists poured $2.1B into food-tech startups. By 2025, 68% had shuttered. Meanwhile, artisan food businesses quietly grew revenue at 14% CAGR.', status: 'Draft', pf: 81, date: '2d ago' },
    { id: 'p2', platform: 'Instagram', icon: '📷', format: 'Caption', preview: 'Sourdough Saturday is back — pre-orders open. 72-hour cold ferment, stone-baked, limited batch.', body: 'Sourdough Saturday is back — pre-orders open 🍞\n\n72-hour cold ferment. Stone-baked. Limited batch.\n\nLink in bio to reserve yours before they\'re gone.', status: 'Published', pf: 88, date: '5d ago' },
    { id: 'p3', platform: 'X', icon: '𝕏', format: 'Thread', preview: 'Thread: 5 signs your sourdough starter is ready — bubble activity, smell, rise pattern, and more.', body: '🧵 5 signs your sourdough starter is ready:\n\n1. Bubbles throughout (not just on top)\n2. Doubles in 4–6 hours at room temp\n3. Smells fruity, not like nail polish\n4. Passes the float test\n5. Consistent rise across 3+ feeds', status: 'Draft', pf: 55, date: '1d ago' },
    { id: 'p4', platform: 'Email', icon: '✉', format: 'Subject', preview: 'Thursday pre-order drop — your favorites are back in stock this week only.', body: 'Subject: Thursday pre-order drop — favorites back in stock\n\nPreview: Seeded sourdough, olive focaccia, and cinnamon rolls return this week only. Pre-order by Wednesday 6pm.', status: 'Scheduled', pf: 87, date: '3d ago' },
    { id: 'p5', platform: 'LinkedIn', icon: 'in', format: 'Post', preview: 'Moving from custom client work to self-serve SaaS — lessons from 18 months of transition.', body: 'Moving from custom client work to self-serve SaaS — lessons from 18 months of transition.\n\nThe hardest part wasn\'t the product. It was unlearning the agency mindset: saying yes to everything, pricing by the hour, delivering bespoke for every client.', status: 'In Review', pf: 92, date: '6h ago' },
    { id: 'p6', platform: 'Threads', icon: '@', format: 'Post', preview: 'Behind the scenes: 4am bake routine. Flour dust, steam, and the quiet before the morning rush.', body: 'Behind the scenes: 4am bake routine.\n\nFlour dust. Steam. The quiet before the morning rush.\n\nThis is when the bread that lands on your table actually gets made.', status: 'Draft', pf: 76, date: '4d ago' }
  ];

  function stPfClass(pf) { return pf >= 70 ? 'green' : pf >= 40 ? 'amber' : 'red'; }
  function stStatusPill(status) {
    var map = { Draft: 'pill-muted', Published: 'pill-green', Scheduled: 'pill-indigo', 'In Review': 'pill-amber' };
    return map[status] || 'pill-muted';
  }
  function stGetPost(id) {
    return appState.stPosts.filter(function (p) { return p.id === id; })[0] || null;
  }
  function stPlatformIcon(platform) {
    var match = ST_PLATFORMS.filter(function (p) { return p.id === platform; })[0];
    return match ? match.icon : 'in';
  }

  function init(state) {
    state.studioTextWizardStep = 0;
    state.stSelectedPostId = null;
    state.stEditing = false;
    state.stPrefDrawerOpen = false;
    state.stToast = null;
    state.stFilters = { search: '', platform: 'All', status: 'All', type: 'All' };
    state.stPrefs = { platform: 'LinkedIn', tones: ['Professional'], persona: 'Maya Holloway', brandVoice: 'Hearth Bakery' };
    state.stWizard = {
      platform: null, format: null, topic: 'Thought leadership',
      prompt: '', tones: ['Professional'], persona: 'Maya Holloway',
      ctaEnabled: false, cta: 'Learn more', hashtagsAuto: true, customHashtags: '',
      variation: null, generating: false, reviewText: ''
    };
    state.stPosts = [];
    state.stEditorRailTab = 'insights';
    state.stEditorAiPrompt = '';
    state.stLiveMetrics = null;
    state.stEditorBrief = {
      audience: 'Local food enthusiasts, 28–45',
      goal: 'Drive weekend pre-orders',
      tone: 'Warm, authentic, craft-focused',
      channel: '',
      notes: ''
    };
  }

  function stComputeLiveMetrics(text, post) {
    var len = text ? text.length : 0;
    var base = (post && post.pf) || 70;
    var pf = len < 8 ? Math.max(35, base - 25) : Math.min(98, Math.max(40, base - 8 + Math.floor(len / 18)));
    return {
      pf: pf,
      personas: [
        { name: 'Maya Holloway', seg: 'Enterprise CMO', fit: Math.min(96, pf + 4) },
        { name: 'Alex Rivera', seg: 'Growth-stage founder', fit: Math.min(92, pf - 6) },
        { name: 'Marcus, 45', seg: 'Feature-first adopter', fit: Math.min(88, pf - 12) }
      ],
      keywords: len > 24 ? ['artisan', 'sourdough', 'craft'].concat(len > 90 ? ['community', 'ferment'] : []) : [],
      engagement: pf >= 82 ? 'High' : pf >= 62 ? 'Medium' : 'Low',
      ctr: (pf / 28).toFixed(1) + '%',
      resonance: Math.min(98, pf + 3),
      voice: Math.min(98, pf + 6),
      format: Math.min(98, pf - 2),
      timing: Math.min(98, pf - 9)
    };
  }

  function stWordCount(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }

  function stReadMins(text) {
    var w = stWordCount(text);
    return Math.max(1, Math.ceil(w / 200));
  }

  function stPatchLiveInsights(m, charCount, post) {
    var limit = post.platform === 'X' ? 280 : 1300;
    var compCls = charCount <= limit ? 'ok' : 'fail';
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    var setHtml = function (id, val) { var el = document.getElementById(id); if (el) el.innerHTML = val; };
    set('st-live-pf', m.pf);
    set('st-word-count', stWordCount(post.body || ''));
    set('st-read-mins', stReadMins(post.body || ''));
    set('st-engagement-level', m.engagement);
    set('st-ctr-val', m.ctr);
    var pfChip = document.getElementById('st-live-pf-chip');
    if (pfChip) {
      pfChip.className = 'pf-chip ' + stPfClass(m.pf);
      pfChip.innerHTML = '<span class="pf-chip-dot"></span>' + m.pf + ' PF';
    }
    var comp = document.getElementById('st-char-compliance');
    if (comp) {
      comp.className = 'ch-compliance ' + compCls;
      comp.textContent = post.platform + ': ' + charCount + '/' + limit + ' chars ' + (compCls === 'ok' ? '✓' : '✗');
    }
    m.personas.forEach(function (p, i) {
      var bar = document.getElementById('st-persona-bar-' + i);
      var val = document.getElementById('st-persona-val-' + i);
      if (bar) bar.style.width = p.fit + '%';
      if (val) val.textContent = p.fit + '% fit';
    });
    [['st-dim-resonance', m.resonance], ['st-dim-voice', m.voice], ['st-dim-format', m.format], ['st-dim-timing', m.timing]].forEach(function (d) {
      var bar = document.getElementById(d[0]);
      if (bar) bar.style.width = d[1] + '%';
    });
    var kwWrap = document.getElementById('st-keywords-wrap');
    if (kwWrap) {
      kwWrap.innerHTML = m.keywords.length
        ? m.keywords.map(function (k) { return '<span class="st-kw-chip">' + k + '</span>'; }).join('')
        : '<span class="st-kw-empty">Start writing to surface keywords</span>';
    }
  }

  window.stOpenPrefs = function () { appState.stPrefDrawerOpen = true; renderContent(); };
  window.stClosePrefs = function () { appState.stPrefDrawerOpen = false; renderContent(); };
  window.stOpenPost = function (id) {
    appState.stSelectedPostId = id;
    appState.stEditing = false;
    appState.studioTextWizardStep = 0;
    renderContent();
  };
  window.stOpenEditor = function () {
    appState.stEditing = true;
    appState.stEditorRailTab = 'insights';
    var post = stGetPost(appState.stSelectedPostId);
    if (post) {
      appState.stEditorBrief.channel = post.platform + ', ' + post.format;
      appState.stLiveMetrics = stComputeLiveMetrics(post.body || post.preview, post);
    }
    renderContent();
  };
  window.stBackFromEditor = function () {
    appState.stEditing = false;
    renderContent();
  };
  window.stClosePost = function () {
    appState.stSelectedPostId = null;
    appState.stEditing = false;
    renderContent();
  };
  window.stStartWizard = function () {
    appState.stSelectedPostId = null;
    var w = appState.stWizard;
    var brief = appState.createBrief || {};
    w.platform = appState.stPrefs.platform || 'LinkedIn';
    w.format = ST_FORMATS[w.platform] ? ST_FORMATS[w.platform][0].id : null;
    w.topic = brief.goal || 'Thought leadership';
    w.prompt = brief.message || '';
    w.tones = appState.stPrefs.tones.slice();
    w.persona = brief.persona || appState.stPrefs.persona;
    w.ctaEnabled = false;
    w.cta = 'Learn more';
    w.hashtagsAuto = true;
    w.customHashtags = '';
    w.variation = null;
    w.generating = false;
    w.reviewText = '';
    appState.studioTextWizardStep = 1;
    renderContent();
  };
  window.stBackToLibrary = function () {
    appState.studioTextWizardStep = 0;
    appState.stSelectedPostId = null;
    appState.stEditing = false;
    nav('create-home');
  };
  window.stSelectPlatform = function (id) {
    appState.stWizard.platform = id;
    appState.stWizard.format = ST_FORMATS[id][0].id;
    renderContent();
  };
  window.stSelectFormatIndex = function (idx) {
    var w = appState.stWizard;
    var formats = ST_FORMATS[w.platform] || ST_FORMATS.LinkedIn;
    var f = formats[idx];
    if (!f) return;
    w.format = f.id;
    renderContent();
  };
  window.stToggleTone = function (tone) {
    var tones = appState.stWizard.tones;
    var i = tones.indexOf(tone);
    if (i >= 0) { if (tones.length > 1) tones.splice(i, 1); }
    else { tones.push(tone); }
    renderContent();
  };
  var stSearchTimer;
  window.stSetFilter = function (key, val) {
    appState.stFilters[key] = val;
    if (key === 'search') {
      clearTimeout(stSearchTimer);
      stSearchTimer = setTimeout(renderContent, 250);
      return;
    }
    renderContent();
  };
  window.stSetWizardField = function (key, val) {
    appState.stWizard[key] = val;
    if (key === 'ctaEnabled' || key === 'hashtagsAuto') renderContent();
  };
  window.stSelectVariation = function (idx) {
    appState.stWizard.variation = idx;
    appState.stWizard.reviewText = ST_VARIATIONS[idx].text;
    renderContent();
  };
  window.stUpdatePostBody = function (text) {
    var post = stGetPost(appState.stSelectedPostId);
    if (post) {
      post.body = text;
      post.preview = text.substring(0, 80) + (text.length > 80 ? '…' : '');
      post.pf = stComputeLiveMetrics(text, post).pf;
    }
  };
  window.stOnEditorInput = function (el) {
    var text = el.innerText || '';
    stUpdatePostBody(text);
    var post = stGetPost(appState.stSelectedPostId);
    if (!post) return;
    var m = stComputeLiveMetrics(text, post);
    appState.stLiveMetrics = m;
    stPatchLiveInsights(m, text.length, post);
  };
  window.stSetEditorRailTab = function (tab) {
    appState.stEditorRailTab = tab;
    renderContent();
  };
  window.stAiAction = function (label) {
    appState.stToast = label + ' applied';
    renderContent();
    setTimeout(function () { appState.stToast = null; renderContent(); }, 2200);
  };
  window.stWizardBack = function () {
    var step = appState.studioTextWizardStep;
    if (step <= 1) { stBackToLibrary(); return; }
    if (step === 4) appState.stWizard.generating = false;
    appState.studioTextWizardStep = step - 1;
    renderContent();
  };
  window.stWizardContinue = function () {
    var step = appState.studioTextWizardStep;
    var w = appState.stWizard;
    if (step === 1 && !w.platform) return;
    if (step === 2 && !w.format) return;
    if (step === 4 && w.variation === null) return;
    if (step === 3) {
      appState.studioTextWizardStep = 4;
      w.generating = true;
      w.variation = null;
      renderContent();
      setTimeout(function () {
        appState.stWizard.generating = false;
        renderContent();
      }, 1500);
      return;
    }
    if (step === 4 && w.variation !== null) {
      appState.studioTextWizardStep = 5;
      renderContent();
      return;
    }
    appState.studioTextWizardStep = step + 1;
    renderContent();
  };
  window.stRegenerate = function () {
    appState.stWizard.generating = true;
    appState.stWizard.variation = null;
    renderContent();
    setTimeout(function () {
      appState.stWizard.generating = false;
      renderContent();
    }, 1500);
  };
  window.stPublish = function () {
    var w = appState.stWizard;
    var pf = w.variation !== null ? ST_VARIATIONS[w.variation].pf : 88;
    var text = w.reviewText || ST_VARIATIONS[w.variation !== null ? w.variation : 1].text;
    appState.stPosts.unshift({
      id: 'p' + Date.now(),
      platform: w.platform || 'LinkedIn',
      icon: stPlatformIcon(w.platform),
      format: w.format || 'Post',
      preview: text.substring(0, 80),
      body: text,
      status: 'Scheduled',
      pf: pf,
      date: 'Just now'
    });
    appState.studioTextWizardStep = 0;
    appState.stToast = 'Post scheduled for Thu 10am';
    renderContent();
    setTimeout(function () { appState.stToast = null; renderContent(); }, 2800);
  };
  window.stSaveDraft = function () {
    var w = appState.stWizard;
    var pf = w.variation !== null ? ST_VARIATIONS[w.variation].pf : 88;
    var text = w.reviewText || ST_VARIATIONS[w.variation !== null ? w.variation : 1].text;
    appState.stPosts.unshift({
      id: 'p' + Date.now(),
      platform: w.platform || 'LinkedIn',
      icon: stPlatformIcon(w.platform),
      format: w.format || 'Post',
      preview: text.substring(0, 80),
      body: text,
      status: 'Draft',
      pf: pf,
      date: 'Just now'
    });
    appState.studioTextWizardStep = 0;
    appState.stToast = 'Draft saved';
    renderContent();
    setTimeout(function () { appState.stToast = null; renderContent(); }, 2800);
  };

  function stFilteredPosts() {
    var f = appState.stFilters;
    return appState.stPosts.filter(function (p) {
      if (f.search && p.preview.toLowerCase().indexOf(f.search.toLowerCase()) < 0 && p.platform.toLowerCase().indexOf(f.search.toLowerCase()) < 0) return false;
      if (f.platform !== 'All' && p.platform !== f.platform) return false;
      if (f.status !== 'All' && p.status !== f.status) return false;
      if (f.type !== 'All' && p.format !== f.type) return false;
      return true;
    });
  }

  function renderStudioTextStepper() {
    var step = appState.studioTextWizardStep;
    var labels = ['Platform', 'Format', 'Brief', 'Generate', 'Review'];
    var html = '<div class="st-wizard-steps-wrap"><div class="wizard-steps" style="justify-content:center;">';
    labels.forEach(function (lbl, i) {
      var n = i + 1;
      var cls = n < step ? 'done' : n === step ? 'active' : 'pending';
      html += '<div class="wizard-step" style="position:relative;flex-direction:column;align-items:center;">'
        + '<div class="wiz-dot ' + cls + '">' + (n < step ? '✓' : n) + '</div>'
        + '<div class="wiz-label">' + lbl + '</div></div>';
      if (i < labels.length - 1) html += '<div class="wiz-line' + (n < step ? ' done' : '') + '"></div>';
    });
    return html + '</div></div>';
  }

  function renderStudioTextPrefDrawer() {
    var open = appState.stPrefDrawerOpen;
    var p = appState.stPrefs;
    var tones = ['Professional', 'Warm', 'Bold', 'Educational', 'Playful'];
    return '<div class="pref-drawer-overlay' + (open ? ' open' : '') + '" onclick="stClosePrefs()"></div>'
      + '<div class="pref-drawer' + (open ? ' open' : '') + '">'
      + '<div class="pref-drawer-header"><span class="pref-drawer-title">Content Preferences</span><span class="modal-close" onclick="stClosePrefs()">&#x2715;</span></div>'
      + '<div class="pref-drawer-body">'
      + '<div class="st-form-field"><label>Default platform</label><select class="st-form-select" onchange="appState.stPrefs.platform=this.value">'
      + ST_PLATFORMS.map(function (pl) { return '<option' + (p.platform === pl.id ? ' selected' : '') + '>' + pl.id + '</option>'; }).join('')
      + '</select></div>'
      + '<div class="st-form-field"><label>Default tone</label><div class="tone-chip-row">'
      + tones.map(function (t) {
          return '<span class="tone-chip' + (p.tones.indexOf(t) >= 0 ? ' active' : '') + '" onclick="var i=appState.stPrefs.tones.indexOf(\'' + t + '\');if(i>=0){if(appState.stPrefs.tones.length>1)appState.stPrefs.tones.splice(i,1);}else appState.stPrefs.tones.push(\'' + t + '\');renderContent();">' + t + '</span>';
        }).join('')
      + '</div></div>'
      + '<div class="st-form-field"><label>Default persona</label><select class="st-form-select" onchange="appState.stPrefs.persona=this.value;renderContent();">'
      + ['Maya Holloway', 'Alex Rivera', 'All segments'].map(function (x) { return '<option' + (p.persona === x ? ' selected' : '') + '>' + x + '</option>'; }).join('')
      + '</select></div>'
      + '<div class="st-form-field"><label>Brand voice profile</label><select class="st-form-select" onchange="appState.stPrefs.brandVoice=this.value;renderContent();">'
      + ['Hearth Bakery', 'Clarity SaaS', 'Custom'].map(function (x) { return '<option' + (p.brandVoice === x ? ' selected' : '') + '>' + x + '</option>'; }).join('')
      + '</select></div>'
      + '<button class="btn btn-primary" style="margin-top:8px;" onclick="stClosePrefs()">Save preferences</button>'
      + '</div></div>';
  }

  function renderStudioTextLibrary() {
    var f = appState.stFilters;
    var posts = stFilteredPosts();
    var cards = posts.map(function (p) {
      return '<div class="post-card" onclick="stOpenPost(\'' + p.id + '\')">'
        + '<div class="post-card-head"><span class="post-card-platform">' + p.icon + ' ' + p.platform + '</span><span class="tag">' + p.format + '</span></div>'
        + '<div class="post-card-preview">' + p.preview + '</div>'
        + '<div class="post-card-foot">'
        + '<span class="pill ' + stStatusPill(p.status) + '">' + p.status + '</span>'
        + '<span class="pf-chip ' + stPfClass(p.pf) + '"><span class="pf-chip-dot"></span>' + p.pf + ' PF</span>'
        + '<span class="mono" style="color:var(--muted);">' + p.date + '</span>'
        + '</div></div>';
    }).join('');

    return '<div>'
      + '<div class="flex-between" style="margin-bottom:20px;">'
      + '<div><h2 style="font-size:18px;font-weight:600;">My Posts</h2><p class="screen-sub">Hearth Bakery · Maker agent · Social text content</p></div>'
      + '<div style="display:flex;gap:8px;">'
      + '<button class="btn btn-outline btn-sm" onclick="stOpenPrefs()" title="Preferences">&#9881; Preferences</button>'
      + '<button class="btn btn-primary btn-sm" onclick="stStartWizard()">+ Create Post</button>'
      + '</div></div>'
      + '<div class="st-filter-bar">'
      + '<input class="st-search" placeholder="Search posts..." value="' + (f.search || '') + '" oninput="stSetFilter(\'search\',this.value)">'
      + '<select class="st-filter-select" onchange="stSetFilter(\'platform\',this.value)">'
      + ['All', 'LinkedIn', 'Instagram', 'X', 'Email', 'Threads'].map(function (x) { return '<option' + (f.platform === x ? ' selected' : '') + '>' + x + '</option>'; }).join('')
      + '</select>'
      + '<select class="st-filter-select" onchange="stSetFilter(\'status\',this.value)">'
      + ['All', 'Draft', 'Published', 'Scheduled', 'In Review'].map(function (x) { return '<option' + (f.status === x ? ' selected' : '') + '>' + x + '</option>'; }).join('')
      + '</select>'
      + '<select class="st-filter-select" onchange="stSetFilter(\'type\',this.value)">'
      + ['All', 'Post', 'Caption', 'Thread', 'Subject'].map(function (x) { return '<option' + (f.type === x ? ' selected' : '') + '>' + x + '</option>'; }).join('')
      + '</select></div>'
      + (posts.length ? '<div class="post-card-grid">' + cards + '</div>' : '<div class="st-empty-hint">No posts match your filters.</div>')
      + renderStudioTextPrefDrawer()
      + '</div>';
  }

  function renderStudioTextWizardStep1() {
    var w = appState.stWizard;
    return '<div class="label">Choose platform</div><p style="font-size:13px;color:var(--muted);margin-bottom:16px;">Where will this post be published?</p>'
      + '<div class="platform-tile-grid">'
      + ST_PLATFORMS.map(function (p) {
          return '<div class="platform-tile' + (w.platform === p.id ? ' active' : '') + '" onclick="stSelectPlatform(\'' + p.id + '\')">'
            + '<div class="platform-tile-icon">' + p.icon + '</div>'
            + '<div class="platform-tile-name">' + p.id + '</div>'
            + '<div class="platform-tile-desc">' + p.desc + '</div></div>';
        }).join('')
      + '</div>';
  }

  function renderStudioTextWizardStep2() {
    var w = appState.stWizard;
    var formats = ST_FORMATS[w.platform] || ST_FORMATS.LinkedIn;
    var selected = formats.filter(function (f) { return f.id === w.format; })[0] || formats[0];
    return '<div class="label">Format & size</div><p style="font-size:13px;color:var(--muted);margin-bottom:16px;">Auto-suggested for ' + w.platform + '. Override if needed.</p>'
      + '<div class="format-chip-row">'
      + formats.map(function (f, idx) {
          return '<span class="format-chip' + (w.format === f.id ? ' active' : '') + '" onclick="stSelectFormatIndex(' + idx + ')">' + f.id + '</span>';
        }).join('')
      + '</div>'
      + '<div class="format-hint">&#10003; ' + selected.id + ' · Limit: ' + selected.limit + '</div>';
  }

  function renderStudioTextWizardStep3() {
    var w = appState.stWizard;
    var p = appState.stPrefs;
    var tones = ['Professional', 'Warm', 'Bold', 'Educational', 'Playful'];
    return '<div class="pref-bar"><span>&#9881;</span><span>Using: <strong>' + w.tones.join(', ') + '</strong> tone · <strong>' + p.brandVoice + '</strong> voice · <strong>' + w.persona.split(' ')[0] + '</strong> persona</span>'
      + '<span class="pref-bar-edit" onclick="stOpenPrefs()">Edit defaults</span></div>'
      + '<div class="st-brief-form">'
      + '<div class="st-form-field"><label>Topic angle</label><select class="st-form-select" onchange="stSetWizardField(\'topic\',this.value)">'
      + ['Thought leadership', 'Product launch', 'Promo', 'Community', 'Educational'].map(function (t) { return '<option' + (w.topic === t ? ' selected' : '') + '>' + t + '</option>'; }).join('')
      + '</select></div>'
      + '<div class="st-form-field"><label>What should it say?</label><textarea class="st-form-textarea" placeholder="Describe your post in plain English…" oninput="appState.stWizard.prompt=this.value">' + (w.prompt || '') + '</textarea></div>'
      + '<div class="st-form-field"><label>Tone</label><div class="tone-chip-row">'
      + tones.map(function (t) { return '<span class="tone-chip' + (w.tones.indexOf(t) >= 0 ? ' active' : '') + '" onclick="stToggleTone(\'' + t + '\')">' + t + '</span>'; }).join('')
      + '</div></div>'
      + '<div class="st-form-field"><label>Target persona</label><select class="st-form-select" onchange="stSetWizardField(\'persona\',this.value)">'
      + ['Maya Holloway', 'Alex Rivera', 'All segments'].map(function (x) { return '<option' + (w.persona === x ? ' selected' : '') + '>' + x + '</option>'; }).join('')
      + '</select></div>'
      + '<div class="st-form-field"><label>Include CTA?</label><div style="display:flex;align-items:center;gap:12px;margin-top:4px;">'
      + '<div class="toggle-sw' + (w.ctaEnabled ? ' on' : '') + '" onclick="stSetWizardField(\'ctaEnabled\',!appState.stWizard.ctaEnabled)"><div class="toggle-knob"></div></div>'
      + (w.ctaEnabled ? '<select class="st-form-select" style="width:auto;flex:1;" onchange="stSetWizardField(\'cta\',this.value)">'
        + ['Shop now', 'Learn more', 'Sign up', 'Book a call'].map(function (c) { return '<option' + (w.cta === c ? ' selected' : '') + '>' + c + '</option>'; }).join('')
        + '</select>' : '<span style="font-size:12px;color:var(--muted);">No call-to-action</span>')
      + '</div></div>'
      + '<div class="st-form-field"><label>Hashtags</label><div style="display:flex;align-items:center;gap:12px;margin-top:4px;">'
      + '<div class="toggle-sw' + (w.hashtagsAuto ? ' on' : '') + '" onclick="stSetWizardField(\'hashtagsAuto\',!appState.stWizard.hashtagsAuto)"><div class="toggle-knob"></div></div>'
      + '<span style="font-size:12px;color:var(--muted);">Auto-suggest hashtags</span></div>'
      + (!w.hashtagsAuto ? '<input class="st-form-input" style="margin-top:8px;" placeholder="#sourdough #artisan #bakery" value="' + (w.customHashtags || '') + '" oninput="appState.stWizard.customHashtags=this.value">' : '')
      + '</div></div>'
      + renderStudioTextPrefDrawer();
  }

  function renderStudioTextWizardStep4() {
    var w = appState.stWizard;
    if (w.generating) {
      return '<div class="st-generating"><div class="st-spinner"></div><div style="font-size:14px;color:var(--text);">Maker is generating variations…</div><div style="font-size:12px;color:var(--muted);">Scoring against ' + w.persona + ' persona</div></div>';
    }
    return '<div class="label">Pick a variation</div><p style="font-size:13px;color:var(--muted);margin-bottom:16px;">3 options scored for persona fit. Select one to continue.</p>'
      + '<div class="variation-grid">'
      + ST_VARIATIONS.map(function (v, i) {
          return '<div class="variation-card' + (w.variation === i ? ' selected' : '') + '" onclick="stSelectVariation(' + i + ')">'
            + '<div class="flex-between"><span style="font-weight:600;font-size:13px;">Variation ' + v.label + '</span>'
            + '<span class="pf-chip ' + stPfClass(v.pf) + '"><span class="pf-chip-dot"></span>' + v.pf + ' PF' + (v.pf >= 85 ? ' ★' : '') + '</span></div>'
            + '<div class="variation-card-text">' + v.text.replace(/\n/g, '<br>') + '</div>'
            + '<button class="btn btn-outline btn-sm" style="width:100%;" onclick="event.stopPropagation();stSelectVariation(' + i + ')">' + (w.variation === i ? 'Selected ✓' : 'Select') + '</button>'
            + '</div>';
        }).join('')
      + '</div>'
      + '<button class="btn btn-ghost btn-sm" onclick="stRegenerate()">↻ Regenerate variations</button>';
  }

  function renderStudioTextWizardStep5() {
    var w = appState.stWizard;
    var text = w.reviewText || (w.variation !== null ? ST_VARIATIONS[w.variation].text : ST_VARIATIONS[1].text);
    var pf = w.variation !== null ? ST_VARIATIONS[w.variation].pf : 88;
    var charCount = text.length;
    var limit = 1300;
    var compCls = charCount <= limit ? 'ok' : 'fail';
    return '<div class="st-review-layout">'
      + '<div class="platform-preview">'
      + '<div class="platform-preview-header">'
      + '<div class="platform-preview-avatar">HB</div>'
      + '<div class="platform-preview-meta"><div class="platform-preview-name">Hearth Bakery</div><div class="platform-preview-sub">' + w.platform + ' · ' + w.format + ' · Now</div></div>'
      + '</div>'
      + '<div class="platform-preview-body" contenteditable="true" oninput="appState.stWizard.reviewText=this.innerText">' + text.replace(/\n/g, '<br>') + '</div>'
      + '<div class="platform-preview-footer"><span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span></div>'
      + '</div>'
      + '<div class="st-review-rail">'
      + '<div class="card" style="padding:14px;"><div class="label">Persona Fit</div>'
      + '<div style="margin-bottom:8px;"><span class="pf-chip ' + stPfClass(pf) + '"><span class="pf-chip-dot"></span>' + pf + '</span></div>'
      + [['Resonance', 85], ['Voice Fit', 88], ['Format Fit', 80], ['Timing Fit', 72]].map(function (d) {
          return '<div class="pf-dim"><div class="pf-dim-name">' + d[0] + '</div><div class="pf-dim-bar"><div class="pf-dim-fill" style="width:' + d[1] + '%;"></div></div><div class="pf-dim-val">' + d[1] + '</div></div>';
        }).join('')
      + '</div>'
      + '<div class="card" style="padding:14px;"><div class="label">Brand Voice</div>'
      + [['Formality', 78], ['Warmth', 91], ['Clarity', 85], ['Originality', 82]].map(function (d) {
          return '<div style="margin-bottom:6px;"><div class="bv-label"><span>' + d[0] + '</span><span>' + d[1] + '%</span></div><div class="bv-meter-bar"><div class="bv-meter-fill ' + (d[1] >= 70 ? 'good' : 'warn') + '" style="width:' + d[1] + '%;"></div></div></div>';
        }).join('')
      + '</div>'
      + '<div class="card" style="padding:14px;"><div class="label">Channel Compliance</div>'
      + '<span class="ch-compliance ' + compCls + '">' + w.platform + ': ' + charCount + '/' + limit + ' chars ' + (compCls === 'ok' ? '✓' : '✗') + '</span>'
      + '</div>'
      + '<div class="card" style="padding:14px;"><div class="label">Evidence</div>'
      + '<div class="evidence-item"><div class="evidence-tag research">research</div><div class="evidence-text">Artisan food 14% CAGR (2023–25)</div><div class="evidence-source">IBISWorld, 2025</div></div>'
      + '<div class="evidence-item"><div class="evidence-tag social">social</div><div class="evidence-text">Process photos get 3× IG saves</div><div class="evidence-source">Internal A/B, Q1 2026</div></div>'
      + '</div></div></div>';
  }

  function renderStudioTextWizard() {
    var step = appState.studioTextWizardStep;
    var stepContent = '';
    if (step === 1) stepContent = renderStudioTextWizardStep1();
    else if (step === 2) stepContent = renderStudioTextWizardStep2();
    else if (step === 3) stepContent = renderStudioTextWizardStep3();
    else if (step === 4) stepContent = renderStudioTextWizardStep4();
    else if (step === 5) stepContent = renderStudioTextWizardStep5();
    var canContinue = step === 1 ? !!appState.stWizard.platform : step === 2 ? !!appState.stWizard.format : step === 4 ? appState.stWizard.variation !== null && !appState.stWizard.generating : true;
    var continueLabel = step === 3 ? 'Generate' : step === 4 ? 'Continue to review' : step === 5 ? '' : 'Continue';
    var footer = step === 5
      ? '<div class="st-wizard-footer"><button class="btn btn-outline" onclick="stWizardBack()">← Back</button>'
        + '<div style="display:flex;gap:8px;"><button class="btn btn-outline" onclick="stSaveDraft()">Save Draft</button>'
        + '<button class="btn btn-outline">Schedule ▾ Thu 10am</button>'
        + '<button class="btn btn-primary" onclick="stPublish()">Publish Now</button></div></div>'
      : '<div class="st-wizard-footer"><button class="btn btn-outline" onclick="' + (step === 1 ? 'stBackToLibrary()' : 'stWizardBack()') + '">' + (step === 1 ? '← Back' : '← Back') + '</button>'
        + (continueLabel ? '<button class="btn btn-primary"' + (canContinue ? '' : ' disabled style="opacity:0.4;cursor:not-allowed;"') + ' onclick="stWizardContinue()">' + continueLabel + '</button>' : '')
        + '</div>';
    return '<div>'
      + '<div class="st-wizard-back"><button class="btn btn-ghost btn-sm" onclick="stBackToLibrary()">← Create</button></div>'
      + renderStudioTextStepper()
      + stepContent
      + footer
      + '</div>';
  }

  function renderStudioTextPostDetail() {
    var post = stGetPost(appState.stSelectedPostId);
    if (!post) return '';
    var body = (post.body || post.preview).replace(/\n/g, '<br>');
    var charCount = (post.body || post.preview).length;
    var limit = post.platform === 'X' ? 280 : 1300;
    var compCls = charCount <= limit ? 'ok' : 'fail';

    return '<div>'
      + '<div class="st-wizard-back flex-between">'
      + '<button class="btn btn-ghost btn-sm" onclick="stClosePost()">← My Posts</button>'
      + '<div style="display:flex;gap:8px;align-items:center;">'
      + '<span class="pill ' + stStatusPill(post.status) + '">' + post.status + '</span>'
      + '<span class="pf-chip ' + stPfClass(post.pf) + '"><span class="pf-chip-dot"></span>' + post.pf + ' PF</span>'
      + '</div></div>'
      + '<div style="margin-bottom:20px;"><h2 style="font-size:18px;font-weight:600;">' + post.icon + ' ' + post.platform + ' · ' + post.format + '</h2>'
      + '<p class="screen-sub">Created ' + post.date + ' · Hearth Bakery</p></div>'
      + '<div class="st-review-layout">'
      + '<div>'
      + '<div class="platform-preview">'
      + '<div class="platform-preview-header">'
      + '<div class="platform-preview-avatar">HB</div>'
      + '<div class="platform-preview-meta"><div class="platform-preview-name">Hearth Bakery</div><div class="platform-preview-sub">' + post.platform + ' · ' + post.format + '</div></div>'
      + '</div>'
      + '<div class="platform-preview-body st-readonly">' + body + '</div>'
      + '<div class="platform-preview-footer"><span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span></div>'
      + '</div>'
      + '<div style="margin-top:12px;"><span class="ch-compliance ' + compCls + '">' + post.platform + ': ' + charCount + '/' + limit + ' chars ' + (compCls === 'ok' ? '✓' : '✗') + '</span></div>'
      + '</div>'
      + '<div class="st-review-rail">'
      + '<div class="card" style="padding:14px;"><div class="label">Actions</div>'
      + '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="stOpenEditor()">✎ Edit Post</button>'
      + '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;">Schedule</button>'
      + '<button class="btn btn-outline" style="width:100%;">Duplicate</button>'
      + '</div>'
      + '<div class="card" style="padding:14px;"><div class="label">Persona Fit</div>'
      + '<span class="pf-chip ' + stPfClass(post.pf) + '"><span class="pf-chip-dot"></span>' + post.pf + '</span>'
      + '<div style="margin-top:10px;">'
      + [['Resonance', 85], ['Voice Fit', 88], ['Format Fit', 80], ['Timing Fit', 72]].map(function (d) {
          return '<div class="pf-dim"><div class="pf-dim-name">' + d[0] + '</div><div class="pf-dim-bar"><div class="pf-dim-fill" style="width:' + d[1] + '%;"></div></div><div class="pf-dim-val">' + d[1] + '</div></div>';
        }).join('')
      + '</div></div>'
      + '<div class="card" style="padding:14px;"><div class="label">Brand Voice</div>'
      + '<div style="font-family:\'DM Mono\',monospace;font-size:22px;font-weight:700;color:#34d399;margin-bottom:4px;">0.88</div>'
      + '<div style="font-size:12px;color:var(--muted);">Above publish threshold</div>'
      + '</div>'
      + '</div></div></div>';
  }

  function renderEditorRailTab(tab, label, icon) {
    var active = appState.stEditorRailTab === tab;
    return '<button type="button" class="st-rail-tab' + (active ? ' active' : '') + '" onclick="stSetEditorRailTab(\'' + tab + '\')">' + icon + ' ' + label + '</button>';
  }

  function renderEditorRailInsights(post, m) {
    return '<div class="st-rail-panel">'
      + '<div class="label" style="margin-bottom:10px;">Persona Relevance</div>'
      + m.personas.map(function (p, i) {
          return '<div class="st-persona-row">'
            + '<div class="st-persona-row-head"><span class="st-persona-name">' + p.name + '</span><span class="st-persona-val" id="st-persona-val-' + i + '">' + p.fit + '% fit</span></div>'
            + '<div class="st-persona-seg">' + p.seg + '</div>'
            + '<div class="st-persona-bar-track"><div class="st-persona-bar-fill" id="st-persona-bar-' + i + '" style="width:' + p.fit + '%;"></div></div>'
            + '</div>';
        }).join('')
      + '<div class="divider"></div>'
      + '<div class="label" style="margin-bottom:8px;">Detected Keywords</div>'
      + '<div class="st-kw-wrap" id="st-keywords-wrap">'
      + (m.keywords.length
          ? m.keywords.map(function (k) { return '<span class="st-kw-chip">' + k + '</span>'; }).join('')
          : '<span class="st-kw-empty">Start writing to surface keywords</span>')
      + '</div>'
      + '<div class="st-engagement-card">'
      + '<div class="st-engagement-label">Projected Engagement</div>'
      + '<div class="st-engagement-row"><span>Level</span><strong id="st-engagement-level">' + m.engagement + '</strong></div>'
      + '<div class="st-engagement-row"><span>Est. CTR</span><strong id="st-ctr-val">' + m.ctr + '</strong></div>'
      + '</div>'
      + '<div class="divider"></div>'
      + '<div class="label" style="margin-bottom:8px;">Fit Breakdown</div>'
      + [['Resonance', m.resonance, 'st-dim-resonance'], ['Voice Fit', m.voice, 'st-dim-voice'], ['Format Fit', m.format, 'st-dim-format'], ['Timing Fit', m.timing, 'st-dim-timing']].map(function (d) {
          return '<div class="pf-dim"><div class="pf-dim-name">' + d[0] + '</div><div class="pf-dim-bar"><div class="pf-dim-fill" id="' + d[2] + '" style="width:' + d[1] + '%;"></div></div><div class="pf-dim-val">' + d[1] + '</div></div>';
        }).join('')
      + '<p class="st-rail-footnote">Heuristic scoring — refines as the draft grows and persona signals strengthen.</p>'
      + '</div>';
  }

  function renderEditorRailAI() {
    var actions = [
      ['Draft from brief', '✦'],
      ['Outline', '☰'],
      ['Rewrite selection', '↻'],
      ['Expand selection', '⤢'],
      ['Shorten selection', '✂']
    ];
    return '<div class="st-rail-panel">'
      + '<div class="label" style="margin-bottom:10px;">Quick Actions</div>'
      + '<div class="st-ai-actions">'
      + actions.map(function (a) {
          return '<button type="button" class="st-ai-action-btn" onclick="stAiAction(' + JSON.stringify(a[0]) + ')"><span>' + a[1] + '</span>' + a[0] + '</button>';
        }).join('')
      + '</div>'
      + '<div class="label" style="margin:14px 0 8px;">Custom instruction</div>'
      + '<textarea class="st-form-textarea" style="min-height:72px;" placeholder="e.g. Make this punchier, add a CTA for pre-orders" oninput="appState.stEditorAiPrompt=this.value">' + (appState.stEditorAiPrompt || '') + '</textarea>'
      + '<button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="stAiAction(\'Generated\')">Generate</button>'
      + '</div>';
  }

  function renderEditorRailBrief(post) {
    var b = appState.stEditorBrief;
    b.channel = post.platform + ', ' + post.format;
    var fields = [
      ['Audience', b.audience, 'st-brief-audience'],
      ['Goal', b.goal, 'st-brief-goal'],
      ['Tone', b.tone, 'st-brief-tone'],
      ['Channel', b.channel, 'st-brief-channel']
    ];
    return '<div class="st-rail-panel">'
      + '<div class="label" style="margin-bottom:10px;">Brief</div>'
      + fields.map(function (f) {
          return '<div class="st-form-field"><label>' + f[0] + '</label><input class="st-form-input" value="' + f[1] + '"></div>';
        }).join('')
      + '<div class="st-form-field"><label>Notes</label><textarea class="st-form-textarea" style="min-height:64px;" placeholder="Context for Maker…">' + (b.notes || '') + '</textarea></div>'
      + '</div>';
  }

  function renderEditorRail(post) {
    var m = appState.stLiveMetrics || stComputeLiveMetrics(post.body || post.preview, post);
    var panel = appState.stEditorRailTab === 'ai' ? renderEditorRailAI()
      : appState.stEditorRailTab === 'brief' ? renderEditorRailBrief(post)
      : renderEditorRailInsights(post, m);
    return '<div class="st-editor-rail">'
      + '<div class="st-rail-tabs">'
      + renderEditorRailTab('insights', 'Insights', '💡')
      + renderEditorRailTab('ai', 'AI', '✦')
      + renderEditorRailTab('brief', 'Brief', '☰')
      + '</div>'
      + panel
      + '</div>';
  }

  function renderStudioTextEditor() {
    var post = stGetPost(appState.stSelectedPostId);
    if (!post) return '';
    var text = post.body || post.preview;
    var body = text.replace(/\n/g, '<br>');
    var charCount = text.length;
    var limit = post.platform === 'X' ? 280 : 1300;
    var compCls = charCount <= limit ? 'ok' : 'fail';
    var m = appState.stLiveMetrics || stComputeLiveMetrics(text, post);
    var platCls = 'platform-' + post.platform.toLowerCase().replace(/\s+/g, '-');
    var titleSnippet = post.preview.split('—')[0].split('.')[0].trim();

    return '<div class="st-editor-shell">'
      + '<div class="st-editor-topbar">'
      + '<div class="st-editor-topbar-left">'
      + '<button class="btn btn-ghost btn-sm" onclick="stBackFromEditor()">← Back</button>'
      + '<span class="st-editor-crumb">Studio / <strong>' + titleSnippet.substring(0, 36) + (titleSnippet.length > 36 ? '…' : '') + '</strong></span>'
      + '</div>'
      + '<div class="st-editor-topbar-center">'
      + '<span class="st-copilot-badge">AI COPILOT ACTIVE</span>'
      + '<span class="st-editor-stats"><span id="st-word-count">' + stWordCount(text) + '</span>w · <span id="st-read-mins">' + stReadMins(text) + '</span>m</span>'
      + '</div>'
      + '<div class="st-editor-topbar-right">'
      + '<button class="btn btn-outline btn-sm">Preview</button>'
      + '<button class="btn btn-outline btn-sm">Save</button>'
      + '<button class="btn btn-primary btn-sm">Publish</button>'
      + '</div></div>'
      + '<div class="st-editor-main">'
      + '<div class="st-editor-canvas-wrap">'
      + '<div class="st-editor-canvas ' + platCls + '">'
      + '<div class="st-platform-badge">' + post.icon + ' ' + post.platform + ' · ' + post.format + '</div>'
      + '<div class="st-editor-body platform-preview-body" contenteditable="true" oninput="stOnEditorInput(this)">' + body + '</div>'
      + '</div>'
      + '<div class="st-editor-canvas-foot">'
      + '<span class="ch-compliance ' + compCls + '" id="st-char-compliance">' + post.platform + ': ' + charCount + '/' + limit + ' chars ' + (compCls === 'ok' ? '✓' : '✗') + '</span>'
      + '<span class="pf-chip ' + stPfClass(m.pf) + '" id="st-live-pf-chip"><span class="pf-chip-dot"></span><span id="st-live-pf">' + m.pf + '</span> PF</span>'
      + '</div></div>'
      + renderEditorRail(post)
      + '</div></div>';
  }

  function screenStudioText() {
    var toast = appState.stToast ? '<div class="st-toast">' + appState.stToast + '</div>' : '';
    var inner = '';
    if (appState.stSelectedPostId && appState.stEditing) inner = renderStudioTextEditor();
    else if (appState.stSelectedPostId) inner = renderStudioTextPostDetail();
    else if (appState.studioTextWizardStep > 0) inner = renderStudioTextWizard();
    else inner = renderStudioTextLibrary();

    if (appState.stEditing) {
      return '<div class="screen st-screen-editor">' + inner + toast + '</div>';
    }
    var header = appState.studioTextWizardStep > 0 ? ''
      : '<div class="screen-header"><h1 class="screen-title">Studio — Text</h1><p class="screen-sub">Hearth Bakery · Social text content · Maker agent</p></div>';
    return '<div class="screen">' + header + inner + toast + '</div>';
  }

  return { init: init, screenStudioText: screenStudioText };
})();

window.screenStudioText = function () { return StudioText.screenStudioText(); };
