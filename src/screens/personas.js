// ---------------------------------------------
// Clarity 2.0 — Personas page
// ---------------------------------------------
//
// Gallery of buyer personas for the active concept. Reached from the
// top-bar More (⋯) menu. If the concept has no personas yet, Clara
// generates them from business.customer + business.type using the same
// type-keyed mock pattern as reports.js (_rpMockPersona / _rpAltPersona),
// then persists them on concept.personas.
//
// Persona shape:
//   { id, name, age, description, motivations, howTheyFind,
//     whatMovesThem, typicalSpend, contentPreferences, createdAt }
//
// motivations / contentPreferences are string arrays so the card can
// render them as chips; everything else is a short prose string.

// ---------------------------------------------
// Type-keyed persona seeds (mirrors reports.js)
// ---------------------------------------------

function _pnNormType(type) {
  const t = String(type || '').toLowerCase().trim();
  if (t === 'food') return 'small';
  if (t === 'saas') return 'tech';
  const known = ['small', 'ecommerce', 'service', 'tech', 'creator', 'agency', 'nonprofit', 'other'];
  return known.indexOf(t) !== -1 ? t : 'other';
}

function _pnSeedPrimary(type) {
  const byType = {
    small: {
      name: 'Maya Chen', age: 32,
      desc: 'Lives nearby and stops in on her way home from work 2–3x per week.',
      motivations: ['Consistent quality', 'Personal recognition', 'Local pride'],
      howTheyFind: 'Google Maps, neighborhood Instagram Stories, and word of mouth from regulars.',
      whatMovesThem: 'Being remembered by name and seeing something fresh that week.',
      typicalSpend: '$12–$35 per visit',
      contentPreferences: ['Behind-the-scenes photos', 'Weekly specials', 'Short founder notes']
    },
    ecommerce: {
      name: 'Rachel Kim', age: 29,
      desc: 'Shops from her phone during commute; opens 4 tabs before buying anything.',
      motivations: ['Social proof', 'Fast shipping', 'Clear returns'],
      howTheyFind: 'Instagram ads, TikTok reviews, and friend-tagged posts.',
      whatMovesThem: 'Above-fold reviews plus free shipping on the product page.',
      typicalSpend: '$45–$120 per order',
      contentPreferences: ['UGC unboxings', 'Comparison carousels', 'Limited drops']
    },
    service: {
      name: 'James Patel', age: 42,
      desc: 'COO at a 40-person series-B. Hires help when hiring internally would take too long.',
      motivations: ['Warm referral', 'Specific past outcome', 'Fast first call'],
      howTheyFind: 'Peer intros on LinkedIn and case studies shared in Slack communities.',
      whatMovesThem: 'A peer recommendation with a concrete number attached.',
      typicalSpend: '$5k–$40k per engagement',
      contentPreferences: ['Case studies', 'Outcome threads', 'Founder LinkedIn posts']
    },
    tech: {
      name: 'David Miller', age: 34,
      desc: 'Head of product ops. Signs up for tools during work hours, kills them by Friday.',
      motivations: ['Time-to-first-value', 'Peer validation', 'Public pricing'],
      howTheyFind: 'Product Hunt, G2 comparisons, and Slack tool-channel recommendations.',
      whatMovesThem: 'Clear value inside 5 minutes of signup.',
      typicalSpend: '$29–$299 / seat / month',
      contentPreferences: ['Product demos', 'Changelog notes', 'Workflow walkthroughs']
    },
    creator: {
      name: 'Priya Shah', age: 27,
      desc: 'Follows the creator daily, watches every reel, occasionally buys what they push.',
      motivations: ['Authentic voice', 'Consistent cadence', 'Personal access'],
      howTheyFind: 'Reels, TikTok FYP, and newsletter forwards from friends.',
      whatMovesThem: 'A direct reply or shout-out that feels personal.',
      typicalSpend: '$15–$80 per drop',
      contentPreferences: ['Reels / Shorts', 'Stories Q&A', 'Live sessions']
    },
    agency: {
      name: 'Michael Ross', age: 44,
      desc: 'Marketing director at a Series-C. Hires agencies when internal capacity runs out.',
      motivations: ['Numbers-based case studies', 'Sprint offering', 'Warm intro'],
      howTheyFind: 'Referrals from other growth leads and LinkedIn thought leadership.',
      whatMovesThem: 'A peer saying “these guys ship.”',
      typicalSpend: '$8k–$50k / month retainer',
      contentPreferences: ['Case study carousels', 'Before/after metrics', 'Founder POV posts']
    },
    nonprofit: {
      name: 'Sarah Nakamura', age: 51,
      desc: 'Mid-career professional; gives to 3–4 causes per year based on personal stories.',
      motivations: ['Impact stories', 'Values alignment', 'Thoughtful thank-you'],
      howTheyFind: 'Peer-to-peer campaigns, local events, and email from causes she already trusts.',
      whatMovesThem: 'A specific person’s story, not an aggregate statistic.',
      typicalSpend: '$50–$500 per gift',
      contentPreferences: ['Impact stories', 'Volunteer spotlights', 'Thank-you notes']
    },
    other: {
      name: 'Alex Reyes', age: 36,
      desc: 'Values quality and consistency; buys once, and if the experience is right, buys forever.',
      motivations: ['Clear value promise', 'Trust signals', 'Recognition on return'],
      howTheyFind: 'Search, local recommendations, and Instagram discovery.',
      whatMovesThem: 'A clear one-line differentiator they can repeat to a friend.',
      typicalSpend: '$25–$150 per purchase',
      contentPreferences: ['Straightforward posts', 'Customer stories', 'How-it-works clips']
    }
  };
  const t = _pnNormType(type);
  return byType[t] || byType.other;
}

