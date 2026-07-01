/* Studio: Image — mockup module (library, wizard, canvas editor) */
var StudioImage = (function () {
  var SI_PLATFORMS = [
    { id: 'Instagram', icon: '📷', desc: 'Feed, Stories, Reels' },
    { id: 'LinkedIn', icon: 'in', desc: 'Posts, banners, carousels' },
    { id: 'X', icon: '𝕏', desc: 'Headers, post images' },
    { id: 'TikTok', icon: '♪', desc: 'Covers, thumbnails' },
    { id: 'Facebook', icon: 'f', desc: 'Feed, ads, covers' },
    { id: 'Pinterest', icon: 'P', desc: 'Pins, idea boards' }
  ];
  var SI_FORMATS = {
    Instagram: [
      { id: 'Feed 1:1', aspect: '1:1', dims: '1080×1080' },
      { id: 'Portrait 4:5', aspect: '4:5', dims: '1080×1350' },
      { id: 'Story 9:16', aspect: '9:16', dims: '1080×1920' },
      { id: 'Reel cover', aspect: '9:16', dims: '1080×1920' }
    ],
    LinkedIn: [
      { id: 'Banner 1.91:1', aspect: '1.91:1', dims: '1200×627' },
      { id: 'Square 1:1', aspect: '1:1', dims: '1200×1200' },
      { id: 'Carousel slide', aspect: '1:1', dims: '1080×1080' }
    ],
    X: [
      { id: 'Post 16:9', aspect: '16:9', dims: '1600×900' },
      { id: 'Header 3:1', aspect: '3:1', dims: '1500×500' }
    ],
    TikTok: [{ id: 'Cover 9:16', aspect: '9:16', dims: '1080×1920' }],
    Facebook: [
      { id: 'Feed 1:1', aspect: '1:1', dims: '1080×1080' },
      { id: 'Story 9:16', aspect: '9:16', dims: '1080×1920' }
    ],
    Pinterest: [{ id: 'Pin 2:3', aspect: '4:5', dims: '1000×1500' }]
  };
  var SI_THEMES = {
    sourdough: { photo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=80', bg: 'linear-gradient(160deg,rgba(26,26,46,0.55) 0%,rgba(77,29,149,0.72) 100%)', accent: '#2dd4bf', headline: 'The Art of<br>Slow Growth', sub: 'Hearth · Summer 2026', logo: 'HEARTH' },
    modality: { photo: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=900&q=80', bg: 'linear-gradient(160deg,rgba(18,16,14,0.5) 0%,rgba(212,168,83,0.65) 100%)', accent: '#d4a853', headline: 'Modality-First.<br>Campaign-Anchored.', sub: 'Clarity Content Studio', logo: 'CLARITY' },
    split: { photo: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80', bg: 'linear-gradient(90deg,rgba(18,16,14,0.88) 48%,rgba(28,25,22,0.4) 52%)', accent: '#f59e0b', headline: '12 tools<br>vs 1 platform', sub: 'Before → After', logo: '' },
    bakery: { photo: 'https://images.unsplash.com/photo-1585478259719-afa9a03f7c78?w=900&q=80', bg: 'linear-gradient(145deg,rgba(45,24,16,0.45),rgba(92,61,46,0.75))', accent: '#ffb84a', headline: 'Sourdough<br>Saturday', sub: 'Pre-orders open 🍞', logo: 'HEARTH' },
    product: { photo: 'https://images.unsplash.com/photo-1611162617474-5b21e939e227?w=900&q=80', bg: 'linear-gradient(160deg,rgba(23,29,46,0.4) 0%,rgba(67,56,202,0.75) 100%)', accent: '#818cf8', headline: 'Studio Image<br>Launch', sub: 'Product feature spotlight', logo: 'CLARITY' },
    ferment: { photo: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=900&q=80', bg: 'linear-gradient(180deg,rgba(10,22,40,0.35),rgba(19,78,74,0.72))', accent: '#2dd4bf', headline: '72-Hour<br>Cold Ferment', sub: 'Process · Behind the scenes', logo: 'HEARTH' },
    ad: { photo: 'https://images.unsplash.com/photo-1493770348161-369769ae3570?w=900&q=80', bg: 'linear-gradient(135deg,rgba(28,25,23,0.55),rgba(68,64,60,0.78))', accent: '#f59e0b', headline: 'Craft over<br>convenience', sub: 'Limited batch · This week', logo: 'HEARTH' }
  };
  var SI_VARIATIONS = [
    { label: 'A', pf: 84, theme: 'modality', headline: 'Modality-First.<br>Persona-Scored.' },
    { label: 'B', pf: 91, theme: 'split', headline: 'One platform.<br>Every format.' },
    { label: 'C', pf: 76, theme: 'product', headline: 'Create visuals<br>that convert.' }
  ];
  var DEFAULT_ASSETS = [
    { id: 'i1', title: 'Summer Launch hero', platform: 'Instagram', icon: '📷', format: 'Feed 1:1', aspect: '1:1', dims: '1080×1080', theme: 'sourdough', status: 'Draft', pf: 89, date: '2d ago' },
    { id: 'i2', title: 'Modality-first LinkedIn banner', platform: 'LinkedIn', icon: 'in', format: 'Banner 1.91:1', aspect: '1.91:1', dims: '1200×627', theme: 'modality', status: 'Published', pf: 82, date: '5d ago' },
    { id: 'i3', title: 'Sourdough Saturday promo', platform: 'Instagram', icon: '📷', format: 'Portrait 4:5', aspect: '4:5', dims: '1080×1350', theme: 'bakery', status: 'Scheduled', pf: 88, date: '1d ago' },
    { id: 'i4', title: 'Behind the bake — Story', platform: 'Instagram', icon: '📷', format: 'Story 9:16', aspect: '9:16', dims: '1080×1920', theme: 'ferment', status: 'Draft', pf: 79, date: '3d ago' },
    { id: 'i5', title: 'Product feature spotlight', platform: 'LinkedIn', icon: 'in', format: 'Carousel slide', aspect: '1:1', dims: '1080×1080', theme: 'product', status: 'In Review', pf: 92, date: '6h ago' },
    { id: 'i6', title: 'Split-screen ad creative', platform: 'Facebook', icon: 'f', format: 'Feed 1:1', aspect: '1:1', dims: '1080×1080', theme: 'split', status: 'Draft', pf: 74, date: '4d ago' }
  ];
  var SI_LAYERS = [
    { id: 'headline', label: 'Headline text', icon: 'T' },
    { id: 'photo', label: 'Generated image', icon: '🖼' },
    { id: 'brand', label: 'Brand overlay', icon: '▣' },
    { id: 'bg', label: 'Background', icon: '◼' },
    { id: 'logo', label: 'Logo (locked)', icon: '✦' }
  ];

  function siPfClass(pf) { return pf >= 70 ? 'green' : pf >= 40 ? 'amber' : 'red'; }
  function siStatusPill(status) {
    var map = { Draft: 'pill-muted', Published: 'pill-green', Scheduled: 'pill-indigo', 'In Review': 'pill-amber' };
    return map[status] || 'pill-muted';
  }
  function siArClass(aspect) {
    if (aspect === '9:16') return 'story';
    if (aspect === '4:5') return 'portrait';
    if (aspect === '1.91:1') return 'banner';
    if (aspect === '16:9' || aspect === '3:1') return 'wide';
    return 'square';
  }
  function siArStyle(aspect) {
    var map = { '1:1': '1/1', '4:5': '4/5', '9:16': '9/16', '1.91:1': '1.91/1', '16:9': '16/9', '3:1': '3/1' };
    return map[aspect] || '1/1';
  }
  function siGetAsset(id) {
    return appState.siAssets.filter(function (a) { return a.id === id; })[0] || null;
  }
  function siGetTheme(themeId) {
    return SI_THEMES[themeId] || SI_THEMES.modality;
  }
  function siPlatformIcon(platform) {
    var m = SI_PLATFORMS.filter(function (p) { return p.id === platform; })[0];
    return m ? m.icon : '🖼';
  }

  function siPreviewSize(aspect, maxWidth) {
    maxWidth = maxWidth || 360;
    var parts = siArStyle(aspect).split('/');
    var rw = parseFloat(parts[0]);
    var rh = parseFloat(parts[1]);
    var w = maxWidth;
    var h = Math.round(w * rh / rw);
    var maxH = 220;
    if (h > maxH) {
      h = maxH;
      w = Math.round(h * rw / rh);
    }
    return { w: w, h: h };
  }

  function siPlainText(html) {
    if (!html) return '';
    return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  }

  function siRenderVisual(themeId, aspect, opts) {
    opts = opts || {};
    var t = siGetTheme(themeId);
    var headline = opts.headline != null ? opts.headline : t.headline;
    var sub = opts.sub != null ? opts.sub : t.sub;
    var ar = siArClass(aspect);
    var isArtboard = opts.artboard;
    var selectedLayer = opts.selectedLayer;
    var hidden = opts.hiddenLayers || {};
    var editable = opts.editable;
    var showHandles = opts.showHandles;

    var sizeCls = isArtboard ? 'si-artboard si-ar-' + ar : 'si-asset-thumb si-ar-' + ar + (opts.sizeClass ? ' ' + opts.sizeClass : '') + (opts.extraCls ? ' ' + opts.extraCls : '');
    var w = opts.width;
    var style = '';
    if (opts.previewBox && !isArtboard) {
      var sz = siPreviewSize(aspect);
      style = 'width:' + sz.w + 'px;height:' + sz.h + 'px;';
    } else if (isArtboard && w) {
      var ratio = siArStyle(aspect).split('/');
      var h = Math.round(w * parseInt(ratio[1], 10) / parseInt(ratio[0], 10));
      style = 'width:' + w + 'px;height:' + h + 'px;';
    }

    var fsHead = isArtboard
      ? (aspect === '9:16' ? '18px' : aspect === '1.91:1' ? '20px' : '26px')
      : (ar === 'story' ? '11px' : ar === 'banner' ? '13px' : '16px');

    var photoHidden = hidden.photo ? ' hidden' : '';
    var headlineSel = selectedLayer === 'headline' ? ' selected' : '';
    var photoSel = selectedLayer === 'photo' ? ' selected' : '';
    var logoSel = selectedLayer === 'logo' ? ' selected' : '';

    var headlineEl = editable
      ? '<div class="si-layer-headline si-layer-box' + headlineSel + '" style="font-size:' + fsHead + ';" data-layer="headline" contenteditable="true" spellcheck="false" oninput="siOnCanvasHeadlineInput(this)">' + headline + '</div>'
      : '<div class="si-layer-headline' + headlineSel + '" style="font-size:' + fsHead + ';">' + headline + '</div>';

    var handles = showHandles && selectedLayer ? '<div class="si-transform-handles"><span></span><span></span><span></span><span></span></div>' : '';

    return '<div class="' + sizeCls + '"' + (style ? ' style="' + style + '"' : '') + '>'
      + '<div class="si-visual-photo' + photoHidden + photoSel + '" style="background-image:url(\'' + t.photo + '\');"></div>'
      + '<div class="si-visual-gradient" style="background:' + t.bg + ';"></div>'
      + '<div class="si-thumb-inner">'
      + headlineEl
      + (sub && !hidden.sub && !hidden.brand ? '<div class="si-layer-sub si-layer-box' + (selectedLayer === 'brand' ? ' selected' : '') + '">' + sub + '</div>' : '')
      + (!hidden.brand ? '<div class="si-layer-accent si-layer-box' + (selectedLayer === 'brand' ? ' selected' : '') + '" style="background:' + t.accent + ';width:' + (isArtboard ? '48px;height:3px' : '32px;height:2px') + ';"></div>' : '')
      + (t.logo && !hidden.logo ? '<div class="si-layer-logo si-layer-box' + logoSel + '">' + t.logo + '</div>' : '')
      + handles
      + '</div></div>';
  }

  function siRenderThumb(themeId, aspect, sizeClass, extraCls) {
    return siRenderVisual(themeId, aspect, { sizeClass: sizeClass, extraCls: extraCls });
  }

  function siRenderArtboard(themeId, aspect, width, opts) {
    opts = opts || {};
    opts.artboard = true;
    opts.width = width || (aspect === '9:16' ? 220 : aspect === '1.91:1' ? 380 : aspect === '4:5' ? 260 : 300);
    return siRenderVisual(themeId, aspect, opts);
  }

  function init(state) {
    state.studioImageWizardStep = 0;
    state.siSelectedAssetId = null;
    state.siEditing = false;
    state.siPrefDrawerOpen = false;
    state.siToast = null;
    state.siFilters = { search: '', platform: 'All', status: 'All', type: 'All' };
    state.siPrefs = { platform: 'Instagram', style: 'Brand Kit', persona: 'Maya Holloway', brandKitLock: true };
    state.siWizard = {
      platform: null, format: null, aspect: '1:1', dims: '1080×1080',
      useCase: 'Social post', prompt: '', styles: ['Brand Kit'], persona: 'Maya Holloway',
      brandKitLock: true, reference: false, variation: null, generating: false, reviewTheme: null
    };
    state.siAssets = [];
    state.siEditorRailTab = 'insights';
    state.siEditorAiPrompt = '';
    state.siSelectedLayer = 'headline';
    state.siSelectedTool = 0;
    state.siPreviewAspect = null;
    state.siHiddenLayers = {};
    state.siLiveMetrics = null;
    state.siEditorBrief = {
      audience: 'Local food enthusiasts, 28–45',
      goal: 'Drive weekend pre-orders',
      style: 'Warm, authentic, craft-focused',
      channel: '',
      notes: ''
    };
  }

  function siComputeMetrics(asset, headlineText) {
    var pf = asset.pf || 75;
    if (headlineText) {
      var len = headlineText.length;
      pf = Math.min(98, Math.max(42, pf - 4 + Math.floor(len / 6)));
      if (len > 48) pf -= 6;
      if (len < 12) pf -= 3;
    }
    return {
      pf: pf,
      personas: [
        { name: 'Maya Holloway', seg: 'Enterprise CMO', fit: Math.min(96, pf + 3) },
        { name: 'Alex Rivera', seg: 'Growth founder', fit: Math.min(90, pf - 5) },
        { name: 'Local foodie', seg: 'Hearth regular', fit: Math.min(94, pf + 6) }
      ],
      resonance: Math.min(98, pf + 2),
      voice: Math.min(98, pf + 5),
      format: Math.min(98, pf - 1),
      composition: Math.min(98, pf + 4),
      engagement: pf >= 82 ? 'High' : pf >= 62 ? 'Medium' : 'Low'
    };
  }

  function siPatchLiveInsights(m, asset) {
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    set('si-live-pf', m.pf);
    set('si-engagement-level', m.engagement);
    var pfChip = document.getElementById('si-live-pf-chip');
    if (pfChip) {
      pfChip.className = 'pf-chip ' + siPfClass(m.pf);
      pfChip.innerHTML = '<span class="pf-chip-dot"></span>' + m.pf + ' PF';
    }
    var topPf = document.getElementById('si-editor-top-pf');
    if (topPf) {
      topPf.className = 'pf-chip ' + siPfClass(m.pf);
      topPf.innerHTML = '<span class="pf-chip-dot"></span>' + m.pf;
    }
    m.personas.forEach(function (p, i) {
      var bar = document.getElementById('si-persona-bar-' + i);
      var val = document.getElementById('si-persona-val-' + i);
      if (bar) bar.style.width = p.fit + '%';
      if (val) val.textContent = p.fit + '% fit';
    });
    [['si-dim-resonance', m.resonance], ['si-dim-voice', m.voice], ['si-dim-format', m.format], ['si-dim-composition', m.composition]].forEach(function (d) {
      var bar = document.getElementById(d[0]);
      var val = document.getElementById(d[0] + '-val');
      if (bar) bar.style.width = d[1] + '%';
      if (val) val.textContent = d[1];
    });
    if (asset) asset.pf = m.pf;
  }

  window.siOpenPrefs = function () { appState.siPrefDrawerOpen = true; renderContent(); };
  window.siClosePrefs = function () { appState.siPrefDrawerOpen = false; renderContent(); };
  window.siOpenAsset = function (id) {
    appState.siSelectedAssetId = id;
    appState.siEditing = false;
    appState.studioImageWizardStep = 0;
    renderContent();
  };
  window.siOpenEditor = function () {
    appState.siEditing = true;
    appState.siEditorRailTab = 'insights';
    appState.siPreviewAspect = null;
    appState.siHiddenLayers = {};
    appState.siSelectedTool = 0;
    var asset = siGetAsset(appState.siSelectedAssetId);
    if (asset) {
      if (!asset.headline) {
        var t = siGetTheme(asset.theme);
        asset.headline = t.headline;
        asset.sub = t.sub;
      }
      appState.siEditorBrief.channel = asset.platform + ' · ' + asset.format;
      appState.siLiveMetrics = siComputeMetrics(asset, siPlainText(asset.headline));
    }
    renderContent();
  };
  window.siBackFromEditor = function () { appState.siEditing = false; renderContent(); };
  window.siCloseAsset = function () {
    appState.siSelectedAssetId = null;
    appState.siEditing = false;
    renderContent();
  };
  window.siStartWizard = function () {
    appState.siSelectedAssetId = null;
    var w = appState.siWizard;
    var brief = appState.createBrief || {};
    var plat = appState.siPrefs.platform || 'Instagram';
    var fmt = SI_FORMATS[plat] ? SI_FORMATS[plat][0] : SI_FORMATS.Instagram[0];
    w.platform = plat;
    w.format = fmt.id;
    w.aspect = fmt.aspect;
    w.dims = fmt.dims;
    w.useCase = brief.goal || 'Social post';
    w.prompt = brief.message || '';
    w.styles = [appState.siPrefs.style || 'Brand Kit'];
    w.persona = brief.persona || appState.siPrefs.persona;
    w.brandKitLock = appState.siPrefs.brandKitLock;
    w.reference = false;
    w.variation = null;
    w.generating = false;
    w.reviewTheme = null;
    appState.studioImageWizardStep = 1;
    renderContent();
  };
  window.siBackToLibrary = function () {
    appState.studioImageWizardStep = 0;
    appState.siSelectedAssetId = null;
    appState.siEditing = false;
    nav('create-home');
  };
  window.siSelectPlatform = function (id) {
    var w = appState.siWizard;
    w.platform = id;
    var fmt = SI_FORMATS[id][0];
    w.format = fmt.id;
    w.aspect = fmt.aspect;
    w.dims = fmt.dims;
    renderContent();
  };
  window.siSelectFormatIndex = function (idx) {
    var w = appState.siWizard;
    var formats = SI_FORMATS[w.platform] || SI_FORMATS.Instagram;
    var f = formats[idx];
    if (!f) return;
    w.format = f.id;
    w.aspect = f.aspect;
    w.dims = f.dims;
    renderContent();
  };
  window.siToggleStyle = function (s) {
    var styles = appState.siWizard.styles;
    var i = styles.indexOf(s);
    if (i >= 0) { if (styles.length > 1) styles.splice(i, 1); }
    else styles.push(s);
    renderContent();
  };
  var siSearchTimer;
  window.siSetFilter = function (key, val) {
    appState.siFilters[key] = val;
    if (key === 'search') {
      clearTimeout(siSearchTimer);
      siSearchTimer = setTimeout(renderContent, 250);
      return;
    }
    renderContent();
  };
  window.siSetWizardField = function (key, val) {
    appState.siWizard[key] = val;
    if (key === 'brandKitLock') renderContent();
  };
  window.siSelectVariation = function (idx) {
    appState.siWizard.variation = idx;
    appState.siWizard.reviewTheme = SI_VARIATIONS[idx].theme;
    renderContent();
  };
  window.siSelectLayer = function (id) { appState.siSelectedLayer = id; renderContent(); };
  window.siSelectTool = function (idx) {
    appState.siSelectedTool = idx;
    if (idx === 2) appState.siSelectedLayer = 'headline';
    renderContent();
  };
  window.siSelectAspect = function (aspect) {
    appState.siPreviewAspect = aspect;
    renderContent();
  };
  window.siToggleLayerVisibility = function (id, e) {
    if (e) e.stopPropagation();
    var hidden = appState.siHiddenLayers;
    hidden[id] = !hidden[id];
    renderContent();
  };
  window.siOnCanvasHeadlineInput = function (el) {
    var asset = siGetAsset(appState.siSelectedAssetId);
    if (!asset) return;
    asset.headline = el.innerHTML;
    var plain = siPlainText(el.innerHTML);
    var m = siComputeMetrics(asset, plain);
    appState.siLiveMetrics = m;
    siPatchLiveInsights(m, asset);
  };
  window.siSetEditorRailTab = function (tab) { appState.siEditorRailTab = tab; renderContent(); };
  window.siAiAction = function (label) {
    appState.siToast = label + ' applied';
    renderContent();
    setTimeout(function () { appState.siToast = null; renderContent(); }, 2200);
  };
  window.siWizardBack = function () {
    var step = appState.studioImageWizardStep;
    if (step <= 1) { siBackToLibrary(); return; }
    if (step === 4) appState.siWizard.generating = false;
    appState.studioImageWizardStep = step - 1;
    renderContent();
  };
  window.siWizardContinue = function () {
    var step = appState.studioImageWizardStep;
    var w = appState.siWizard;
    if (step === 1 && !w.platform) return;
    if (step === 2 && !w.format) return;
    if (step === 4 && w.variation === null) return;
    if (step === 3) {
      appState.studioImageWizardStep = 4;
      w.generating = true;
      w.variation = null;
      renderContent();
      setTimeout(function () {
        appState.siWizard.generating = false;
        renderContent();
      }, 1800);
      return;
    }
    if (step === 4 && w.variation !== null) {
      appState.studioImageWizardStep = 5;
      renderContent();
      return;
    }
    appState.studioImageWizardStep = step + 1;
    renderContent();
  };
  window.siRegenerate = function () {
    appState.siWizard.generating = true;
    appState.siWizard.variation = null;
    renderContent();
    setTimeout(function () {
      appState.siWizard.generating = false;
      renderContent();
    }, 1800);
  };
  window.siPublish = function () {
    var w = appState.siWizard;
    var v = w.variation !== null ? SI_VARIATIONS[w.variation] : SI_VARIATIONS[1];
    appState.siAssets.unshift({
      id: 'i' + Date.now(),
      title: w.prompt ? w.prompt.substring(0, 42) + (w.prompt.length > 42 ? '…' : '') : 'New visual',
      platform: w.platform || 'Instagram',
      icon: siPlatformIcon(w.platform),
      format: w.format || 'Feed 1:1',
      aspect: w.aspect || '1:1',
      dims: w.dims || '1080×1080',
      theme: w.reviewTheme || v.theme,
      headline: v.headline,
      sub: siGetTheme(v.theme).sub,
      status: 'Scheduled',
      pf: v.pf,
      date: 'Just now'
    });
    appState.studioImageWizardStep = 0;
    appState.siToast = 'Image scheduled for Thu 10am';
    renderContent();
    setTimeout(function () { appState.siToast = null; renderContent(); }, 2800);
  };
  window.siSaveDraft = function () {
    var w = appState.siWizard;
    var v = w.variation !== null ? SI_VARIATIONS[w.variation] : SI_VARIATIONS[1];
    appState.siAssets.unshift({
      id: 'i' + Date.now(),
      title: w.prompt ? w.prompt.substring(0, 42) + '…' : 'New visual draft',
      platform: w.platform || 'Instagram',
      icon: siPlatformIcon(w.platform),
      format: w.format || 'Feed 1:1',
      aspect: w.aspect || '1:1',
      dims: w.dims || '1080×1080',
      theme: w.reviewTheme || v.theme,
      headline: v.headline,
      sub: siGetTheme(v.theme).sub,
      status: 'Draft',
      pf: v.pf,
      date: 'Just now'
    });
    appState.studioImageWizardStep = 0;
    appState.siToast = 'Draft saved to library';
    renderContent();
    setTimeout(function () { appState.siToast = null; renderContent(); }, 2800);
  };

  function siFilteredAssets() {
    var f = appState.siFilters;
    return appState.siAssets.filter(function (a) {
      if (f.search && a.title.toLowerCase().indexOf(f.search.toLowerCase()) < 0 && a.platform.toLowerCase().indexOf(f.search.toLowerCase()) < 0) return false;
      if (f.platform !== 'All' && a.platform !== f.platform) return false;
      if (f.status !== 'All' && a.status !== f.status) return false;
      if (f.type !== 'All' && a.format.indexOf(f.type) < 0 && f.type !== a.format) return false;
      return true;
    });
  }

  function renderPrefDrawer() {
    var open = appState.siPrefDrawerOpen;
    var p = appState.siPrefs;
    var styles = ['Brand Kit', 'Dark tech', 'Minimal', 'Warm craft', 'Bold promo'];
    return '<div class="pref-drawer-overlay' + (open ? ' open' : '') + '" onclick="siClosePrefs()"></div>'
      + '<div class="pref-drawer' + (open ? ' open' : '') + '">'
      + '<div class="pref-drawer-header"><span class="pref-drawer-title">Visual Preferences</span><span class="modal-close" onclick="siClosePrefs()">&#x2715;</span></div>'
      + '<div class="pref-drawer-body">'
      + '<div class="st-form-field"><label>Default platform</label><select class="st-form-select" onchange="appState.siPrefs.platform=this.value">'
      + SI_PLATFORMS.map(function (pl) { return '<option' + (p.platform === pl.id ? ' selected' : '') + '>' + pl.id + '</option>'; }).join('')
      + '</select></div>'
      + '<div class="st-form-field"><label>Default style</label><div class="tone-chip-row">'
      + styles.map(function (s) {
          return '<span class="si-style-chip' + (p.style === s ? ' active' : '') + '" onclick="appState.siPrefs.style=\'' + s + '\';renderContent();">' + s + '</span>';
        }).join('')
      + '</div></div>'
      + '<div class="st-form-field"><label>Default persona</label><select class="st-form-select" onchange="appState.siPrefs.persona=this.value;renderContent();">'
      + ['Maya Holloway', 'Alex Rivera', 'All segments'].map(function (x) { return '<option' + (p.persona === x ? ' selected' : '') + '>' + x + '</option>'; }).join('')
      + '</select></div>'
      + '<div class="st-form-field"><label>Brand Kit lock</label><div style="display:flex;align-items:center;gap:10px;margin-top:4px;">'
      + '<div class="toggle-sw' + (p.brandKitLock ? ' on' : '') + '" onclick="appState.siPrefs.brandKitLock=!appState.siPrefs.brandKitLock;renderContent();"><div class="toggle-knob"></div></div>'
      + '<span style="font-size:12px;color:var(--muted);">Enforce brand colors + logo on generate</span></div></div>'
      + '<button class="btn btn-primary" style="margin-top:8px;background:#f59e0b;border-color:#f59e0b;" onclick="siClosePrefs()">Save preferences</button>'
      + '</div></div>';
  }

  function renderLibrary() {
    var f = appState.siFilters;
    var assets = siFilteredAssets();
    var cards = assets.map(function (a) {
      return '<div class="si-asset-card" onclick="siOpenAsset(\'' + a.id + '\')">'
        + '<div class="si-asset-thumb-wrap">' + siRenderThumb(a.theme, a.aspect) + '</div>'
        + '<div class="si-asset-body">'
        + '<div class="si-asset-title">' + a.title + '</div>'
        + '<div class="si-asset-meta">'
        + '<span class="si-platform-chip">' + a.icon + ' ' + a.platform + '</span>'
        + '<span class="si-dim-chip">' + a.dims + '</span>'
        + '</div>'
        + '<div class="si-asset-meta">'
        + '<span class="pill ' + siStatusPill(a.status) + '">' + a.status + '</span>'
        + '<span class="pf-chip ' + siPfClass(a.pf) + '"><span class="pf-chip-dot"></span>' + a.pf + ' PF</span>'
        + '<span class="mono" style="color:var(--muted);font-size:10px;">' + a.date + '</span>'
        + '</div></div></div>';
    }).join('');

    return '<div>'
      + '<div class="flex-between" style="margin-bottom:20px;">'
      + '<div><h2 style="font-size:18px;font-weight:600;display:flex;align-items:center;">My Visuals <span class="si-library-header-accent">🖼 Layer canvas + AI</span></h2>'
      + '<p class="screen-sub">Hearth Bakery · Visual content · Maker agent</p></div>'
      + '<div style="display:flex;gap:8px;">'
      + '<button class="btn btn-outline btn-sm" onclick="siOpenPrefs()" title="Preferences">&#9881; Preferences</button>'
      + '<button class="btn btn-primary btn-sm" style="background:#f59e0b;border-color:#f59e0b;" onclick="siStartWizard()">+ Create Image</button>'
      + '</div></div>'
      + '<div class="si-filter-bar">'
      + '<input class="si-search" placeholder="Search visuals…" value="' + (f.search || '') + '" oninput="siSetFilter(\'search\',this.value)">'
      + '<select class="si-filter-select" onchange="siSetFilter(\'platform\',this.value)">'
      + ['All', 'Instagram', 'LinkedIn', 'X', 'TikTok', 'Facebook'].map(function (x) { return '<option' + (f.platform === x ? ' selected' : '') + '>' + x + '</option>'; }).join('')
      + '</select>'
      + '<select class="si-filter-select" onchange="siSetFilter(\'status\',this.value)">'
      + ['All', 'Draft', 'Published', 'Scheduled', 'In Review'].map(function (x) { return '<option' + (f.status === x ? ' selected' : '') + '>' + x + '</option>'; }).join('')
      + '</select>'
      + '<select class="si-filter-select" onchange="siSetFilter(\'type\',this.value)">'
      + ['All', 'Feed', 'Story', 'Banner', 'Carousel'].map(function (x) { return '<option' + (f.type === x ? ' selected' : '') + '>' + x + '</option>'; }).join('')
      + '</select></div>'
      + (assets.length ? '<div class="si-asset-grid">' + cards + '</div>' : '<div class="st-empty-hint">No visuals match your filters.</div>')
      + renderPrefDrawer()
      + '</div>';
  }

  function renderStepper() {
    var step = appState.studioImageWizardStep;
    var labels = ['Platform', 'Format', 'Brief', 'Generate', 'Review'];
    var html = '<div class="si-wizard-steps-wrap st-wizard-steps-wrap"><div class="wizard-steps" style="justify-content:center;">';
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

  function renderWizardStep1() {
    var w = appState.siWizard;
    return '<div class="label">Choose platform</div><p style="font-size:13px;color:var(--muted);margin-bottom:16px;">Where will this visual be published?</p>'
      + '<div class="platform-tile-grid">'
      + SI_PLATFORMS.map(function (p) {
          return '<div class="platform-tile si-platform-tile' + (w.platform === p.id ? ' active' : '') + '" onclick="siSelectPlatform(\'' + p.id + '\')">'
            + '<div class="platform-tile-icon">' + p.icon + '</div>'
            + '<div class="platform-tile-name">' + p.id + '</div>'
            + '<div class="platform-tile-desc">' + p.desc + '</div></div>';
        }).join('')
      + '</div>';
  }

  function renderWizardStep2() {
    var w = appState.siWizard;
    var formats = SI_FORMATS[w.platform] || SI_FORMATS.Instagram;
    var sel = formats.filter(function (f) { return f.id === w.format; })[0] || formats[0];
    return '<div class="label">Format & size</div><p style="font-size:13px;color:var(--muted);margin-bottom:16px;">Auto-suggested for ' + w.platform + '. Dimensions enforced at creation.</p>'
      + '<div class="format-chip-row">'
      + formats.map(function (f, idx) {
          return '<span class="format-chip si-format-chip' + (w.format === f.id ? ' active' : '') + '" onclick="siSelectFormatIndex(' + idx + ')">' + f.id + '</span>';
        }).join('')
      + '</div>'
      + '<div class="format-hint">&#10003; ' + sel.dims + ' · ' + sel.aspect + ' · Safe zones applied for ' + w.platform + '</div>'
      + '<div class="si-format-preview-wrap">'
      + siRenderVisual(w.platform === 'LinkedIn' ? 'modality' : 'sourdough', sel.aspect, { previewBox: true })
      + '<div class="si-format-preview-label">' + sel.dims + ' · ' + sel.aspect + '</div>'
      + '</div>';
  }

  function renderWizardStep3() {
    var w = appState.siWizard;
    var styles = ['Brand Kit', 'Dark tech', 'Minimal', 'Warm craft', 'Bold promo'];
    var useCases = ['Social post', 'Ad creative', 'Story slide', 'Carousel slide', 'Thumbnail'];
    return '<div class="si-pref-bar"><span>&#9881;</span><span>Using: <strong>' + w.styles.join(', ') + '</strong> · <strong>' + w.persona.split(' ')[0] + '</strong> persona · Brand Kit ' + (w.brandKitLock ? 'locked' : 'off') + '</span>'
      + '<span class="si-pref-bar-edit" onclick="siOpenPrefs()">Edit defaults</span></div>'
      + '<div class="st-brief-form">'
      + '<div class="st-form-field"><label>Use case</label><select class="st-form-select" onchange="siSetWizardField(\'useCase\',this.value)">'
      + useCases.map(function (u) { return '<option' + (w.useCase === u ? ' selected' : '') + '>' + u + '</option>'; }).join('')
      + '</select></div>'
      + '<div class="st-form-field"><label>Describe the visual</label><textarea class="st-form-textarea" placeholder="A warm hero image for sourdough Saturday — rustic bakery, golden crust, morning light, brand colors…" oninput="appState.siWizard.prompt=this.value">' + (w.prompt || '') + '</textarea></div>'
      + '<div class="st-form-field"><label>Style references</label><div class="tone-chip-row">'
      + styles.map(function (s) {
          return '<span class="si-style-chip' + (w.styles.indexOf(s) >= 0 ? ' active' : '') + '" onclick="siToggleStyle(\'' + s + '\')">' + s + '</span>';
        }).join('')
      + '</div></div>'
      + '<div class="st-form-field"><label>Target persona</label><select class="st-form-select" onchange="siSetWizardField(\'persona\',this.value)">'
      + ['Maya Holloway', 'Alex Rivera', 'All segments'].map(function (x) { return '<option' + (w.persona === x ? ' selected' : '') + '>' + x + '</option>'; }).join('')
      + '</select></div>'
      + '<div class="st-form-field"><label>Brand Kit lock</label><div style="display:flex;align-items:center;gap:12px;margin-top:4px;">'
      + '<div class="toggle-sw' + (w.brandKitLock ? ' on' : '') + '" onclick="siSetWizardField(\'brandKitLock\',!appState.siWizard.brandKitLock)"><div class="toggle-knob"></div></div>'
      + '<span style="font-size:12px;color:var(--muted);">Enforce brand colors, fonts, and logo placement</span></div></div>'
      + '<div class="st-form-field"><label>Reference image (optional)</label>'
      + '<div class="si-upload-zone" onclick="appState.siToast=\'Reference upload mocked\';renderContent();setTimeout(function(){appState.siToast=null;renderContent();},2000);">'
      + 'Drop a reference or click to upload<br><span style="font-size:10px;opacity:0.7;">PNG, JPG up to 10MB</span></div></div>'
      + '</div>'
      + renderPrefDrawer();
  }

  function renderWizardStep4() {
    var w = appState.siWizard;
    if (w.generating) {
      return '<div class="si-generating" style="position:relative;">'
        + '<div class="si-gen-glow"></div>'
        + '<div class="si-gen-preview-row">'
        + [0, 1, 2].map(function (i) {
            return '<div class="si-gen-thumb si-gen-thumb-' + i + '">' + siRenderThumb('sourdough', w.aspect || '1:1') + '</div>';
          }).join('')
        + '</div>'
        + '<div class="si-spinner"></div>'
        + '<div style="font-size:15px;font-weight:600;color:var(--text);">Maker is generating visuals…</div>'
        + '<div style="font-size:12px;color:var(--muted);">Imagen 3 · Scoring composition for ' + w.persona + '</div>'
        + '<div style="font-size:11px;color:var(--muted);font-family:\'DM Mono\',monospace;">' + w.dims + ' · ' + w.aspect + '</div></div>';
    }
    return '<div class="label">Pick a variation</div><p style="font-size:13px;color:var(--muted);margin-bottom:16px;">3 options scored for visual persona fit. Select one to continue.</p>'
      + '<div class="si-variation-grid">'
      + SI_VARIATIONS.map(function (v, i) {
          return '<div class="si-variation-card' + (w.variation === i ? ' selected' : '') + '" onclick="siSelectVariation(' + i + ')">'
            + '<div class="flex-between"><span style="font-weight:600;font-size:13px;">Variation ' + v.label + '</span>'
            + '<span class="pf-chip ' + siPfClass(v.pf) + '"><span class="pf-chip-dot"></span>' + v.pf + ' PF' + (v.pf >= 85 ? ' ★' : '') + '</span></div>'
            + siRenderVisual(v.theme, w.aspect || '1:1', { sizeClass: 'si-var-preview', headline: v.headline })
            + '<button class="btn btn-outline btn-sm" style="width:100%;" onclick="event.stopPropagation();siSelectVariation(' + i + ')">' + (w.variation === i ? 'Selected ✓' : 'Select') + '</button>'
            + '</div>';
        }).join('')
      + '</div>'
      + '<button class="btn btn-ghost btn-sm" onclick="siRegenerate()">↻ Regenerate variations</button>';
  }

  function renderWizardStep5() {
    var w = appState.siWizard;
    var theme = w.reviewTheme || (w.variation !== null ? SI_VARIATIONS[w.variation].theme : 'modality');
    var pf = w.variation !== null ? SI_VARIATIONS[w.variation].pf : 88;
    return '<div class="si-review-layout">'
      + '<div class="si-preview-frame">'
      + '<div class="si-preview-frame-head"><span>' + w.platform + ' · ' + w.format + '</span><span class="ch-compliance ok">' + w.dims + ' ✓</span></div>'
      + '<div class="si-preview-stage">' + siRenderArtboard(theme, w.aspect, null, { headline: w.variation !== null ? SI_VARIATIONS[w.variation].headline : null }) + '</div>'
      + '<div style="padding:10px 16px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;">'
      + ['Export PNG', 'Export set', 'Add to campaign'].map(function (b) {
          return '<button class="btn btn-outline btn-sm">' + b + '</button>';
        }).join('')
      + '</div></div>'
      + '<div class="st-review-rail">'
      + '<div class="card" style="padding:14px;"><div class="label">Visual Persona Fit</div>'
      + '<div style="margin-bottom:8px;"><span class="pf-chip ' + siPfClass(pf) + '"><span class="pf-chip-dot"></span>' + pf + '</span></div>'
      + [['Resonance', 88], ['Voice Fit', 85], ['Format Fit', 94], ['Composition', 90]].map(function (d) {
          return '<div class="pf-dim"><div class="pf-dim-name">' + d[0] + '</div><div class="pf-dim-bar"><div class="pf-dim-fill" style="width:' + d[1] + '%;background:#f59e0b;"></div></div><div class="pf-dim-val">' + d[1] + '</div></div>';
        }).join('')
      + '</div>'
      + '<div class="card" style="padding:14px;"><div class="label">Format Variants</div>'
      + '<p style="font-size:11px;color:var(--muted);margin-bottom:8px;">Auto-resize from master</p>'
      + [['Square 1:1', 'Ready'], ['Portrait 4:5', 'Ready'], ['Story 9:16', 'Generate']].map(function (v) {
          return '<div class="si-variant-chip' + (v[1] === 'Ready' ? ' done' : '') + '"><span>' + v[0] + '</span><span style="font-size:10px;color:var(--muted);">' + v[1] + '</span></div>';
        }).join('')
      + '</div>'
      + '<div class="card" style="padding:14px;"><div class="label">Brand Kit</div>'
      + '<div style="font-size:12px;color:var(--muted);line-height:1.6;">Colors, logo, and typography applied' + (w.brandKitLock ? ' · Locked ✓' : '') + '</div>'
      + '<div style="display:flex;gap:6px;margin-top:10px;">'
      + ['#d4a853', '#f59e0b', '#2dd4bf', '#12100e'].map(function (c) {
          return '<div style="width:24px;height:24px;border-radius:6px;background:' + c + ';border:1px solid var(--border);"></div>';
        }).join('')
      + '</div></div></div></div>';
  }

  function renderWizard() {
    var step = appState.studioImageWizardStep;
    var content = '';
    if (step === 1) content = renderWizardStep1();
    else if (step === 2) content = renderWizardStep2();
    else if (step === 3) content = renderWizardStep3();
    else if (step === 4) content = renderWizardStep4();
    else if (step === 5) content = renderWizardStep5();
    var canContinue = step === 1 ? !!appState.siWizard.platform : step === 2 ? !!appState.siWizard.format : step === 4 ? appState.siWizard.variation !== null && !appState.siWizard.generating : true;
    var continueLabel = step === 3 ? '✦ Generate' : step === 4 ? 'Continue to review' : step === 5 ? '' : 'Continue';
    var footer = step === 5
      ? '<div class="st-wizard-footer"><button class="btn btn-outline" onclick="siWizardBack()">← Back</button>'
        + '<div style="display:flex;gap:8px;"><button class="btn btn-outline" onclick="siSaveDraft()">Save Draft</button>'
        + '<button class="btn btn-outline">Schedule ▾ Thu 10am</button>'
        + '<button class="btn btn-primary" style="background:#f59e0b;border-color:#f59e0b;" onclick="siPublish()">Publish Now</button></div></div>'
      : '<div class="st-wizard-footer"><button class="btn btn-outline" onclick="' + (step === 1 ? 'siBackToLibrary()' : 'siWizardBack()') + '">← Back</button>'
        + (continueLabel ? '<button class="btn btn-primary" style="background:#f59e0b;border-color:#f59e0b;"' + (canContinue ? '' : ' disabled style="opacity:0.4;cursor:not-allowed;background:#f59e0b;border-color:#f59e0b;"') + ' onclick="siWizardContinue()">' + continueLabel + '</button>' : '')
        + '</div>';
    return '<div>'
      + '<div class="st-wizard-back"><button class="btn btn-ghost btn-sm" onclick="siBackToLibrary()">← Create</button></div>'
      + renderStepper() + content + footer + '</div>';
  }

  function renderAssetDetail() {
    var asset = siGetAsset(appState.siSelectedAssetId);
    if (!asset) return '';
    var m = siComputeMetrics(asset, siPlainText(asset.headline || ''));
    return '<div>'
      + '<div class="st-wizard-back flex-between">'
      + '<button class="btn btn-ghost btn-sm" onclick="siCloseAsset()">← My Visuals</button>'
      + '<div style="display:flex;gap:8px;align-items:center;">'
      + '<span class="pill ' + siStatusPill(asset.status) + '">' + asset.status + '</span>'
      + '<span class="pf-chip ' + siPfClass(asset.pf) + '"><span class="pf-chip-dot"></span>' + asset.pf + ' PF</span>'
      + '</div></div>'
      + '<div style="margin-bottom:20px;"><h2 style="font-size:18px;font-weight:600;">' + asset.icon + ' ' + asset.title + '</h2>'
      + '<p class="screen-sub">' + asset.platform + ' · ' + asset.format + ' · ' + asset.dims + ' · ' + asset.date + '</p></div>'
      + '<div class="si-review-layout">'
      + '<div class="si-preview-frame">'
      + '<div class="si-preview-frame-head"><span>Platform preview</span><span class="ch-compliance ok">' + asset.dims + ' ✓</span></div>'
      + '<div class="si-preview-stage">' + siRenderArtboard(asset.theme, asset.aspect, null, { headline: asset.headline, sub: asset.sub }) + '</div></div>'
      + '<div class="st-review-rail">'
      + '<div class="card" style="padding:14px;"><div class="label">Actions</div>'
      + '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;background:#f59e0b;border-color:#f59e0b;" onclick="siOpenEditor()">✎ Edit Image</button>'
      + '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;">Export PNG</button>'
      + '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;">Duplicate</button>'
      + '<button class="btn btn-outline" style="width:100%;">Schedule</button>'
      + '</div>'
      + '<div class="card" style="padding:14px;"><div class="label">Visual Persona Fit</div>'
      + '<span class="pf-chip ' + siPfClass(asset.pf) + '"><span class="pf-chip-dot"></span>' + asset.pf + '</span>'
      + '<div style="margin-top:10px;">'
      + [['Resonance', m.resonance], ['Voice Fit', m.voice], ['Format Fit', m.format], ['Composition', m.composition]].map(function (d) {
          return '<div class="pf-dim"><div class="pf-dim-name">' + d[0] + '</div><div class="pf-dim-bar"><div class="pf-dim-fill" style="width:' + d[1] + '%;background:#f59e0b;"></div></div><div class="pf-dim-val">' + d[1] + '</div></div>';
        }).join('')
      + '</div></div>'
      + '<div class="card" style="padding:14px;"><div class="label">Format variants</div>'
      + [['1:1 Feed', '✓'], ['4:5 Portrait', '✓'], ['9:16 Story', '—']].map(function (v) {
          return '<div class="si-variant-chip' + (v[1] === '✓' ? ' done' : '') + '"><span>' + v[0] + '</span><span>' + v[1] + '</span></div>';
        }).join('')
      + '</div></div></div></div>';
  }

  function renderRailTab(tab, label, icon) {
    return '<button type="button" class="si-rail-tab' + (appState.siEditorRailTab === tab ? ' active' : '') + '" onclick="siSetEditorRailTab(\'' + tab + '\')">' + icon + ' ' + label + '</button>';
  }

  function renderRailInsights(asset, m) {
    return '<div class="si-rail-panel">'
      + '<div class="label" style="margin-bottom:10px;">Visual Persona Fit</div>'
      + '<div style="margin-bottom:12px;"><span id="si-live-pf-chip" class="pf-chip ' + siPfClass(m.pf) + '"><span class="pf-chip-dot"></span><span id="si-live-pf">' + m.pf + '</span> PF</span></div>'
      + m.personas.map(function (p, i) {
          return '<div class="st-persona-row"><div class="st-persona-row-head"><span class="st-persona-name">' + p.name + '</span><span class="st-persona-val" id="si-persona-val-' + i + '">' + p.fit + '% fit</span></div>'
            + '<div class="st-persona-seg">' + p.seg + '</div>'
            + '<div class="st-persona-bar-track"><div class="st-persona-bar-fill" id="si-persona-bar-' + i + '" style="width:' + p.fit + '%;background:linear-gradient(90deg,#f59e0b,#fbbf24);"></div></div></div>';
        }).join('')
      + '<div class="divider"></div>'
      + '<div class="label" style="margin-bottom:8px;">Fit Breakdown</div>'
      + [['Resonance', m.resonance, 'si-dim-resonance'], ['Voice Fit', m.voice, 'si-dim-voice'], ['Format Fit', m.format, 'si-dim-format'], ['Composition', m.composition, 'si-dim-composition']].map(function (d) {
          return '<div class="pf-dim"><div class="pf-dim-name">' + d[0] + '</div><div class="pf-dim-bar"><div class="pf-dim-fill" id="' + d[2] + '" style="width:' + d[1] + '%;background:#f59e0b;"></div></div><div class="pf-dim-val" id="' + d[2] + '-val">' + d[1] + '</div></div>';
        }).join('')
      + '<div class="st-engagement-card"><div class="st-engagement-label">Projected Performance</div>'
      + '<div class="st-engagement-row"><span>Engagement</span><strong id="si-engagement-level">' + m.engagement + '</strong></div></div>'
      + '<div class="si-variant-row"><div class="label">Quick variants</div>'
      + [['Square 1:1', true], ['Portrait 4:5', true], ['Story 9:16', false]].map(function (v) {
          return '<div class="si-variant-chip' + (v[1] ? ' done' : '') + '"><span>' + v[0] + '</span><span style="font-size:10px;">' + (v[1] ? 'Ready' : 'Generate') + '</span></div>';
        }).join('')
      + '</div></div>';
  }

  function renderRailAI() {
    var actions = [
      ['Vary composition', '↻'],
      ['Inpaint selection', '✎'],
      ['Remove background', '◻'],
      ['Upscale 2×', '⤢'],
      ['Apply Brand Kit', '✦']
    ];
    return '<div class="si-rail-panel">'
      + '<div class="label" style="margin-bottom:8px;">Model</div>'
      + '<div class="modality-picker" style="margin-bottom:14px;">'
      + ['Imagen 3', 'Flux', 'DALL-E 3'].map(function (m, i) {
          return '<span class="mod-btn' + (i === 0 ? ' active' : '') + '" onclick="this.parentElement.querySelectorAll(\'.mod-btn\').forEach(function(b){b.classList.remove(\'active\')});this.classList.add(\'active\')">' + m + '</span>';
        }).join('')
      + '</div>'
      + '<div class="label" style="margin-bottom:10px;">Quick Actions</div>'
      + '<div style="display:flex;flex-direction:column;gap:6px;">'
      + actions.map(function (a) {
          return '<button type="button" class="si-ai-action-btn" onclick="siAiAction(\'' + a[0].replace(/'/g, "\\'") + '\')"><span>' + a[1] + '</span>' + a[0] + '</button>';
        }).join('')
      + '</div>'
      + '<div class="label" style="margin:14px 0 8px;">Visual prompt</div>'
      + '<textarea class="st-form-textarea" style="min-height:72px;" placeholder="Describe changes…" oninput="appState.siEditorAiPrompt=this.value">' + (appState.siEditorAiPrompt || '') + '</textarea>'
      + '<button class="btn btn-primary" style="width:100%;margin-top:10px;background:#f59e0b;border-color:#f59e0b;" onclick="siAiAction(\'Generated\')">✦ Generate</button>'
      + '</div>';
  }

  function renderRailBrief(asset) {
    var b = appState.siEditorBrief;
    b.channel = asset.platform + ' · ' + asset.format;
    return '<div class="si-rail-panel">'
      + '<div class="label" style="margin-bottom:10px;">Brief</div>'
      + [['Audience', b.audience], ['Goal', b.goal], ['Style', b.style], ['Channel', b.channel]].map(function (f) {
          return '<div class="st-form-field"><label>' + f[0] + '</label><input class="st-form-input" value="' + f[1] + '"></div>';
        }).join('')
      + '<div class="st-form-field"><label>Notes</label><textarea class="st-form-textarea" style="min-height:64px;" placeholder="Context for Maker…">' + (b.notes || '') + '</textarea></div>'
      + '</div>';
  }

  function renderEditor() {
    var asset = siGetAsset(appState.siSelectedAssetId);
    if (!asset) return '';
    var m = appState.siLiveMetrics || siComputeMetrics(asset, siPlainText(asset.headline));
    var previewAspect = appState.siPreviewAspect || asset.aspect;
    var tools = [
      { icon: '↖', tip: 'Select' },
      { icon: '✍', tip: 'Brush' },
      { icon: 'T', tip: 'Text' },
      { icon: '🔲', tip: 'Shape' },
      { icon: '✂', tip: 'Crop' },
      { icon: '🪣', tip: 'Fill' },
      { icon: '⚡', tip: 'AI' }
    ];
    var aspectOptions = [
      { label: asset.format.split(' ')[0] + ' ' + asset.aspect, aspect: asset.aspect },
      { label: 'IG 4:5', aspect: '4:5' },
      { label: 'Story 9:16', aspect: '9:16' },
      { label: 'LI 1.91:1', aspect: '1.91:1' }
    ];
    var panel = appState.siEditorRailTab === 'ai' ? renderRailAI()
      : appState.siEditorRailTab === 'brief' ? renderRailBrief(asset)
      : renderRailInsights(asset, m);
    var titleSnippet = asset.title.substring(0, 36) + (asset.title.length > 36 ? '…' : '');
    var canvasOpts = {
      headline: asset.headline,
      sub: asset.sub,
      selectedLayer: appState.siSelectedLayer,
      hiddenLayers: appState.siHiddenLayers,
      editable: true,
      showHandles: appState.siSelectedTool === 0
    };
    var layerMap = { headline: 'headline', photo: 'photo', brand: 'brand', bg: 'photo', logo: 'logo' };

    return '<div class="si-editor-shell">'
      + '<div class="si-editor-topbar">'
      + '<div class="si-editor-topbar-left">'
      + '<button class="btn btn-ghost btn-sm" onclick="siBackFromEditor()">← Back</button>'
      + '<span class="st-editor-crumb">Studio / <strong>' + titleSnippet + '</strong></span>'
      + '</div>'
      + '<div class="si-editor-topbar-center">'
      + '<span class="si-copilot-badge">VISUAL COPILOT</span>'
      + '<span class="si-editor-stats">' + asset.dims + ' · ' + previewAspect + '</span>'
      + '<span id="si-editor-top-pf" class="pf-chip ' + siPfClass(m.pf) + '"><span class="pf-chip-dot"></span>' + m.pf + '</span>'
      + '</div>'
      + '<div class="si-editor-topbar-right">'
      + '<button class="btn btn-outline btn-sm">Preview</button>'
      + '<button class="btn btn-outline btn-sm" onclick="appState.siToast=\'Draft saved\';renderContent();setTimeout(function(){appState.siToast=null;renderContent();},2000);">Save</button>'
      + '<button class="btn btn-primary btn-sm" style="background:#f59e0b;border-color:#f59e0b;" onclick="appState.siToast=\'Published to ' + asset.platform + '\';renderContent();setTimeout(function(){appState.siToast=null;renderContent();},2200);">Publish</button>'
      + '</div></div>'
      + '<div class="si-editor-workspace">'
      + '<div class="si-layers-panel">'
      + '<div class="si-layers-head">Layers</div>'
      + SI_LAYERS.map(function (l) {
          var layerKey = layerMap[l.id] || l.id;
          var isHidden = appState.siHiddenLayers[layerKey];
          return '<div class="si-layer-item' + (appState.siSelectedLayer === l.id ? ' selected' : '') + (isHidden ? ' dimmed' : '') + '" onclick="siSelectLayer(\'' + l.id + '\')">'
            + '<div class="si-layer-thumb">' + l.icon + '</div>'
            + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + l.label + '</span>'
            + '<span class="si-layer-eye' + (isHidden ? ' off' : '') + '" onclick="siToggleLayerVisibility(\'' + layerKey + '\',event)">' + (isHidden ? '👁‍🗨' : '👁') + '</span></div>';
        }).join('')
      + '<div style="padding:10px 12px;margin-top:auto;border-top:1px solid var(--border);">'
      + '<button class="btn btn-outline btn-sm" style="width:100%;font-size:10px;" onclick="appState.siToast=\'Layer added\';renderContent();setTimeout(function(){appState.siToast=null;renderContent();},1800);">+ Add layer</button></div></div>'
      + '<div class="si-canvas-col">'
      + '<div class="si-tool-bar">'
      + tools.map(function (t, i) {
          return '<div class="si-tool-btn' + (appState.siSelectedTool === i ? ' active' : '') + '" title="' + t.tip + '" onclick="siSelectTool(' + i + ')">' + t.icon + '</div>';
        }).join('')
      + '<div class="si-tool-spacer"></div>'
      + '<button class="btn btn-outline btn-sm">100%</button>'
      + '<button class="btn btn-outline btn-sm">Undo</button>'
      + '<button class="btn btn-outline btn-sm">Redo</button>'
      + '</div>'
      + '<div class="si-canvas-area' + (appState.siSelectedTool === 6 ? ' ai-mode' : '') + '">'
      + (appState.siSelectedTool === 0 ? '<div class="si-smart-guides"></div>' : '')
      + siRenderArtboard(asset.theme, previewAspect, null, canvasOpts)
      + '</div>'
      + '<div class="si-aspect-bar">'
      + aspectOptions.map(function (a) {
          return '<span class="si-aspect-btn' + (previewAspect === a.aspect ? ' active' : '') + '" onclick="siSelectAspect(\'' + a.aspect + '\')">' + a.label + '</span>';
        }).join('')
      + '</div></div>'
      + '<div class="si-editor-rail">'
      + '<div class="si-rail-tabs">'
      + renderRailTab('insights', 'Insights', '💡')
      + renderRailTab('ai', 'AI', '✦')
      + renderRailTab('brief', 'Brief', '☰')
      + '</div>' + panel + '</div></div>'
      + '<div class="si-progress-strip">'
      + [['Brief set', 'done'], ['Generated', 'done'], ['Brand applied', 'current'], ['Format checked', 'pending'], ['Published', 'pending']].map(function (s, i, arr) {
          return '<div class="si-strip-stage"><div class="si-strip-dot ' + s[1] + '"></div><span class="si-strip-label ' + s[1] + '">' + s[0] + '</span></div>'
            + (i < arr.length - 1 ? '<span class="si-strip-arrow">›</span>' : '');
        }).join('')
      + '</div></div>';
  }

  function screenStudioImage() {
    var toast = appState.siToast ? '<div class="si-toast">' + appState.siToast + '</div>' : '';
    var inner = '';
    if (appState.siSelectedAssetId && appState.siEditing) inner = renderEditor();
    else if (appState.siSelectedAssetId) inner = renderAssetDetail();
    else if (appState.studioImageWizardStep > 0) inner = renderWizard();
    else inner = renderLibrary();

    if (appState.siEditing) {
      return '<div class="screen si-screen-editor">' + inner + toast + '</div>';
    }
    var header = appState.studioImageWizardStep > 0 ? ''
      : '<div class="screen-header"><h1 class="screen-title">Studio — Image</h1><p class="screen-sub">Hearth Bakery · Visual content · Layer canvas + AI generation</p></div>';
    return '<div class="screen">' + header + inner + toast + '</div>';
  }

  return {
    init: init,
    screenStudioImage: screenStudioImage,
    renderPreview: function (themeId, aspect, headline, editable) {
      return siRenderArtboard(themeId, aspect || '1:1', null, {
        headline: headline,
        editable: !!editable,
        showHandles: false
      });
    }
  };
})();

window.screenStudioImage = function () { return StudioImage.screenStudioImage(); };
