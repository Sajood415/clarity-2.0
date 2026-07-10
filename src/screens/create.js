// ---------------------------------------------
// Clarity 2.0 — Create View (Clara-driven, 4 steps)
// ---------------------------------------------
//
// There is no free-text input in this flow. Clara suggests three angles
// based on the concept's business context, the user picks one, confirms
// the platform, picks one of three generated variations, then publishes
// or drafts.
//
// State lives on the active concept's `create` object:
//   step:              1 | 2 | 3 | 4
//   selectedSuggestion { id, type, platform, angle, why }
//   selectedPlatform   'instagram' | 'linkedin' | 'facebook' | 'email'
//   selectedVariation  { id: 'A' | 'B' | 'C', text }
//   variations         array of { id, text } (regenerated on step 3 enter)
//   fromTask           the Today task, if the user arrived via one
//
// Coming from a Today task pre-selects the matching suggestion so the
// user can hit Continue immediately.

const CR_PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin',  label: 'LinkedIn'  },
  { key: 'facebook',  label: 'Facebook'  },
  { key: 'email',     label: 'Email'     }
];

// Minimal monochrome platform glyphs. Colored via `currentColor` so the
// publish badge in step 4 can tint them with the accent.
const CR_PLATFORM_ICONS = {
  instagram:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">'
    + '<rect x="3" y="3" width="18" height="18" rx="5"/>'
    + '<circle cx="12" cy="12" r="4"/>'
    + '<circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none"/>'
    + '</svg>',
  linkedin:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">'
    + '<rect x="3" y="9" width="4" height="12" rx="0.5"/>'
    + '<circle cx="5" cy="5" r="2"/>'
    + '<path d="M9 9h4v1.8c.7-1 2-2 3.8-2 3.2 0 4.2 2 4.2 5V21h-4v-6.1c0-1.4-.6-2.3-2-2.3s-2 .9-2 2.3V21H9V9z"/>'
    + '</svg>',
  facebook:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">'
    + '<path d="M13 22v-8h3l.5-4H13V7.5c0-1.1.4-2 2-2h1.5V2c-.5-.1-1.5-.2-2.5-.2-3 0-5 1.8-5 5V10H6v4h3v8h4z"/>'
    + '</svg>',
  email:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="3" y="5" width="18" height="14" rx="2"/>'
    + '<path d="M3 7l9 6 9-6"/>'
    + '</svg>'
};

// Maps Today task types (POST / OUTREACH / OFFER) to suggestion ids so
// arriving via a task pre-selects the closest angle. This is the only
// place we depend on the task shape; everything else is via `fromTask`.
const CR_TASK_TO_SUGGESTION = {
  POST:     'process',
  OUTREACH: 'note',
  OFFER:    'proof'
};

function _crBusinessName() {
  const b = getBusiness();
  const raw = (b.name && b.name.trim()) ? b.name.trim() : '';
  return raw || 'your business';
}

function _crProduct() {
  const b = getBusiness();
  const raw = (b.product && b.product.trim()) ? b.product.trim() : '';
  return raw || 'what you make';
}

// ---------------------------------------------
// Suggestions (Step 1 data)
// ---------------------------------------------

function _crSuggestions() {
  const b = getBusiness();
  const name = _crBusinessName();
  const product = _crProduct();
  const localFirst = b.reach === 'local' ? 'instagram' : 'linkedin';

  return [
    {
      id: 'process',
      type: 'POST',
      platform: localFirst,
      angle: 'Show the process behind ' + product + '. One authentic behind the scenes moment builds more trust than any ad.',
      why: 'Your audience responds to real over polished.'
    },
    {
      id: 'note',
      type: 'EMAIL',
      platform: 'email',
      angle: 'Send a personal note to your last 5 customers from ' + name + '. Ask one question: what made them choose you?',
      why: 'Retention is cheaper than acquisition. This one message can rebook customers.'
    },
    {
      id: 'proof',
      type: 'STORY',
      platform: 'instagram',
      angle: 'Post one specific result a customer got from ' + name + '. Use their words if possible.',
      why: 'Social proof from real customers converts better than any copy you write.'
    }
  ];
}