function _pnSeedAlt(type) {
  const byType = {
    small: {
      name: 'Dan Ortiz', age: 45,
      desc: 'Runs errands on weekends; stops in for something specific he trusts you’ll get right.',
      motivations: ['Reliability', 'No surprises', 'Fair pricing'],
      howTheyFind: 'Walk-bys, Google reviews, and neighbors mentioning you.',
      whatMovesThem: 'A specific item he knows is always in stock.',
      typicalSpend: '$20–$60 per visit',
      contentPreferences: ['Product close-ups', 'Hours / restock notes', 'Local shout-outs']
    },
    ecommerce: {
      name: 'Priya Shah', age: 34,
      desc: 'Buys after seeing a friend’s tagged post; reads reviews carefully before adding to cart.',
      motivations: ['Friend proof', 'Fit / quality clarity', 'Easy returns'],
      howTheyFind: 'Tagged posts, Instagram Shopping, and review roundups.',
      whatMovesThem: 'A real customer photo with an honest caption.',
      typicalSpend: '$60–$180 per order',
      contentPreferences: ['Customer photos', 'Size guides', 'Return policy clarity']
    },
    service: {
      name: 'Rachel Kim', age: 51,
      desc: 'CEO of a 12-person consultancy; delegates vendor selection but signs every SOW.',
      motivations: ['Risk reduction', 'Clear scope', 'Senior attention'],
      howTheyFind: 'Board / peer intros and long-form LinkedIn posts.',
      whatMovesThem: 'A tight proposal that names the outcome and the owner.',
      typicalSpend: '$10k–$75k per project',
      contentPreferences: ['Long-form LinkedIn', 'Client quotes', 'Process diagrams']
    },
    tech: {
      name: 'Sarah Blake', age: 40,
      desc: 'Engineering manager evaluating tools for her team; blocks a Thursday to run POCs.',
      motivations: ['Team adoption', 'Security clarity', 'Integration fit'],
      howTheyFind: 'Internal tool channels, G2, and conference hallway chats.',
      whatMovesThem: 'A POC that her team can finish in one afternoon.',
      typicalSpend: '$99–$999 / month',
      contentPreferences: ['Technical blogs', 'Integration guides', 'Security one-pagers']
    },
    creator: {
      name: 'Alex Reyes', age: 33,
      desc: 'Occasional viewer who becomes a super-fan when content lines up with a life moment.',
      motivations: ['Relevance', 'Emotional timing', 'Community'],
      howTheyFind: 'Algorithmic discovery and newsletter forwards.',
      whatMovesThem: 'Content that names the exact moment they’re living through.',
      typicalSpend: '$10–$50 per purchase',
      contentPreferences: ['Story-led Reels', 'Comment replies', 'Community posts']
    },
    agency: {
      name: 'Jennifer Walsh', age: 38,
      desc: 'Head of growth at a Series-B; needs partners who can move at startup pace.',
      motivations: ['Speed', 'Channel expertise', 'Transparent reporting'],
      howTheyFind: 'Growth Slack groups and warm intros from other heads of growth.',
      whatMovesThem: 'A 2-week sprint proposal with a named owner.',
      typicalSpend: '$6k–$25k / month',
      contentPreferences: ['Sprint recaps', 'Channel playbooks', 'Metric dashboards']
    },
    nonprofit: {
      name: 'Robert Chen', age: 62,
      desc: 'Retired professional with capacity for major gifts; wants deeper involvement.',
      motivations: ['Legacy', 'Hands-on impact', 'Stewardship'],
      howTheyFind: 'Board networks, galas, and personal letters.',
      whatMovesThem: 'An invitation to see the work up close, not just donate.',
      typicalSpend: '$1k–$25k per year',
      contentPreferences: ['Site-visit stories', 'Legacy letters', 'Impact reports']
    },
    other: {
      name: 'Jamie Lee', age: 41,
      desc: 'Word-of-mouth-driven buyer who tries new options when a trusted friend vouches.',
      motivations: ['Trusted referral', 'Low-friction trial', 'Clear next step'],
      howTheyFind: 'Friend recommendations and local Facebook groups.',
      whatMovesThem: 'A friend saying “you should try this” with a specific reason.',
      typicalSpend: '$30–$100 per try',
      contentPreferences: ['Referral prompts', 'Simple explainers', 'Social proof posts']
    }
  };
  const t = _pnNormType(type);
  return byType[t] || byType.other;
}

