// ---------------------------------------------
// Clarity 2.0 — Create View (format-first, 4 steps)
// ---------------------------------------------
//
// The Create wizard now starts with the question that actually matches
// how people think about content: "what am I making?" — an image, a
// video, some text, or an audio piece. Everything else (platform,
// sub-format, angle, variations) flows from that choice.
//
// State (lives on the active concept's `create` object):
//   step:              1 | 2 | 3 | 4
//   contentType:       'image' | 'video' | 'text' | 'audio'
//   subFormat:         (text only) 'post' | 'email' | 'newsletter' | 'thread'
//   selectedPlatform:  'instagram' | 'tiktok' | 'youtube' | 'facebook'
//                    | 'linkedin' | 'x' | 'email' | 'podcast'
//   customBrief:       Clara's draft brief, editable
//   variations:        cached [{id, format, ...}] regenerated on step 3
//   selectedVariation: the picked one
//   fromTask:          Today task, if the user arrived via one
//
// Coming from a Today task pre-selects a sensible (contentType,
// subFormat, platform) triple so the user can hit Continue immediately.

// ---------------------------------------------
// Content-type catalog (Step 1) + platform lists
// ---------------------------------------------

const CR_CONTENT_TYPES = [
  {
    key: 'image',
    label: 'Image',
    desc: 'Photo, carousel, or graphic',
    icon:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="3" y="3" width="18" height="18" rx="2"/>'
      + '<circle cx="8.5" cy="8.5" r="1.5"/>'
      + '<polyline points="21 15 16 10 5 21"/>'
      + '</svg>',
    // Platforms where an image post makes sense as a first-class output.
    platforms: ['instagram', 'facebook', 'linkedin', 'x']
  },
  {
    key: 'video',
    label: 'Video',
    desc: 'Reel, short, or TikTok clip',
    icon:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
      + '<polygon points="23 7 16 12 23 17 23 7"/>'
      + '<rect x="1" y="5" width="15" height="14" rx="2"/>'
      + '</svg>',
    platforms: ['instagram', 'tiktok', 'youtube', 'facebook']
  },
  {
    key: 'text',
    label: 'Text',
    desc: 'Post, email, newsletter, or thread',
    icon:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
      + '<line x1="4" y1="7" x2="20" y2="7"/>'
      + '<line x1="4" y1="12" x2="20" y2="12"/>'
      + '<line x1="4" y1="17" x2="14" y2="17"/>'
      + '</svg>',
    platforms: ['linkedin', 'x', 'instagram', 'facebook', 'email']
  },
  {
    key: 'audio',
    label: 'Audio',
    desc: 'Voice note, podcast clip, or ad',
    icon:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="9" y="3" width="6" height="12" rx="3"/>'
      + '<path d="M5 11a7 7 0 0 0 14 0"/>'
      + '<line x1="12" y1="18" x2="12" y2="22"/>'
      + '<line x1="8" y1="22" x2="16" y2="22"/>'
      + '</svg>',
    platforms: ['instagram', 'youtube', 'tiktok', 'podcast']
  }
];

// Text-only sub-formats. Each one narrows the set of platforms so the
// user can't pick an incompatible combination (Newsletter on TikTok
// makes no sense, Email is its own channel entirely, etc.).
const CR_SUB_FORMATS = [
  { key: 'post',       label: 'Social post', platforms: ['linkedin', 'x', 'instagram', 'facebook'] },
  { key: 'thread',     label: 'Thread',      platforms: ['x', 'linkedin'] },
  { key: 'email',      label: 'Email',       platforms: ['email'] },
  { key: 'newsletter', label: 'Newsletter',  platforms: ['email'] }
];

// ---------------------------------------------
// Platform catalog + icons (12x12 monochrome, tinted via currentColor)
// ---------------------------------------------

const CR_PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok',    label: 'TikTok'    },
  { key: 'youtube',   label: 'YouTube'   },
  { key: 'facebook',  label: 'Facebook'  },
  { key: 'linkedin',  label: 'LinkedIn'  },
  { key: 'x',         label: 'X'         },
  { key: 'email',     label: 'Email'     },
  { key: 'podcast',   label: 'Podcast'   }
];