function _crMatchSuggestionForTask(task, suggestions) {
  if (!task) return null;
  const targetId = CR_TASK_TO_SUGGESTION[String(task.type || '').toUpperCase()];
  if (!targetId) return null;
  for (let i = 0; i < suggestions.length; i++) {
    if (suggestions[i].id === targetId) return suggestions[i];
  }
  return null;
}

// ---------------------------------------------
// Variations (Step 3 data) — three flavors per suggestion angle,
// referencing the business name/product so the copy reads specific.
// ---------------------------------------------

function _crQuoteForType(type) {
  switch (type) {
    case 'food':      return "'best I\u2019ve had in years'";
    case 'retail':    return "'exactly what I was looking for'";
    case 'service':   return "'you actually did what you said you\u2019d do'";
    case 'trades':    return "'finished in a day, no headaches'";
    case 'tech':      return "'this just fits into my day, I don\u2019t think about it'";
    case 'creative':  return "'nobody else sounds like this'";
    case 'health':    return "'first time I actually felt heard'";
    case 'education': return "'clicked in one session'";
    default:          return "'exactly what I needed'";
  }
}

// Variations are shaped per content format so Step 3 can render them
// with the right structure:
//   text  \u2014 { id, format:'text',  text }              (POST / STORY)
//   email \u2014 { id, format:'email', subject, body }     (EMAIL)
//   video \u2014 { id, format:'video', hook, middle, cta } (VIDEO)
//
// Copy references business.name + business.product so nothing reads
// generic. Business type flavors the story-led email quote.

function _crVariationsFor(suggestion) {
  if (!suggestion) return [];
  const type = String(suggestion.type || '').toUpperCase();
  if (type === 'EMAIL') return _crEmailVariations(suggestion);
  if (type === 'VIDEO') return _crVideoVariations(suggestion);
  return _crSocialVariations(suggestion); // POST + STORY
}

function _crSocialVariations(suggestion) {
  const name = _crBusinessName();
  const product = _crProduct();

  // Three flavors per angle:
  //   A \u2014 hook question    (open with a question that pulls the reader in)
  //   B \u2014 bold statement   (open with a declarative claim)
  //   C \u2014 emoji + story    (open with a single emoji then a story hook)

  if (suggestion.id === 'process') {
    return [
      { id: 'A', format: 'text',
        text: 'Ever wondered what actually goes into ' + product + ' at ' + name + '? Here\u2019s the part nobody shows.' },
      { id: 'B', format: 'text',
        text: 'Behind every ' + product + ' at ' + name + ', one step nobody talks about. Sharing it today.' },
      { id: 'C', format: 'text',
        text: '\uD83D\uDC40 A customer asked us this week how ' + product + ' really gets made at ' + name + '. So we opened the doors.' }
    ];
  }

  if (suggestion.id === 'proof') {
    return [
      { id: 'A', format: 'text',
        text: 'Would you trust us telling you ' + name + ' works, or the customer who paid for ' + product + '? Here\u2019s option two.' },
      { id: 'B', format: 'text',
        text: 'One customer. One specific result from ' + name + '. Told straight, no polish.' },
      { id: 'C', format: 'text',
        text: '\uD83D\uDCAC A customer told us something about their ' + product + ' from ' + name + ' we couldn\u2019t have written ourselves.' }
    ];
  }

  // Generic social fallback for any future POST/STORY suggestion.
  return [
    { id: 'A', format: 'text',
      text: 'What\u2019s the one thing about ' + product + ' at ' + name + ' that surprises people the most?' },
    { id: 'B', format: 'text',
      text: 'Most people don\u2019t know this about ' + name + '. Time to fix that.' },
    { id: 'C', format: 'text',
      text: '\u2728 A customer said something about ' + product + ' from ' + name + ' this week that stuck with us.' }
  ];
}

function _crEmailVariations(suggestion) {
  const name = _crBusinessName();
  const product = _crProduct();

  // A \u2014 direct + personal
  // B \u2014 curiosity-led
  // C \u2014 question-led
  return [
    {
      id: 'A', format: 'email',
      subject: 'One question for you',
      body: 'Hey \u2014 I want to ask you something. Out of every option out there for ' + product + ', why did you pick ' + name + '? A one-line reply is more than enough. I read every one myself. Thanks for choosing us.'
    },
    {
      id: 'B', format: 'email',
      subject: 'Something a customer told me this week',
      body: 'A customer told me last week that one small thing tipped them toward ' + name + '. I\u2019ve been thinking about it since. Which small thing was it for you? Hit reply \u2014 no wrong answers, and it stays between us.'
    },
    {
      id: 'C', format: 'email',
      subject: 'Why ' + name + '?',
      body: 'Out of everyone offering ' + product + ', why ' + name + '? I\u2019m asking five customers this week and you\u2019re one of them. There\u2019s no wrong answer, and I\u2019ll read every reply personally.'
    }
  ];
}