// ---------------------------------------------
// Generation from business.customer
// ---------------------------------------------

function _pnNewId() {
  return 'pn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function _pnInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function _pnCustomerSnippet(customer) {
  const raw = String(customer || '').trim();
  if (!raw) return '';
  if (raw.length <= 140) return raw;
  return raw.slice(0, 137).replace(/\s+\S*$/, '') + '\u2026';
}

function _pnBlendDescription(seedDesc, customer) {
  const snippet = _pnCustomerSnippet(customer);
  if (!snippet) return seedDesc;
  // Prefer the user's ideal-customer language as the lead, then keep
  // the type-seed line as grounding context.
  return snippet + ' ' + seedDesc;
}

function _pnFromSeed(seed, business, createdAt) {
  const customer = (business && business.customer) ? String(business.customer).trim() : '';
  return {
    id: _pnNewId(),
    name: seed.name,
    age: seed.age,
    description: _pnBlendDescription(seed.desc, customer),
    motivations: Array.isArray(seed.motivations) ? seed.motivations.slice() : [],
    howTheyFind: seed.howTheyFind || '',
    whatMovesThem: seed.whatMovesThem || '',
    typicalSpend: seed.typicalSpend || '',
    contentPreferences: Array.isArray(seed.contentPreferences) ? seed.contentPreferences.slice() : [],
    createdAt: createdAt || Date.now()
  };
}

function _generatePersonasForBusiness(business) {
  const b = business || {};
  const now = Date.now();
  const primary = _pnFromSeed(_pnSeedPrimary(b.type), b, now);
  const alt = _pnFromSeed(_pnSeedAlt(b.type), b, now + 1);
  // If the user wrote a rich customer string, keep both archetypes so
  // the page feels like a real research set. Always return at least one.
  return [primary, alt];
}

function _pnNormalizePersona(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').trim() || 'Persona';
  const motivations = Array.isArray(raw.motivations)
    ? raw.motivations.map(function (m) { return String(m || '').trim(); }).filter(Boolean)
    : (raw.motivations ? [String(raw.motivations)] : []);
  const prefs = Array.isArray(raw.contentPreferences)
    ? raw.contentPreferences.map(function (m) { return String(m || '').trim(); }).filter(Boolean)
    : (raw.contentPreferences ? [String(raw.contentPreferences)] : []);
  return {
    id: (typeof raw.id === 'string' && raw.id) ? raw.id : _pnNewId(),
    name: name,
    age: (typeof raw.age === 'number' && isFinite(raw.age)) ? raw.age : Number(raw.age) || null,
    description: String(raw.description || raw.desc || '').trim(),
    motivations: motivations,
    howTheyFind: String(raw.howTheyFind || '').trim(),
    whatMovesThem: String(raw.whatMovesThem || raw.trigger || '').trim(),
    typicalSpend: String(raw.typicalSpend || '').trim(),
    contentPreferences: prefs,
    createdAt: (typeof raw.createdAt === 'number' && isFinite(raw.createdAt)) ? raw.createdAt : Date.now()
  };
}