const CR_PLATFORM_ICONS = {
  instagram:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">'
    + '<rect x="3" y="3" width="18" height="18" rx="5"/>'
    + '<circle cx="12" cy="12" r="4"/>'
    + '<circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none"/>'
    + '</svg>',
  tiktok:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">'
    + '<path d="M19.5 8.5c-1.6 0-3-.8-3.9-2v9c0 3.1-2.5 5.6-5.6 5.6S4.4 18.6 4.4 15.5 6.9 10 10 10c.3 0 .7 0 1 .1v3.2c-.3-.1-.6-.2-1-.2-1.4 0-2.6 1.1-2.6 2.5s1.1 2.5 2.6 2.5 2.6-1.1 2.6-2.5V3h3c.4 2.6 2.4 4.5 5 4.5v3z"/>'
    + '</svg>',
  youtube:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">'
    + '<path d="M22 8.4c-.2-1.2-1-2.2-2.2-2.4C17.7 5.5 12 5.5 12 5.5s-5.7 0-7.8.5C3 6.2 2.2 7.2 2 8.4 1.5 10.5 1.5 12 1.5 12s0 1.5.5 3.6c.2 1.2 1 2.2 2.2 2.4 2.1.5 7.8.5 7.8.5s5.7 0 7.8-.5c1.2-.2 2-1.2 2.2-2.4.5-2.1.5-3.6.5-3.6s0-1.5-.5-3.6zM10 15V9l5 3-5 3z"/>'
    + '</svg>',
  facebook:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">'
    + '<path d="M13 22v-8h3l.5-4H13V7.5c0-1.1.4-2 2-2h1.5V2c-.5-.1-1.5-.2-2.5-.2-3 0-5 1.8-5 5V10H6v4h3v8h4z"/>'
    + '</svg>',
  linkedin:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">'
    + '<rect x="3" y="9" width="4" height="12" rx="0.5"/>'
    + '<circle cx="5" cy="5" r="2"/>'
    + '<path d="M9 9h4v1.8c.7-1 2-2 3.8-2 3.2 0 4.2 2 4.2 5V21h-4v-6.1c0-1.4-.6-2.3-2-2.3s-2 .9-2 2.3V21H9V9z"/>'
    + '</svg>',
  x:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">'
    + '<path d="M17.5 3h3.4l-7.4 8.5L22 21h-6.8l-5.3-6.9L3.7 21H.3l7.9-9L.5 3h6.9l4.8 6.3L17.5 3zm-1.2 16h1.9L7.8 5H5.8l10.5 14z"/>'
    + '</svg>',
  email:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="3" y="5" width="18" height="14" rx="2"/>'
    + '<path d="M3 7l9 6 9-6"/>'
    + '</svg>',
  podcast:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="9" y="3" width="6" height="12" rx="3"/>'
    + '<path d="M5 11a7 7 0 0 0 14 0"/>'
    + '<line x1="12" y1="18" x2="12" y2="22"/>'
    + '</svg>'
};

// Today task → Create defaults. Keeps the tap-through from Today
// working: POST-style tasks land on Image, OUTREACH on Text/Email,
// OFFER on Text/Post. Platform is picked to match the business reach.
const CR_TASK_DEFAULTS = {
  POST:     function (b) { return { contentType: 'image', subFormat: null,   platform: b.reach === 'online' ? 'linkedin' : 'instagram' }; },
  OUTREACH: function ()  { return { contentType: 'text',  subFormat: 'email', platform: 'email' }; },
  OFFER:    function (b) { return { contentType: 'text',  subFormat: 'post',  platform: b.reach === 'online' ? 'linkedin' : 'instagram' }; }
};

// ---------------------------------------------
// Business-context helpers (used everywhere for specific copy)
// ---------------------------------------------

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

function _crAllowedPlatforms() {
  const c = getCreate();
  const type = CR_CONTENT_TYPES.find(function (t) { return t.key === c.contentType; });
  if (!type) return [];
  if (c.contentType !== 'text') return type.platforms.slice();
  const sub = CR_SUB_FORMATS.find(function (s) { return s.key === c.subFormat; });
  if (!sub) return type.platforms.slice();
  return sub.platforms.filter(function (p) { return type.platforms.indexOf(p) !== -1; });
}