function _crVideoVariations(suggestion) {
  const name = _crBusinessName();
  const product = _crProduct();

  return [
    {
      id: 'A', format: 'video',
      hook:   'Most people think ' + product + ' is just ' + product + '.',
      middle: 'Three quick cuts of what actually goes into ' + product + ' at ' + name + '. Timestamp each step in the overlay.',
      cta:    'Follow along for the next batch.'
    },
    {
      id: 'B', format: 'video',
      hook:   'A customer told us something last week we couldn\u2019t stop thinking about.',
      middle: 'Voiceover their exact quote over close-ups of the ' + product + ' at ' + name + '.',
      cta:    'Come try it yourself.'
    },
    {
      id: 'C', format: 'video',
      hook:   'Would you trust us telling you about ' + product + ', or someone who actually paid for it?',
      middle: 'Cut to a real ' + name + ' customer talking about their ' + product + '. Two lines max, then back to the product.',
      cta:    'See what they saw.'
    }
  ];
}

// Plain-text serializer \u2014 used when saving to results.items so the
// stored copy of the variation doesn't lose the label structure.
function _crVariationPreviewText(v) {
  if (!v) return '';
  if (v.format === 'email') {
    return 'SUBJECT: ' + (v.subject || '') + '\n\nBODY: ' + (v.body || '');
  }
  if (v.format === 'video') {
    return 'HOOK: ' + (v.hook || '') + '\n\nMIDDLE: ' + (v.middle || '') + '\n\nCTA: ' + (v.cta || '');
  }
  return v.text || '';
}

// HTML for the inside of a variation card / publish preview \u2014 shape
// depends on the format. Labels are 10-11px uppercase muted per spec,
// content is 13px body copy so the labels don't overpower.
function _crRenderVariationBody(v) {
  if (!v) return '';
  if (v.format === 'email') {
    return ''
      + '<div class="cr-variation-email">'
      +   '<div class="cr-variation-sublabel cr-variation-sublabel-sm">SUBJECT:</div>'
      +   '<div class="cr-variation-subject">' + _escape(v.subject || '') + '</div>'
      +   '<div class="cr-variation-sublabel">BODY:</div>'
      +   '<div class="cr-variation-body">' + _escape(v.body || '') + '</div>'
      + '</div>';
  }
  if (v.format === 'video') {
    return ''
      + '<div class="cr-variation-video">'
      +   '<div class="cr-variation-sublabel">HOOK:</div>'
      +   '<div class="cr-variation-line">' + _escape(v.hook || '') + '</div>'
      +   '<div class="cr-variation-sublabel">MIDDLE:</div>'
      +   '<div class="cr-variation-line">' + _escape(v.middle || '') + '</div>'
      +   '<div class="cr-variation-sublabel">CTA:</div>'
      +   '<div class="cr-variation-line">' + _escape(v.cta || '') + '</div>'
      + '</div>';
  }
  return '<div class="cr-variation-text">' + _escape(v.text || '') + '</div>';
}

// ---------------------------------------------
// Entry / init / navigation
// ---------------------------------------------

// Fresh reset back to step 1. Called from `_openTaskInCreate` (today.js)
// and from Publish / Save-as-draft / Start-over inside this file.
function _resetCreate() {
  const c = getCreate();
  c.step = 1;
  c.selectedSuggestion = null;
  c.selectedPlatform = null;
  c.selectedVariation = null;
  c.customBrief = '';
  c.variations = [];
  c.fromTask = null;
  c.generating = false;
}