function _ensureConceptPersonas(concept) {
  if (!concept) return [];
  if (!Array.isArray(concept.personas)) concept.personas = [];
  // Normalize any legacy / partial rows.
  concept.personas = concept.personas
    .map(_pnNormalizePersona)
    .filter(Boolean);

  if (concept.personas.length > 0) return concept.personas;

  const business = concept.business || {};
  concept.personas = _generatePersonasForBusiness(business);
  if (typeof _saveState === 'function') _saveState();
  return concept.personas;
}

// ---------------------------------------------
// Render
// ---------------------------------------------

function renderPersonas(container) {
  if (!container) return;

  const concept = (typeof getActiveConcept === 'function') ? getActiveConcept() : null;
  if (!concept) {
    container.innerHTML = ''
      + '<div class="pn-page">'
      +   '<button type="button" class="pn-back" id="pnBackBtn" aria-label="Back to Today">'
      +     '<span aria-hidden="true">\u2190</span> Today'
      +   '</button>'
      +   '<p class="pn-empty">No active concept. Finish onboarding first.</p>'
      + '</div>';
    _pnBindPageEvents(container, []);
    return;
  }

  const personas = _ensureConceptPersonas(concept);
  const businessName = (concept.business && concept.business.name && concept.business.name.trim())
    ? concept.business.name.trim()
    : 'your business';

  const cardsHtml = personas.length === 0
    ? '<div class="pn-empty">No personas yet. Clara will generate them from your ideal customer.</div>'
    : '<div class="pn-grid">' + personas.map(_pnRenderCard).join('') + '</div>';

  container.innerHTML = ''
    + '<div class="pn-page">'
    +   '<button type="button" class="pn-back" id="pnBackBtn" aria-label="Back to Today">'
    +     '<span aria-hidden="true">\u2190</span> Today'
    +   '</button>'
    +   '<header class="pn-header">'
    +     '<div class="pn-header-text">'
    +       '<p class="pn-eyebrow">PERSONAS</p>'
    +       '<h1 class="pn-heading">Who you\u2019re talking to</h1>'
    +       '<p class="pn-sub">Clara built these from the ideal customer you described for '
    +         _escape(businessName) + '. Tap a card for the full profile.</p>'
    +     '</div>'
    +   '</header>'
    +   cardsHtml
    + '</div>';

  _pnBindPageEvents(container, personas);
}

// Compact preview card. Full detail lives in the drawer opened on click.
function _pnRenderCard(persona) {
  const p = persona || {};
  const initials = _pnInitials(p.name);
  const ageLine = (p.age != null && p.age !== '') ? String(p.age) : '';
  const motivPreview = (p.motivations || []).slice(0, 2).map(function (m) {
    return '<span class="pn-chip">' + _escape(m) + '</span>';
  }).join('');

  return ''
    + '<button type="button" class="pn-card" data-persona-id="' + _escape(p.id || '') + '" '
    +         'aria-label="Open persona ' + _escape(p.name || 'Persona') + '">'
    +   '<div class="pn-card-top">'
    +     '<div class="pn-avatar" aria-hidden="true">' + _escape(initials) + '</div>'
    +     '<div class="pn-card-identity">'
    +       '<h2 class="pn-card-name">' + _escape(p.name || 'Persona') + '</h2>'
    +       (ageLine
          ? '<p class="pn-card-age">' + _escape(ageLine) + '</p>'
          : '')
    +     '</div>'
    +     '<span class="pn-card-open" aria-hidden="true">View \u2192</span>'
    +   '</div>'
    +   '<p class="pn-card-desc">' + _escape(p.description || '') + '</p>'
    +   (motivPreview ? '<div class="pn-chips">' + motivPreview + '</div>' : '')
    + '</button>';
}

function _pnSection(label, bodyHtml) {
  return ''
    + '<div class="pn-section">'
    +   '<div class="pn-section-label">' + _escape(label) + '</div>'
    +   bodyHtml
    + '</div>';
}