function _crDefaultPlatformFor(contentType, subFormat) {
  // Prefer a platform the business already said they're on (Q4). Fall
  // back to the first allowed platform for this format so Step 2 never
  // renders with nothing pre-selected.
  const b = getBusiness();
  const type = CR_CONTENT_TYPES.find(function (t) { return t.key === contentType; });
  if (!type) return null;
  let allowed = type.platforms;
  if (contentType === 'text' && subFormat) {
    const sub = CR_SUB_FORMATS.find(function (s) { return s.key === subFormat; });
    if (sub) allowed = sub.platforms.filter(function (p) { return type.platforms.indexOf(p) !== -1; });
  }
  if (Array.isArray(b.channels)) {
    const chLower = b.channels.map(function (ch) { return String(ch).toLowerCase(); });
    for (let i = 0; i < allowed.length; i++) {
      if (chLower.some(function (ch) { return ch.indexOf(allowed[i]) !== -1; })) return allowed[i];
    }
  }
  return allowed[0] || null;
}

// ---------------------------------------------
// Brief generation (Step 2 seed text)
// ---------------------------------------------

// Clara authors a starting brief per (contentType, subFormat) so the
// user has real words to react to instead of a blank box. Anchored to
// business.name and business.product so it never reads generic.
function _crDefaultBrief(contentType, subFormat) {
  const name = _crBusinessName();
  const product = _crProduct();

  if (contentType === 'image') {
    return 'One image that shows the real ' + product + ' from ' + name + '. Not a stock shot — a photo the audience knows only you could take.';
  }
  if (contentType === 'video') {
    return 'A short video (15–30s) that opens with a hook, shows something concrete about ' + product + ' at ' + name + ', and ends with a reason to follow.';
  }
  if (contentType === 'audio') {
    return 'A 30-second voice piece introducing ' + name + ' — who it\u2019s for, what ' + product + ' actually does for them, and a single line at the end that tells them what to do next.';
  }
  if (contentType === 'text') {
    if (subFormat === 'email') {
      return 'A personal, one-question email to a real customer of ' + name + '. No pitch. Just find out why they picked ' + product + '.';
    }
    if (subFormat === 'newsletter') {
      return 'A short newsletter update from ' + name + ': one thing that happened this week, one thing coming next, one small ask of the reader.';
    }
    if (subFormat === 'thread') {
      return 'A short thread (5–7 posts) about one thing most people misunderstand about ' + product + '. End with the truth as ' + name + ' sees it.';
    }
    return 'A short post about one specific thing that makes ' + product + ' at ' + name + ' worth choosing. No adjectives — just the fact and why it matters.';
  }
  return 'Something specific and true about ' + name + ' that would make one right person stop scrolling.';
}

// ---------------------------------------------
// Variation generators — one per (contentType, subFormat)
// ---------------------------------------------
//
// Every generator returns 3 variations tagged A/B/C:
//   A — direct / declarative
//   B — story / customer voice
//   C — question / hook
//
// The shape of each variation depends on the format, and is what
// _crRenderVariationBody knows how to draw:
//   image      — { id, format:'image',      caption, visual }
//   video      — { id, format:'video',      hook, middle, cta }
//   audio      — { id, format:'audio',      hook, spot, cta }
//   text/post  — { id, format:'post',       text }
//   text/email — { id, format:'email',      subject, body }
//   text/news  — { id, format:'newsletter', headline, body }
//   text/thrd  — { id, format:'thread',     lines: [] }

function _crVariationsFor(contentType, subFormat) {
  if (contentType === 'image') return _crImageVariations();
  if (contentType === 'video') return _crVideoVariations();
  if (contentType === 'audio') return _crAudioVariations();
  if (contentType === 'text') {
    if (subFormat === 'email')      return _crEmailVariations();
    if (subFormat === 'newsletter') return _crNewsletterVariations();
    if (subFormat === 'thread')     return _crThreadVariations();
    return _crPostVariations();
  }
  return _crPostVariations();
}