// Normalize + hydrate the create state before we render. Handles:
//   \u2022 fromTask arrival: pre-select the matching suggestion + platform
//   \u2022 recovery from impossible steps (e.g. step 3 with no suggestion)
function _crInit() {
  const c = getCreate();
  if (c.step !== 1 && c.step !== 2 && c.step !== 3 && c.step !== 4) c.step = 1;

  // fromTask handoff \u2014 only auto-select once, so if the user picks a
  // different suggestion later we don't stomp it on the next render.
  if (c.fromTask && !c.selectedSuggestion) {
    const sugs = _crSuggestions();
    const match = _crMatchSuggestionForTask(c.fromTask, sugs);
    if (match) {
      c.selectedSuggestion = match;
      c.selectedPlatform = match.platform;
    }
  }

  // Guardrails: never let the user land on a step whose preconditions
  // are missing (e.g. reloaded mid-flow into step 3 with no suggestion).
  if (c.step >= 2 && !c.selectedSuggestion) c.step = 1;
  if (c.step >= 3 && !c.selectedPlatform)   c.step = 2;
  if (c.step === 4 && !c.selectedVariation) c.step = 3;

  _saveState();
}

function _crGoTo(step) {
  const c = getCreate();
  if (c.step === step) return;
  c.step = step;
  _saveState();
  renderCreate(document.getElementById('homeContent'));
}

// ---------------------------------------------
// Public render
// ---------------------------------------------

function renderCreate(container) {
  if (!container) return;
  _crInit();
  const step = getCreate().step;

  let html = '<div class="cr-wrap">';
  if (step === 1) html += _crRenderStep1();
  else if (step === 2) html += _crRenderStep2();
  else if (step === 3) html += _crRenderStep3();
  else if (step === 4) html += _crRenderStep4();
  html += '</div>';

  container.innerHTML = html;

  if (step === 1) _crBindStep1();
  else if (step === 2) _crBindStep2();
  else if (step === 3) _crBindStep3();
  else if (step === 4) _crBindStep4();
}

// ---------------------------------------------
// Step 1 \u2014 Clara's picks
// ---------------------------------------------

function _crRenderStep1() {
  const c = getCreate();
  const name = _crBusinessName();
  const suggestions = _crSuggestions();
  const fromTaskMatch = c.fromTask ? _crMatchSuggestionForTask(c.fromTask, suggestions) : null;
  const selectedId = c.selectedSuggestion ? c.selectedSuggestion.id : null;

  const cardsHtml = suggestions.map(function (s) {
    const active = s.id === selectedId;
    const fromPlan = fromTaskMatch && fromTaskMatch.id === s.id;
    return _crRenderSuggestionCard(s, active, fromPlan);
  }).join('');

  return ''
    + '<h1 class="cr-heading">Clara\u2019s picks for today.</h1>'
    + '<p class="cr-subheading">Based on what you told me about ' + _escape(name) + '.</p>'
    + '<div class="cr-suggestions">' + cardsHtml + '</div>'
    + '<button type="button" class="cr-continue-btn" id="crContinueBtn"' + (selectedId ? '' : ' disabled') + '>'
    +   'Continue \u2192'
    + '</button>';
}

function _crRenderSuggestionCard(s, active, fromPlan) {
  // Platform chip removed \u2014 platform is selected in Step 2 and
  // showing it twice was noise. The type chip carries the format
  // (POST/STORY/EMAIL/VIDEO) which is the interesting bit here.
  return ''
    + '<div class="cr-sug-card' + (active ? ' cr-sug-card-active' : '') + '" data-sug-id="' + s.id + '">'
    +   (fromPlan ? '<div class="cr-sug-from-pill">From your plan</div>' : '')
    +   '<div class="cr-sug-top">'
    +     '<span class="cr-sug-type-chip">' + _escape(s.type) + '</span>'
    +     (active ? '<span class="cr-sug-check" aria-hidden="true">\u2713</span>' : '')
    +   '</div>'
    +   '<div class="cr-sug-angle">' + _escape(s.angle) + '</div>'
    +   '<div class="cr-sug-why" data-why="' + s.id + '">Why this?</div>'
    +   '<div class="cr-sug-reason" data-reason="' + s.id + '">' + _escape(s.why) + '</div>'
    + '</div>';
}