function _pnBindPageEvents(container, personas) {
  const backBtn = container.querySelector('#pnBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      _pnCloseDrawer();
      if (typeof setActiveView === 'function') setActiveView('today');
      if (typeof renderApp === 'function') renderApp();
    });
  }

  const byId = {};
  (personas || []).forEach(function (p) {
    if (p && p.id) byId[p.id] = p;
  });

  container.querySelectorAll('.pn-card[data-persona-id]').forEach(function (card) {
    card.addEventListener('click', function () {
      const id = card.getAttribute('data-persona-id');
      if (!id || !byId[id]) return;
      _pnOpenDrawer(byId[id]);
    });
  });
}

// ---------------------------------------------
// Detail drawer (right on desktop, bottom on mobile)
// ---------------------------------------------

function _pnCloseDrawer() {
  const backdrop = document.getElementById('pnDrawerBackdrop');
  if (!backdrop) return;
  backdrop.classList.remove('pn-drawer-open');
  setTimeout(function () {
    if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  }, 220);
}

function _pnOpenDrawer(persona) {
  _pnCloseDrawer();
  const p = persona || {};
  const initials = _pnInitials(p.name);
  const ageLine = (p.age != null && p.age !== '')
    ? (String(p.age) + ' years old')
    : 'Demographic profile';

  const motivationChips = (p.motivations || []).map(function (m) {
    return '<span class="pn-chip">' + _escape(m) + '</span>';
  }).join('');
  const prefChips = (p.contentPreferences || []).map(function (m) {
    return '<span class="pn-chip pn-chip-muted">' + _escape(m) + '</span>';
  }).join('');

  const backdrop = document.createElement('div');
  backdrop.id = 'pnDrawerBackdrop';
  backdrop.className = 'pn-drawer-backdrop';
  backdrop.setAttribute('role', 'presentation');
  backdrop.innerHTML = ''
    + '<aside class="pn-drawer" role="dialog" aria-modal="true" aria-labelledby="pnDrawerTitle">'
    +   '<div class="pn-drawer-handle" aria-hidden="true"></div>'
    +   '<div class="pn-drawer-head">'
    +     '<button type="button" class="pn-drawer-close" id="pnDrawerClose" aria-label="Close">'
    +       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
    +         '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
    +       '</svg>'
    +     '</button>'
    +   '</div>'
    +   '<div class="pn-drawer-identity">'
    +     '<div class="pn-avatar pn-avatar-lg" aria-hidden="true">' + _escape(initials) + '</div>'
    +     '<div>'
    +       '<h2 class="pn-drawer-name" id="pnDrawerTitle">' + _escape(p.name || 'Persona') + '</h2>'
    +       '<p class="pn-drawer-age">' + _escape(ageLine) + '</p>'
    +     '</div>'
    +   '</div>'
    +   '<p class="pn-drawer-desc">' + _escape(p.description || '') + '</p>'
    +   '<div class="pn-drawer-body">'
    +     _pnSection('What motivates them', motivationChips
          ? '<div class="pn-chips">' + motivationChips + '</div>'
          : '<p class="pn-section-body">\u2014</p>')
    +     _pnSection('How they find businesses like this',
          '<p class="pn-section-body">' + _escape(p.howTheyFind || '\u2014') + '</p>')
    +     _pnSection('What moves them to buy',
          '<p class="pn-section-body">' + _escape(p.whatMovesThem || '\u2014') + '</p>')
    +     _pnSection('Typical spend',
          '<p class="pn-section-body pn-section-spend">' + _escape(p.typicalSpend || '\u2014') + '</p>')
    +     _pnSection('Content preferences', prefChips
          ? '<div class="pn-chips">' + prefChips + '</div>'
          : '<p class="pn-section-body">\u2014</p>')
    +   '</div>'
    + '</aside>';

  document.body.appendChild(backdrop);
  requestAnimationFrame(function () {
    backdrop.classList.add('pn-drawer-open');
  });

  const closeBtn = document.getElementById('pnDrawerClose');
  if (closeBtn) closeBtn.addEventListener('click', _pnCloseDrawer);

  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) _pnCloseDrawer();
  });

  function onEsc(e) {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', onEsc);
      _pnCloseDrawer();
    }
  }
  document.addEventListener('keydown', onEsc);
}

window.renderPersonas = renderPersonas;
window._generatePersonasForBusiness = _generatePersonasForBusiness;
window._ensureConceptPersonas = _ensureConceptPersonas;
window._pnCloseDrawer = _pnCloseDrawer;