function _crImageVariations() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', format: 'image',
      caption: 'This is what ' + product + ' from ' + name + ' actually looks like. No filter, no staging.',
      visual: 'Straight-on close-up of the real ' + product + '. Natural light. No props.'
    },
    { id: 'B', format: 'image',
      caption: 'A customer sent us this after choosing ' + product + ' at ' + name + '. We asked if we could share it.',
      visual: 'Customer\u2019s own photo of the ' + product + ' in their space. Slight grain feels honest, not polished.'
    },
    { id: 'C', format: 'image',
      caption: 'One question we get about ' + product + ' at ' + name + ' — and the honest answer, in a single frame.',
      visual: 'Text overlay in the top third with the question. Below it, a photo that answers it wordlessly.'
    }
  ];
}

function _crVideoVariations() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', format: 'video',
      hook:   'Most people think ' + product + ' is just ' + product + '.',
      middle: 'Three quick cuts of what actually goes into ' + product + ' at ' + name + '. Overlay each step with a one-line caption.',
      cta:    'Follow along for the next batch.'
    },
    { id: 'B', format: 'video',
      hook:   'A customer told us something last week we couldn\u2019t stop thinking about.',
      middle: 'Voiceover their exact quote over close-ups of ' + product + ' at ' + name + '. No music.',
      cta:    'Come try it yourself.'
    },
    { id: 'C', format: 'video',
      hook:   'Would you trust us telling you ' + name + ' is worth it, or someone who actually paid?',
      middle: 'Cut to a real ' + name + ' customer talking about ' + product + '. Two lines max, then back to the product.',
      cta:    'See what they saw.'
    }
  ];
}

function _crAudioVariations() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', format: 'audio',
      hook: 'You know that thing where you keep meaning to try ' + product + ' but never do?',
      spot: 'One line about who ' + name + ' is for. One line about what ' + product + ' actually does. One line about the smallest way to try it.',
      cta:  'Tap the link. That\u2019s it.'
    },
    { id: 'B', format: 'audio',
      hook: 'A customer told me last week that ' + product + ' from ' + name + ' fixed one thing they didn\u2019t know was broken.',
      spot: 'Quote the customer verbatim. Then say, in your own voice, why it fixes it. Keep it under 20 seconds.',
      cta:  'If that sounds like you — you know where to find us.'
    },
    { id: 'C', format: 'audio',
      hook: 'What do you actually get from ' + name + ' that you can\u2019t get anywhere else?',
      spot: 'Answer with one specific thing. Not "quality" — a concrete detail about ' + product + '.',
      cta:  'That\u2019s ' + name + '. Come see.'
    }
  ];
}

function _crPostVariations() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', format: 'post',
      text: 'One thing about ' + product + ' at ' + name + ' most people don\u2019t know until they try it. Sharing it in one sentence today.'
    },
    { id: 'B', format: 'post',
      text: 'A customer said something about ' + product + ' from ' + name + ' this week that we couldn\u2019t have written ourselves. Their exact words, unchanged.'
    },
    { id: 'C', format: 'post',
      text: 'Would you rather hear us tell you why ' + product + ' at ' + name + ' works, or read what one of our customers said about it? Here\u2019s option two.'
    }
  ];
}

function _crEmailVariations() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', format: 'email',
      subject: 'One question for you',
      body: 'Hey — I want to ask you something. Out of every option out there for ' + product + ', why did you pick ' + name + '? A one-line reply is more than enough. I read every one myself. Thanks for choosing us.'
    },
    { id: 'B', format: 'email',
      subject: 'Something a customer told me this week',
      body: 'A customer told me last week that one small thing tipped them toward ' + name + '. I\u2019ve been thinking about it since. Which small thing was it for you? Hit reply — no wrong answers, and it stays between us.'
    },
    { id: 'C', format: 'email',
      subject: 'Why ' + name + '?',
      body: 'Out of everyone offering ' + product + ', why ' + name + '? I\u2019m asking five customers this week and you\u2019re one of them. There\u2019s no wrong answer, and I\u2019ll read every reply personally.'
    }
  ];
}

function _crNewsletterVariations() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', format: 'newsletter',
      headline: 'This week at ' + name,
      body: 'One thing that happened: (the specific update). One thing coming next: (what\u2019s launching / opening / changing). One small ask: reply and tell me if this newsletter is useful. That\u2019s the whole thing.'
    },
    { id: 'B', format: 'newsletter',
      headline: 'What a customer taught me',
      body: 'A customer said something about ' + product + ' this week I hadn\u2019t heard before. Sharing it, and what we\u2019re changing because of it. If you\u2019re in the same boat, I\u2019d love to hear from you.'
    },
    { id: 'C', format: 'newsletter',
      headline: 'Behind the scenes at ' + name,
      body: 'A short walkthrough of what actually goes into ' + product + ' this month. No numbers, no fluff — just the real work. If you know someone who\u2019d like this, forward it on.'
    }
  ];
}