function _crBindStep1() {
  const suggestions = _crSuggestions();

  document.querySelectorAll('[data-sug-id]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      // Don't hijack clicks on the Why toggle \u2014 it manages its own state.
      if (e.target && e.target.closest && e.target.closest('.cr-sug-why')) return;
      const id = card.getAttribute('data-sug-id');
      const chosen = suggestions.find(function (s) { return s.id === id; });
      if (!chosen) return;

      const c = getCreate();
      const changed = !c.selectedSuggestion || c.selectedSuggestion.id !== chosen.id;
      c.selectedSuggestion = chosen;
      c.selectedPlatform = chosen.platform;
      // Any prior variations belong to the old angle \u2014 nuke them so
      // step 3 regenerates from the new suggestion. The brief goes with
      // them since it was edited against the previous angle.
      if (changed) {
        c.variations = [];
        c.customBrief = '';
      }
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  });

  document.querySelectorAll('.cr-sug-why').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.stopPropagation();
      const id = link.getAttribute('data-why');
      const reason = document.querySelector('[data-reason="' + id + '"]');
      if (!reason) return;
      reason.classList.toggle('cr-sug-reason-open');
    });
  });

  const cont = document.getElementById('crContinueBtn');
  if (cont) {
    cont.addEventListener('click', function () {
      if (!getCreate().selectedSuggestion) return;
      _crGoTo(2);
    });
  }
}

// ---------------------------------------------
// Step 2 \u2014 Platform confirm + brief
// ---------------------------------------------

function _crRenderStep2() {
  const c = getCreate();
  const s = c.selectedSuggestion;
  if (!s) return _crRenderStep1(); // guardrail; init should have prevented this

  const platform = c.selectedPlatform || s.platform;
  const platformLabel = _crPlatformLabel(platform);

  const chipsHtml = CR_PLATFORMS.map(function (p) {
    const on = p.key === platform;
    return '<button type="button" class="cr-platform-chip' + (on ? ' cr-platform-chip-active' : '') + '" data-platform="' + p.key + '">' + _escape(p.label) + '</button>';
  }).join('');

  // Prefer any edits the user has already made; fall back to Clara's
  // original angle so the textarea is never empty on first render.
  const briefValue = (c.customBrief && c.customBrief.length)
    ? c.customBrief
    : s.angle;

  // When Generate has been pressed, swap the primary action for the
  // loading state. Everything above stays visible so the user can
  // still see their brief while Clara "works".
  const primary = c.generating
    ? _crRenderLoadingBlock()
    : '<button type="button" class="cr-continue-btn" id="crGenerateBtn">Generate \u2192</button>';

  return ''
    + '<button type="button" class="cr-back-link" id="crBackBtn"' + (c.generating ? ' disabled' : '') + '>\u2190 Back</button>'
    + '<h1 class="cr-heading cr-heading-sm">Where are you posting?</h1>'
    + '<p class="cr-subheading">Clara picked ' + _escape(platformLabel) + ' for this. Change it if you want.</p>'
    + '<div class="cr-platform-row">' + chipsHtml + '</div>'
    + '<div class="cr-brief-head">'
    +   '<span class="cr-brief-label">YOUR BRIEF</span>'
    +   '<span class="cr-brief-hint">Clara wrote this. Edit if you want.</span>'
    + '</div>'
    + '<textarea class="cr-brief-input" id="crBriefInput" rows="3" spellcheck="true"' + (c.generating ? ' disabled' : '') + '>' + _escape(briefValue) + '</textarea>'
    + primary;
}

// Loading block shown between clicking Generate and landing on Step 3.
// Three amber dots pulsing on the shared `cl-bounce` keyframes, with a
// status line below that cycles every 1000ms (label element only \u2014
// the interval is set up in `_crBindStep2`).
function _crRenderLoadingBlock() {
  return ''
    + '<div class="cr-loading">'
    +   '<div class="cr-loading-dots">'
    +     '<span class="cr-loading-dot"></span>'
    +     '<span class="cr-loading-dot"></span>'
    +     '<span class="cr-loading-dot"></span>'
    +   '</div>'
    +   '<div class="cr-loading-label" id="crLoadingLabel">Reading your brief\u2026</div>'
    + '</div>';
}

// Interval + timeout ids used by the loading state. Stored on the
// function itself so a rebind (from a re-render, e.g. platform swap
// during loading) can clean them up before spawning new ones.
_crBindStep2._labelInterval = null;
_crBindStep2._advanceTimeout = null;