function _crThreadVariations() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', format: 'thread',
      lines: [
        'One thing most people get wrong about ' + product + ':',
        'They think it\u2019s about (the obvious thing). It\u2019s not.',
        'It\u2019s actually about (the real thing). Here\u2019s why:',
        '(One concrete example from ' + name + '\u2019s day-to-day.)',
        'That\u2019s the difference. Not glamorous. But it\u2019s the whole game.'
      ]
    },
    { id: 'B', format: 'thread',
      lines: [
        'A customer told me something about ' + name + ' last week I couldn\u2019t stop thinking about.',
        'They said: "(paste their exact words, unchanged)."',
        'I asked what they meant.',
        'Turns out (the specific thing they meant).',
        'It changed how I talk about ' + product + '. Here\u2019s what I mean:',
        '(One sentence you now say differently.)'
      ]
    },
    { id: 'C', format: 'thread',
      lines: [
        'Everyone asks the same three questions about ' + product + '. Answering them honestly:',
        '1. (Question one) — the answer isn\u2019t what most people expect.',
        '2. (Question two) — this is where ' + name + ' is actually different.',
        '3. (Question three) — and this is where we\u2019re still figuring it out.',
        'If any of those hit — reply. I read them all.'
      ]
    }
  ];
}

// ---------------------------------------------
// Variation rendering (Step 3 cards + Step 4 preview)
// ---------------------------------------------

function _crRenderVariationBody(v) {
  if (!v) return '';
  if (v.format === 'image') {
    return ''
      + '<div class="cr-variation-image">'
      +   '<div class="cr-variation-sublabel cr-variation-sublabel-sm">CAPTION:</div>'
      +   '<div class="cr-variation-body">' + _escape(v.caption || '') + '</div>'
      +   '<div class="cr-variation-sublabel">VISUAL:</div>'
      +   '<div class="cr-variation-line">' + _escape(v.visual || '') + '</div>'
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
  if (v.format === 'audio') {
    return ''
      + '<div class="cr-variation-audio">'
      +   '<div class="cr-variation-sublabel">HOOK:</div>'
      +   '<div class="cr-variation-line">' + _escape(v.hook || '') + '</div>'
      +   '<div class="cr-variation-sublabel">SPOT:</div>'
      +   '<div class="cr-variation-line">' + _escape(v.spot || '') + '</div>'
      +   '<div class="cr-variation-sublabel">CTA:</div>'
      +   '<div class="cr-variation-line">' + _escape(v.cta || '') + '</div>'
      + '</div>';
  }
  if (v.format === 'email') {
    return ''
      + '<div class="cr-variation-email">'
      +   '<div class="cr-variation-sublabel cr-variation-sublabel-sm">SUBJECT:</div>'
      +   '<div class="cr-variation-subject">' + _escape(v.subject || '') + '</div>'
      +   '<div class="cr-variation-sublabel">BODY:</div>'
      +   '<div class="cr-variation-body">' + _escape(v.body || '') + '</div>'
      + '</div>';
  }
  if (v.format === 'newsletter') {
    return ''
      + '<div class="cr-variation-newsletter">'
      +   '<div class="cr-variation-sublabel cr-variation-sublabel-sm">HEADLINE:</div>'
      +   '<div class="cr-variation-subject">' + _escape(v.headline || '') + '</div>'
      +   '<div class="cr-variation-sublabel">BODY:</div>'
      +   '<div class="cr-variation-body">' + _escape(v.body || '') + '</div>'
      + '</div>';
  }
  if (v.format === 'thread') {
    const lines = Array.isArray(v.lines) ? v.lines : [];
    return ''
      + '<div class="cr-variation-thread">'
      +   lines.map(function (l, i) {
            return '<div class="cr-variation-thread-line">'
              +      '<span class="cr-variation-thread-num">' + (i + 1) + '</span>'
              +      '<span class="cr-variation-thread-text">' + _escape(l) + '</span>'
              +    '</div>';
          }).join('')
      + '</div>';
  }
  // Default = plain post text
  return '<div class="cr-variation-text">' + _escape(v.text || '') + '</div>';
}

// Plain-text serializer for saving into results.items so the stored
// copy keeps its structure (labels, thread numbering, etc.).
function _crVariationPreviewText(v) {
  if (!v) return '';
  if (v.format === 'image')      return 'CAPTION: ' + (v.caption || '') + '\n\nVISUAL: ' + (v.visual || '');
  if (v.format === 'video')      return 'HOOK: ' + (v.hook || '') + '\n\nMIDDLE: ' + (v.middle || '') + '\n\nCTA: ' + (v.cta || '');
  if (v.format === 'audio')      return 'HOOK: ' + (v.hook || '') + '\n\nSPOT: ' + (v.spot || '') + '\n\nCTA: ' + (v.cta || '');
  if (v.format === 'email')      return 'SUBJECT: ' + (v.subject || '') + '\n\nBODY: ' + (v.body || '');
  if (v.format === 'newsletter') return 'HEADLINE: ' + (v.headline || '') + '\n\nBODY: ' + (v.body || '');
  if (v.format === 'thread') {
    const lines = Array.isArray(v.lines) ? v.lines : [];
    return lines.map(function (l, i) { return (i + 1) + '. ' + l; }).join('\n');
  }
  return v.text || '';
}

// ---------------------------------------------
// Entry / init / navigation
// ---------------------------------------------

function _resetCreate() {
  const c = getCreate();
  c.step = 1;
  c.contentType = null;
  c.subFormat = null;
  c.selectedPlatform = null;
  c.selectedVariation = null;
  c.customBrief = '';
  c.variations = [];
  c.fromTask = null;
  c.generating = false;
}

// Hydrate the create state before rendering. Handles:
//   • fromTask arrival: pre-select contentType/subFormat/platform
//   • recovery from impossible steps
//   • platform re-derive when the current one isn't allowed by the
//     current (contentType, subFormat) combo
function _crInit() {
  const c = getCreate();
  if (c.step !== 1 && c.step !== 2 && c.step !== 3 && c.step !== 4) c.step = 1;

  // From-task handoff runs once. If the user later changes contentType
  // manually we don't stomp their choice on the next render.
  if (c.fromTask && !c.contentType) {
    const taskType = String(c.fromTask.type || '').toUpperCase();
    const getDefaults = CR_TASK_DEFAULTS[taskType];
    if (typeof getDefaults === 'function') {
      const defaults = getDefaults(getBusiness());
      c.contentType = defaults.contentType;
      c.subFormat = defaults.subFormat;
      c.selectedPlatform = defaults.platform;
    }
  }

  // Guardrails.
  if (c.step >= 2 && !c.contentType) c.step = 1;
  if (c.step >= 3 && !c.selectedPlatform) c.step = 2;
  if (c.step === 4 && !c.selectedVariation) c.step = 3;

  // If contentType is text but no subFormat, default to 'post'.
  if (c.contentType === 'text' && !c.subFormat) c.subFormat = 'post';
  // If contentType is NOT text, subFormat must be null.
  if (c.contentType && c.contentType !== 'text' && c.subFormat) c.subFormat = null;

  // Make sure the currently-selected platform is still allowed by the
  // current type+subformat combo. If not, pick a sensible default.
  if (c.contentType) {
    const allowed = _crAllowedPlatforms();
    if (!c.selectedPlatform || allowed.indexOf(c.selectedPlatform) === -1) {
      c.selectedPlatform = _crDefaultPlatformFor(c.contentType, c.subFormat);
    }
  }

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
// Step 1 — Content type
// ---------------------------------------------

function _crRenderStep1() {
  const c = getCreate();
  const name = _crBusinessName();
  const selected = c.contentType;

  const cardsHtml = CR_CONTENT_TYPES.map(function (t) {
    const on = t.key === selected;
    return ''
      + '<button type="button" class="cr-format-card' + (on ? ' cr-format-card-active' : '') + '" data-format="' + t.key + '">'
      +   (on ? '<span class="cr-format-check" aria-hidden="true">\u2713</span>' : '')
      +   '<span class="cr-format-icon">' + t.icon + '</span>'
      +   '<span class="cr-format-title">' + _escape(t.label) + '</span>'
      +   '<span class="cr-format-desc">' + _escape(t.desc) + '</span>'
      + '</button>';
  }).join('');

  return ''
    + '<h1 class="cr-heading">What are you creating today?</h1>'
    + '<p class="cr-subheading">Pick a format for ' + _escape(name) + ' to get started.</p>'
    + '<div class="cr-format-grid">' + cardsHtml + '</div>'
    + '<button type="button" class="cr-continue-btn" id="crContinueBtn"' + (selected ? '' : ' disabled') + '>'
    +   'Continue \u2192'
    + '</button>';
}

function _crBindStep1() {
  document.querySelectorAll('[data-format]').forEach(function (card) {
    card.addEventListener('click', function () {
      const key = card.getAttribute('data-format');
      if (!key) return;
      const c = getCreate();
      const changed = c.contentType !== key;
      c.contentType = key;
      // Reset downstream state when the format actually changes so we
      // don't carry stale platform / subFormat / variations forward.
      if (changed) {
        c.subFormat = key === 'text' ? 'post' : null;
        c.selectedPlatform = _crDefaultPlatformFor(key, c.subFormat);
        c.variations = [];
        c.selectedVariation = null;
        c.customBrief = '';
      }
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  });

  const cont = document.getElementById('crContinueBtn');
  if (cont) {
    cont.addEventListener('click', function () {
      if (!getCreate().contentType) return;
      _crGoTo(2);
    });
  }
}

// ---------------------------------------------
// Step 2 — Platform + (if text) sub-format + brief
// ---------------------------------------------

function _crRenderStep2() {
  const c = getCreate();
  if (!c.contentType) return _crRenderStep1();

  const allowed = _crAllowedPlatforms();
  const platform = c.selectedPlatform || allowed[0];
  const platformLabel = _crPlatformLabel(platform);

  // Sub-format row is text-only. Chips filter platforms live via
  // _crAllowedPlatforms so an incompatible pair can never render.
  const subFormatRow = c.contentType === 'text'
    ? (''
        + '<div class="cr-field-label">Sub-format</div>'
        + '<div class="cr-subformat-row">'
        +   CR_SUB_FORMATS.map(function (s) {
              const on = s.key === c.subFormat;
              return '<button type="button" class="cr-platform-chip' + (on ? ' cr-platform-chip-active' : '') + '" data-subformat="' + s.key + '">' + _escape(s.label) + '</button>';
            }).join('')
        + '</div>'
      )
    : '';

  const chipsHtml = allowed.map(function (key) {
    const p = CR_PLATFORMS.find(function (pp) { return pp.key === key; });
    if (!p) return '';
    const on = p.key === platform;
    return ''
      + '<button type="button" class="cr-platform-chip cr-platform-chip-icon' + (on ? ' cr-platform-chip-active' : '') + '" data-platform="' + p.key + '">'
      +   '<span class="cr-platform-chip-glyph">' + (CR_PLATFORM_ICONS[p.key] || '') + '</span>'
      +   '<span>' + _escape(p.label) + '</span>'
      + '</button>';
  }).join('');

  // Seed the brief from Clara's default the FIRST time we land on this
  // step (i.e. customBrief is empty). Subsequent renders show whatever
  // the user typed last.
  if (!c.customBrief || !c.customBrief.trim()) {
    c.customBrief = _crDefaultBrief(c.contentType, c.subFormat);
    _saveState();
  }

  const primary = c.generating
    ? _crRenderLoadingBlock()
    : '<button type="button" class="cr-continue-btn" id="crGenerateBtn">Generate \u2192</button>';

  return ''
    + '<button type="button" class="cr-back-link" id="crBackBtn"' + (c.generating ? ' disabled' : '') + '>\u2190 Back</button>'
    + '<h1 class="cr-heading cr-heading-sm">Where\u2019s it going?</h1>'
    + '<p class="cr-subheading">Clara pre-picked ' + _escape(platformLabel) + '. Change it if you want.</p>'
    + subFormatRow
    + '<div class="cr-field-label">Platform</div>'
    + '<div class="cr-platform-row">' + chipsHtml + '</div>'
    + '<div class="cr-brief-head">'
    +   '<span class="cr-brief-label">YOUR BRIEF</span>'
    +   '<span class="cr-brief-hint">Clara wrote this. Edit if you want.</span>'
    + '</div>'
    + '<textarea class="cr-brief-input" id="crBriefInput" rows="4" spellcheck="true"' + (c.generating ? ' disabled' : '') + '>' + _escape(c.customBrief) + '</textarea>'
    + primary;
}

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

_crBindStep2._labelInterval = null;
_crBindStep2._advanceTimeout = null;

function _crBindStep2() {
  const c = getCreate();

  const back = document.getElementById('crBackBtn');
  if (back && !c.generating) {
    back.addEventListener('click', function () { _crGoTo(1); });
  }

  document.querySelectorAll('[data-subformat]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      if (getCreate().generating) return;
      const key = chip.getAttribute('data-subformat');
      const cur = getCreate();
      if (cur.subFormat === key) return;
      cur.subFormat = key;
      // Refresh brief + platform since the sub-format changes both.
      cur.customBrief = _crDefaultBrief(cur.contentType, cur.subFormat);
      cur.selectedPlatform = _crDefaultPlatformFor(cur.contentType, cur.subFormat);
      cur.variations = [];
      cur.selectedVariation = null;
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  });

  document.querySelectorAll('[data-platform]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      if (getCreate().generating) return;
      const key = chip.getAttribute('data-platform');
      const cur = getCreate();
      if (cur.selectedPlatform === key) return;
      cur.selectedPlatform = key;
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  });

  const briefInput = document.getElementById('crBriefInput');
  if (briefInput) {
    briefInput.addEventListener('input', function () {
      getCreate().customBrief = briefInput.value;
      _saveState();
    });
  }

  const gen = document.getElementById('crGenerateBtn');
  if (gen) {
    gen.addEventListener('click', function () {
      const input = document.getElementById('crBriefInput');
      const cur = getCreate();
      if (input) cur.customBrief = input.value;
      cur.generating = true;
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  }

  if (c.generating) {
    if (_crBindStep2._labelInterval) clearInterval(_crBindStep2._labelInterval);
    if (_crBindStep2._advanceTimeout) clearTimeout(_crBindStep2._advanceTimeout);

    const labels = ['Reading your brief\u2026', 'Crafting your variations\u2026', 'Almost ready\u2026'];
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

      if (appState.mode !== 'home' || appState.activeView !== 'create') return;

      const cur = getCreate();
      if (!cur.generating) return;
      cur.variations = _crVariationsFor(cur.contentType, cur.subFormat);
      cur.selectedVariation = null;
      cur.generating = false;
      _saveState();
      _crGoTo(3);
    }, 3000);
  }
}

// ---------------------------------------------
// Step 3 — Variations
// ---------------------------------------------

function _crRenderStep3() {
  const c = getCreate();
  if (!c.contentType) return _crRenderStep1();

  let variations = Array.isArray(c.variations) ? c.variations : [];
  if (variations.length === 0 || !variations[0] || !variations[0].format) {
    variations = _crVariationsFor(c.contentType, c.subFormat);
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
// Step 4 — Publish
// ---------------------------------------------

function _crRenderStep4() {
  const c = getCreate();
  if (!c.selectedVariation) return _crRenderStep3();

  const platform = c.selectedPlatform || (_crAllowedPlatforms()[0] || 'instagram');
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

// Map the new content-type + sub-format to the thumb style
// results.js already understands (post / image / video / audio).
function _crResultsType(contentType, subFormat) {
  if (contentType === 'image') return 'image';
  if (contentType === 'video') return 'video';
  if (contentType === 'audio') return 'audio';
  // Text falls under 'post' for the results thumbnail — good enough
  // whether it's a social post, thread, newsletter, or email.
  return 'post';
}

function _crPushResultItem(status) {
  const c = getCreate();
  const platform = c.selectedPlatform || 'instagram';
  const item = {
    id: 'item-' + Date.now(),
    type: _crResultsType(c.contentType, c.subFormat),
    platform: platform,
    angle: (c.customBrief || '').trim(),
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