function _crBindStep2() {
  const c = getCreate();

  const back = document.getElementById('crBackBtn');
  if (back && !c.generating) {
    back.addEventListener('click', function () { _crGoTo(1); });
  }

  document.querySelectorAll('[data-platform]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      if (getCreate().generating) return;
      const key = chip.getAttribute('data-platform');
      if (!key) return;
      const cur = getCreate();
      if (cur.selectedPlatform === key) return;
      cur.selectedPlatform = key;
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  });

  // Brief textarea \u2014 persist edits on every keystroke without
  // re-rendering (that would blow away caret position). We only need
  // the value written back to state so Generate reads the latest text.
  const briefInput = document.getElementById('crBriefInput');
  if (briefInput) {
    briefInput.addEventListener('input', function () {
      const cur = getCreate();
      cur.customBrief = briefInput.value;
      _saveState();
    });
  }

  const gen = document.getElementById('crGenerateBtn');
  if (gen) {
    gen.addEventListener('click', function () {
      // Flush any pending edits before we lock the UI.
      const input = document.getElementById('crBriefInput');
      const cur = getCreate();
      if (input) cur.customBrief = input.value;
      cur.generating = true;
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  }

  // If we entered this render already generating, wire up the cycling
  // label + 3-second advance-to-step-3 timer. Idempotent thanks to
  // the interval/timeout cleanup at the top.
  if (c.generating) {
    if (_crBindStep2._labelInterval) clearInterval(_crBindStep2._labelInterval);
    if (_crBindStep2._advanceTimeout) clearTimeout(_crBindStep2._advanceTimeout);

    const labels = [
      'Reading your brief\u2026',
      'Crafting your variations\u2026',
      'Almost ready\u2026'
    ];
    let idx = 0;
    _crBindStep2._labelInterval = setInterval(function () {
      idx = (idx + 1) % labels.length;
      const el = document.getElementById('crLoadingLabel');
      if (el) el.textContent = labels[idx];
    }, 1000);

    _crBindStep2._advanceTimeout = setTimeout(function () {
      clearInterval(_crBindStep2._labelInterval);
      _crBindStep2._labelInterval = null;
      _crBindStep2._advanceTimeout = null;

      // Bail if the user has navigated away in the meantime.
      if (appState.mode !== 'home' || appState.activeView !== 'create') return;

      const cur = getCreate();
      if (!cur.generating) return;
      cur.variations = _crVariationsFor(cur.selectedSuggestion);
      cur.selectedVariation = null;
      cur.generating = false;
      _saveState();
      _crGoTo(3);
    }, 3000);
  }
}

// ---------------------------------------------
// Step 3 \u2014 Variations
// ---------------------------------------------

function _crRenderStep3() {
  const c = getCreate();
  if (!c.selectedSuggestion) return _crRenderStep1();

  let variations = Array.isArray(c.variations) ? c.variations : [];
  // Regenerate if empty or if we're staring at legacy variations that
  // don't carry the new `format` field (from before type-specific
  // rendering existed).
  if (variations.length === 0 || !variations[0] || !variations[0].format) {
    variations = _crVariationsFor(c.selectedSuggestion);
    c.variations = variations;
    _saveState();
  }

  const selectedId = c.selectedVariation ? c.selectedVariation.id : null;

  const cardsHtml = variations.map(function (v) {
    const on = v.id === selectedId;
    return ''
      + '<div class="cr-variation-card' + (on ? ' cr-variation-card-active' : '') + '" data-variation="' + v.id + '">'
      +   '<div class="cr-variation-label">VARIATION ' + _escape(v.id) + '</div>'
      +   _crRenderVariationBody(v)
      + '</div>';
  }).join('');

  return ''
    + '<button type="button" class="cr-back-link" id="crBackBtn">\u2190 Back</button>'
    + '<h1 class="cr-heading cr-heading-sm">Pick one to publish.</h1>'
    + '<div class="cr-variations">' + cardsHtml + '</div>'
    + '<button type="button" class="cr-continue-btn" id="crContinueBtn"' + (selectedId ? '' : ' disabled') + '>'
    +   'Continue \u2192'
    + '</button>';
}

function _crBindStep3() {
  const back = document.getElementById('crBackBtn');
  if (back) back.addEventListener('click', function () { _crGoTo(2); });

  document.querySelectorAll('[data-variation]').forEach(function (card) {
    card.addEventListener('click', function () {
      const id = card.getAttribute('data-variation');
      const c = getCreate();
      const v = (c.variations || []).find(function (x) { return x.id === id; });
      if (!v) return;
      c.selectedVariation = v;
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  });

  const cont = document.getElementById('crContinueBtn');
  if (cont) {
    cont.addEventListener('click', function () {
      if (!getCreate().selectedVariation) return;
      _crGoTo(4);
    });
  }
}

// ---------------------------------------------
// Step 4 \u2014 Publish
// ---------------------------------------------

function _crRenderStep4() {
  const c = getCreate();
  if (!c.selectedVariation) return _crRenderStep3();

  const platform = c.selectedPlatform || (c.selectedSuggestion && c.selectedSuggestion.platform) || 'instagram';
  const platformLabel = _crPlatformLabel(platform);
  const icon = CR_PLATFORM_ICONS[platform] || '';

  return ''
    + '<div class="cr-publish-preview">'
    +   '<div class="cr-publish-label">READY TO PUBLISH</div>'
    +   '<div class="cr-publish-body">' + _crRenderVariationBody(c.selectedVariation) + '</div>'
    + '</div>'
    + '<div class="cr-publish-badge">'
    +   '<span class="cr-publish-badge-icon">' + icon + '</span>'
    +   '<span class="cr-publish-badge-label">Publishing to ' + _escape(platformLabel) + '</span>'
    + '</div>'
    + '<div class="cr-publish-options">'
    +   '<button type="button" class="cr-publish-btn" id="crPublishBtn">Publish now</button>'
    +   '<button type="button" class="cr-publish-draft" id="crDraftBtn">Save as draft</button>'
    + '</div>'
    + '<button type="button" class="cr-back-link cr-back-link-center" id="crStartOverBtn">\u2190 Start over</button>';
}

function _crBindStep4() {
  const publishBtn = document.getElementById('crPublishBtn');
  if (publishBtn) {
    publishBtn.addEventListener('click', function () {
      _crPushResultItem('published');
      _resetCreate();
      appState.activeView = 'results';
      _saveState();
      renderApp();
    });
  }

  const draftBtn = document.getElementById('crDraftBtn');
  if (draftBtn) {
    draftBtn.addEventListener('click', function () {
      _crPushResultItem('draft');
      _resetCreate();
      _saveState();
      _crShowDraftToast();
      renderCreate(document.getElementById('homeContent'));
    });
  }

  const over = document.getElementById('crStartOverBtn');
  if (over) {
    over.addEventListener('click', function () {
      _resetCreate();
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  }
}

// ---------------------------------------------
// Publish / draft helpers
// ---------------------------------------------

// Results.js keys its thumbnail styles on `type` (post/image/video/audio).
// Our suggestion types are POST/EMAIL/STORY \u2014 map to the closest
// existing thumb style so the results content list stays consistent
// with the rest of the UI.
function _crResultsType(sugType) {
  const t = String(sugType || '').toUpperCase();
  if (t === 'STORY') return 'image';
  if (t === 'VIDEO') return 'video';
  if (t === 'AUDIO') return 'audio';
  return 'post';
}

function _crPushResultItem(status) {
  const c = getCreate();
  const s = c.selectedSuggestion || {};
  const platform = c.selectedPlatform || s.platform || 'instagram';
  const item = {
    id: 'item-' + Date.now(),
    type: _crResultsType(s.type),
    platform: platform,
    angle: s.angle || '',
    variation: _crVariationPreviewText(c.selectedVariation),
    timestamp: Date.now(),
    reach: 0,
    status: status
  };
  getResults().items.push(item);
}

function _crShowDraftToast() {
  const existing = document.getElementById('crDraftToast');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

  const toast = document.createElement('div');
  toast.id = 'crDraftToast';
  toast.className = 'cr-draft-toast';
  toast.textContent = 'Saved as draft';
  document.body.appendChild(toast);

  requestAnimationFrame(function () {
    toast.classList.add('cr-draft-toast-show');
  });

  setTimeout(function () {
    toast.classList.remove('cr-draft-toast-show');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  }, 1800);
}

// ---------------------------------------------
// Small formatting helpers
// ---------------------------------------------

function _crPlatformLabel(key) {
  const found = CR_PLATFORMS.find(function (p) { return p.key === key; });
  return found ? found.label : (key ? key.charAt(0).toUpperCase() + key.slice(1) : '');
}

window.renderCreate = renderCreate;
window._resetCreate = _resetCreate;
