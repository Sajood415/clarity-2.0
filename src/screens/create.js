// ---------------------------------------------
// Clarity 2.0 — Create View (format-first, 4 steps)
// ---------------------------------------------
//
// The Create wizard starts with the question that actually matches how
// people think about content: "what am I making?" — image, video, text,
// or audio. Everything else (platform, sub-format, angle, variations)
// flows from that choice.
//
// State (lives on the active concept's `create` object):
//   step:               1 | 2 | 3 | 4
//   contentType:        'image' | 'video' | 'text' | 'audio'
//   subFormat:          (text only) 'post' | 'email' | 'newsletter' | 'thread'
//   selectedPlatform:   'instagram' | 'tiktok' | 'youtube' | 'facebook'
//                     | 'linkedin' | 'x' | 'email' | 'podcast'
//   customBrief:        Clara's draft brief, editable
//   variations:         cached [{id, angle, format, ...}] regenerated on step 3
//   selectedVariation:  the picked one
//   fromTask:           Today task, if the user arrived via one
//   regenerationCount:  bumped by "Regenerate" on Step 3; picks a new
//                       3-item window into the format's 6-item pool
//   publishing:         transient flag; true while the publish success
//                       overlay is playing before redirecting to Insights
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

const CR_SUB_FORMATS = [
  { key: 'post',       label: 'Social post', platforms: ['linkedin', 'x', 'instagram', 'facebook'] },
  { key: 'thread',     label: 'Thread',      platforms: ['x', 'linkedin'] },
  { key: 'email',      label: 'Email',       platforms: ['email'] },
  { key: 'newsletter', label: 'Newsletter',  platforms: ['email'] }
];

// Angle labels sit in place of the old "VARIATION A / B / C". Each
// variation carries an `angle` field that maps into this. Direct =
// declarative, Story = customer-voice, Question = hook.
const CR_ANGLE_META = {
  Direct:   { label: 'Direct',   sub: 'Declarative, no hedging' },
  Story:    { label: 'Story',    sub: 'From a customer\u2019s mouth' },
  Question: { label: 'Question', sub: 'Opens with a hook' }
};

// ---------------------------------------------
// Platform catalog + icons
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

const CR_COPY_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<rect x="9" y="9" width="12" height="12" rx="2"/>'
  + '<path d="M5 15V5a2 2 0 0 1 2-2h10"/>'
  + '</svg>';

const CR_CHECK_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<polyline points="20 6 9 17 4 12"/>'
  + '</svg>';

const CR_REGEN_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<polyline points="23 4 23 10 17 10"/>'
  + '<polyline points="1 20 1 14 7 14"/>'
  + '<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>'
  + '</svg>';

// Task -> Create defaults. Keeps the tap-through from Today working:
// POST-style tasks land on Image, OUTREACH on Text/Email, OFFER on
// Text/Post. Platform picked to match business reach.
const CR_TASK_DEFAULTS = {
  POST:     function (b) { return { contentType: 'image', subFormat: null,   platform: b.reach === 'online' ? 'linkedin' : 'instagram' }; },
  OUTREACH: function ()  { return { contentType: 'text',  subFormat: 'email', platform: 'email' }; },
  OFFER:    function (b) { return { contentType: 'text',  subFormat: 'post',  platform: b.reach === 'online' ? 'linkedin' : 'instagram' }; }
};

// Step meta drives the top-of-page progress indicator. Same tone as
// the onboarding modal counter so both flows read as one family.
const CR_STEP_META = [
  { num: 1, label: 'Format' },
  { num: 2, label: 'Angle' },
  { num: 3, label: 'Pick one' },
  { num: 4, label: 'Publish' }
];

// ---------------------------------------------
// Business-context helpers
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

function _crDefaultBrief(contentType, subFormat) {
  const name = _crBusinessName();
  const product = _crProduct();

  if (contentType === 'image') {
    return 'One image that shows the real ' + product + ' from ' + name + '. Not a stock shot \u2014 a photo the audience knows only you could take.';
  }
  if (contentType === 'video') {
    return 'A short video (15\u201330s) that opens with a hook, shows something concrete about ' + product + ' at ' + name + ', and ends with a reason to follow.';
  }
  if (contentType === 'audio') {
    return 'A 30-second voice piece introducing ' + name + ' \u2014 who it\u2019s for, what ' + product + ' actually does for them, and a single line at the end that tells them what to do next.';
  }
  if (contentType === 'text') {
    if (subFormat === 'email') {
      return 'A personal, one-question email to a real customer of ' + name + '. No pitch. Just find out why they picked ' + product + '.';
    }
    if (subFormat === 'newsletter') {
      return 'A short newsletter update from ' + name + ': one thing that happened this week, one thing coming next, one small ask of the reader.';
    }
    if (subFormat === 'thread') {
      return 'A short thread (5\u20137 posts) about one thing most people misunderstand about ' + product + '. End with the truth as ' + name + ' sees it.';
    }
    return 'A short post about one specific thing that makes ' + product + ' at ' + name + ' worth choosing. No adjectives \u2014 just the fact and why it matters.';
  }
  return 'Something specific and true about ' + name + ' that would make one right person stop scrolling.';
}

// ---------------------------------------------
// Variation pools \u2014 6 per format, split into two 3-item angle sets.
// ---------------------------------------------
//
// Every pool holds two windows of {Direct, Story, Question} at
// indices [0..3) and [3..6). Regeneration cycles between them via
// `regenerationCount`. Each variation carries an explicit `angle`
// field which drives the card label on Step 3.

function _crVariationsFor(contentType, subFormat, regenerationCount) {
  const pool = _crVariationPool(contentType, subFormat);
  const n = pool.length;
  if (n === 0) return [];
  const offset = ((regenerationCount || 0) * 3) % n;
  const out = [];
  for (let i = 0; i < 3; i++) out.push(pool[(offset + i) % n]);
  return out;
}

function _crVariationPool(contentType, subFormat) {
  if (contentType === 'image') return _crImagePool();
  if (contentType === 'video') return _crVideoPool();
  if (contentType === 'audio') return _crAudioPool();
  if (contentType === 'text') {
    if (subFormat === 'email')      return _crEmailPool();
    if (subFormat === 'newsletter') return _crNewsletterPool();
    if (subFormat === 'thread')     return _crThreadPool();
    return _crPostPool();
  }
  return _crPostPool();
}

function _crImagePool() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    // Window 1
    { id: 'A', angle: 'Direct', format: 'image',
      caption: 'This is what ' + product + ' from ' + name + ' actually looks like. No filter, no staging.',
      visual: 'Straight-on close-up of the real ' + product + '. Natural light. No props.' },
    { id: 'B', angle: 'Story', format: 'image',
      caption: 'A customer sent us this after choosing ' + product + ' at ' + name + '. We asked if we could share it.',
      visual: 'Customer\u2019s own photo of the ' + product + ' in their space. Slight grain feels honest, not polished.' },
    { id: 'C', angle: 'Question', format: 'image',
      caption: 'One question we get about ' + product + ' at ' + name + ' \u2014 and the honest answer, in a single frame.',
      visual: 'Text overlay in the top third with the question. Below it, a photo that answers it wordlessly.' },
    // Window 2 (regenerated)
    { id: 'A', angle: 'Direct', format: 'image',
      caption: 'The one detail about ' + product + ' at ' + name + ' most people miss until they see it up close.',
      visual: 'Macro shot on the specific detail. Shallow depth of field. Warm side-light.' },
    { id: 'B', angle: 'Story', format: 'image',
      caption: 'Told a customer they didn\u2019t need to send a photo. They sent one anyway. Reposting with their permission.',
      visual: 'Customer photo, unedited. Include the corner of their environment so it reads as real.' },
    { id: 'C', angle: 'Question', format: 'image',
      caption: 'What does ' + product + ' from ' + name + ' actually solve? We put the answer in one image.',
      visual: 'Before / after or problem / solution split-frame. Simple, unnarrated.' }
  ];
}

function _crVideoPool() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', angle: 'Direct', format: 'video',
      hook:   'Most people think ' + product + ' is just ' + product + '.',
      middle: 'Three quick cuts of what actually goes into ' + product + ' at ' + name + '. Overlay each step with a one-line caption.',
      cta:    'Follow along for the next batch.' },
    { id: 'B', angle: 'Story', format: 'video',
      hook:   'A customer told us something last week we couldn\u2019t stop thinking about.',
      middle: 'Voiceover their exact quote over close-ups of ' + product + ' at ' + name + '. No music.',
      cta:    'Come try it yourself.' },
    { id: 'C', angle: 'Question', format: 'video',
      hook:   'Would you trust us telling you ' + name + ' is worth it, or someone who actually paid?',
      middle: 'Cut to a real ' + name + ' customer talking about ' + product + '. Two lines max, then back to the product.',
      cta:    'See what they saw.' },

    { id: 'A', angle: 'Direct', format: 'video',
      hook:   'Here\u2019s what ' + product + ' at ' + name + ' looks like when nobody\u2019s watching.',
      middle: 'One continuous 20-second take. No cuts. No music. Just the work.',
      cta:    'This is why people come back.' },
    { id: 'B', angle: 'Story', format: 'video',
      hook:   'The reason our best customer chose ' + name + ' isn\u2019t what you\u2019d think.',
      middle: 'Cut between the customer speaking to camera and the specific detail they referenced. Under 25 seconds.',
      cta:    'Try it and tell us your reason.' },
    { id: 'C', angle: 'Question', format: 'video',
      hook:   'How do you know if ' + product + ' from ' + name + ' is right for you?',
      middle: 'Three quick "yes / no" flashcards on camera. Each one answers itself with a two-second visual.',
      cta:    'Two out of three? Come find us.' }
  ];
}

function _crAudioPool() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', angle: 'Direct', format: 'audio',
      hook: 'You know that thing where you keep meaning to try ' + product + ' but never do?',
      spot: 'One line about who ' + name + ' is for. One line about what ' + product + ' actually does. One line about the smallest way to try it.',
      cta:  'Tap the link. That\u2019s it.' },
    { id: 'B', angle: 'Story', format: 'audio',
      hook: 'A customer told me last week that ' + product + ' from ' + name + ' fixed one thing they didn\u2019t know was broken.',
      spot: 'Quote the customer verbatim. Then say, in your own voice, why it fixes it. Keep it under 20 seconds.',
      cta:  'If that sounds like you \u2014 you know where to find us.' },
    { id: 'C', angle: 'Question', format: 'audio',
      hook: 'What do you actually get from ' + name + ' that you can\u2019t get anywhere else?',
      spot: 'Answer with one specific thing. Not "quality" \u2014 a concrete detail about ' + product + '.',
      cta:  'That\u2019s ' + name + '. Come see.' },

    { id: 'A', angle: 'Direct', format: 'audio',
      hook: 'Twenty seconds on why ' + name + ' does ' + product + ' the way we do.',
      spot: 'State the belief. State the trade-off. State the one thing we\u2019ll never compromise on.',
      cta:  'If that lines up \u2014 we\u2019d love to meet you.' },
    { id: 'B', angle: 'Story', format: 'audio',
      hook: 'A regular walked in last Friday and said one thing that\u2019s stayed with me all week.',
      spot: 'Paraphrase what they said, then answer why it means so much. Keep it warm, not sentimental.',
      cta:  'Come by. First one\u2019s on us.' },
    { id: 'C', angle: 'Question', format: 'audio',
      hook: 'Ever wonder why ' + name + ' costs what it costs?',
      spot: 'Walk through the answer in three beats: what goes in, what stays out, what you actually pay for.',
      cta:  'Tap through if that made sense.' }
  ];
}

function _crPostPool() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', angle: 'Direct', format: 'post',
      text: 'One thing about ' + product + ' at ' + name + ' most people don\u2019t know until they try it. Sharing it in one sentence today.' },
    { id: 'B', angle: 'Story', format: 'post',
      text: 'A customer said something about ' + product + ' from ' + name + ' this week that we couldn\u2019t have written ourselves. Their exact words, unchanged.' },
    { id: 'C', angle: 'Question', format: 'post',
      text: 'Would you rather hear us tell you why ' + product + ' at ' + name + ' works, or read what one of our customers said about it? Here\u2019s option two.' },

    { id: 'A', angle: 'Direct', format: 'post',
      text: 'Here\u2019s the trade-off nobody talks about with ' + product + ': (spell out the thing). ' + name + ' picked the harder side. Here\u2019s why.' },
    { id: 'B', angle: 'Story', format: 'post',
      text: 'One customer\u2019s story about ' + name + ' that changed how we describe ' + product + '. Sharing what they said and what we\u2019re now doing differently.' },
    { id: 'C', angle: 'Question', format: 'post',
      text: 'If you had to describe ' + product + ' in one word to someone who\u2019s never heard of ' + name + ', which one would you pick? Reply and tell me \u2014 I\u2019m collecting them.' }
  ];
}

function _crEmailPool() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', angle: 'Direct', format: 'email',
      subject: 'One question for you',
      body: 'Hey \u2014 I want to ask you something. Out of every option out there for ' + product + ', why did you pick ' + name + '? A one-line reply is more than enough. I read every one myself. Thanks for choosing us.' },
    { id: 'B', angle: 'Story', format: 'email',
      subject: 'Something a customer told me this week',
      body: 'A customer told me last week that one small thing tipped them toward ' + name + '. I\u2019ve been thinking about it since. Which small thing was it for you? Hit reply \u2014 no wrong answers, and it stays between us.' },
    { id: 'C', angle: 'Question', format: 'email',
      subject: 'Why ' + name + '?',
      body: 'Out of everyone offering ' + product + ', why ' + name + '? I\u2019m asking five customers this week and you\u2019re one of them. There\u2019s no wrong answer, and I\u2019ll read every reply personally.' },

    { id: 'A', angle: 'Direct', format: 'email',
      subject: 'Two lines, one favour',
      body: 'You\u2019ve been with ' + name + ' for a while. If you had to describe what ' + product + ' does for you in two lines, what would you write? I\u2019m using the answer to change how we introduce ourselves.' },
    { id: 'B', angle: 'Story', format: 'email',
      subject: 'A moment I keep coming back to',
      body: 'Last month a customer said the reason they stayed with ' + name + ' had nothing to do with ' + product + ' itself. It floored me. Would you tell me what your reason is? One line is plenty.' },
    { id: 'C', angle: 'Question', format: 'email',
      subject: 'The one thing you\u2019d change',
      body: 'If you could change one thing about how ' + name + ' delivers ' + product + ', what would it be? Hit reply. I\u2019m writing back to every single response this week.' }
  ];
}

function _crNewsletterPool() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', angle: 'Direct', format: 'newsletter',
      headline: 'This week at ' + name,
      body: 'One thing that happened: (the specific update). One thing coming next: (what\u2019s launching / opening / changing). One small ask: reply and tell me if this newsletter is useful. That\u2019s the whole thing.' },
    { id: 'B', angle: 'Story', format: 'newsletter',
      headline: 'What a customer taught me',
      body: 'A customer said something about ' + product + ' this week I hadn\u2019t heard before. Sharing it, and what we\u2019re changing because of it. If you\u2019re in the same boat, I\u2019d love to hear from you.' },
    { id: 'C', angle: 'Question', format: 'newsletter',
      headline: 'Behind the scenes at ' + name,
      body: 'A short walkthrough of what actually goes into ' + product + ' this month. No numbers, no fluff \u2014 just the real work. If you know someone who\u2019d like this, forward it on.' },

    { id: 'A', angle: 'Direct', format: 'newsletter',
      headline: 'What we\u2019re not doing this month',
      body: 'Every ' + name + ' newsletter usually lists what we\u2019re shipping. This one lists what we\u2019re deliberately not doing, and why. Sometimes the answer is more useful than the update.' },
    { id: 'B', angle: 'Story', format: 'newsletter',
      headline: 'A note from a first-time customer',
      body: 'A first-time customer at ' + name + ' left us a note that said one thing better than we\u2019ve ever said it ourselves. Reprinted here with their permission.' },
    { id: 'C', angle: 'Question', format: 'newsletter',
      headline: 'What are you working on?',
      body: 'This month we\u2019re asking you. Tell me one thing you\u2019re building, testing, or trying and I\u2019ll share the best answers next issue (with credit or anonymously \u2014 your call).' }
  ];
}

function _crThreadPool() {
  const name = _crBusinessName();
  const product = _crProduct();
  return [
    { id: 'A', angle: 'Direct', format: 'thread',
      lines: [
        'One thing most people get wrong about ' + product + ':',
        'They think it\u2019s about (the obvious thing). It\u2019s not.',
        'It\u2019s actually about (the real thing). Here\u2019s why:',
        '(One concrete example from ' + name + '\u2019s day-to-day.)',
        'That\u2019s the difference. Not glamorous. But it\u2019s the whole game.'
      ] },
    { id: 'B', angle: 'Story', format: 'thread',
      lines: [
        'A customer told me something about ' + name + ' last week I couldn\u2019t stop thinking about.',
        'They said: "(paste their exact words, unchanged)."',
        'I asked what they meant.',
        'Turns out (the specific thing they meant).',
        'It changed how I talk about ' + product + '. Here\u2019s what I mean:',
        '(One sentence you now say differently.)'
      ] },
    { id: 'C', angle: 'Question', format: 'thread',
      lines: [
        'Everyone asks the same three questions about ' + product + '. Answering them honestly:',
        '1. (Question one) \u2014 the answer isn\u2019t what most people expect.',
        '2. (Question two) \u2014 this is where ' + name + ' is actually different.',
        '3. (Question three) \u2014 and this is where we\u2019re still figuring it out.',
        'If any of those hit \u2014 reply. I read them all.'
      ] },

    { id: 'A', angle: 'Direct', format: 'thread',
      lines: [
        'Three trade-offs ' + name + ' has made on ' + product + ' that we don\u2019t regret:',
        '1. We picked (harder thing) over (easier thing). Here\u2019s why.',
        '2. We said no to (obvious thing). It cost us. It was worth it.',
        '3. We changed (default). Nobody asked. Everyone noticed.',
        'The point isn\u2019t the trade-offs. It\u2019s that trade-offs are a choice.'
      ] },
    { id: 'B', angle: 'Story', format: 'thread',
      lines: [
        'The best customer we ever had at ' + name + ' told us something in her second visit that stuck.',
        'She said "(paste her exact words)."',
        'We didn\u2019t understand what she meant until (specific moment).',
        'Now we say it back to every new customer in their onboarding.',
        'One line. Two years of practice. Twelve seconds to say.'
      ] },
    { id: 'C', angle: 'Question', format: 'thread',
      lines: [
        'What would make you switch away from a business you\u2019ve been loyal to for years?',
        'Ask 10 people, get 10 answers. But here are the four we keep hearing at ' + name + ':',
        '1. (Answer one.)',
        '2. (Answer two.)',
        '3. (Answer three.)',
        '4. (Answer four.)',
        'Which one\u2019s yours? Reply. I collect them.'
      ] }
  ];
}

// ---------------------------------------------
// Variation rendering (Step 3 cards + Step 4 preview)
// ---------------------------------------------

function _crHandleFromBusinessName() {
  const raw = _crBusinessName();
  if (!raw || raw === 'your business') return 'yourbusiness';
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return cleaned.slice(0, 20) || 'yourbusiness';
}

function _crAvatarInitials() {
  const raw = _crBusinessName();
  if (!raw || raw === 'your business') return 'YB';
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function _crSeededBars(id, count) {
  const seed = String(id || 'A').charCodeAt(0);
  const bars = [];
  for (let i = 0; i < count; i++) {
    const h = 24 + ((seed * 13 + i * 37) % 60);
    bars.push('<span class="cr-visual-wave-bar" style="height:' + h + '%"></span>');
  }
  return bars.join('');
}

function _crRenderVariationBody(v) {
  if (!v) return '';
  if (v.format === 'image')      return _crRenderImagePreview(v);
  if (v.format === 'video')      return _crRenderVideoPreview(v);
  if (v.format === 'audio')      return _crRenderAudioPreview(v);
  if (v.format === 'email')      return _crRenderEmailPreview(v);
  if (v.format === 'newsletter') return _crRenderNewsletterPreview(v);
  if (v.format === 'thread')     return _crRenderThreadPreview(v);
  if (v.format === 'post')       return _crRenderPostPreview(v);
  return '<div class="cr-visual cr-visual-text">' + _escape(v.text || '') + '</div>';
}

function _crRenderImagePreview(v) {
  const handle = _crHandleFromBusinessName();
  const initials = _crAvatarInitials();
  return ''
    + '<div class="cr-visual cr-visual-image" data-variation="' + _escape(v.id) + '">'
    +   '<div class="cr-visual-image-frame" aria-hidden="true">'
    +     '<svg class="cr-visual-image-icon" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">'
    +       '<rect x="3" y="3" width="18" height="18" rx="2"/>'
    +       '<circle cx="8.5" cy="8.5" r="1.5"/>'
    +       '<polyline points="21 15 16 10 5 21"/>'
    +     '</svg>'
    +     '<div class="cr-visual-image-hint">' + _escape(v.visual || '') + '</div>'
    +   '</div>'
    +   '<div class="cr-visual-post-strip">'
    +     '<div class="cr-visual-post-meta">'
    +       '<span class="cr-visual-avatar" aria-hidden="true">' + _escape(initials) + '</span>'
    +       '<span class="cr-visual-handle">@' + _escape(handle) + '</span>'
    +       '<span class="cr-visual-time">\u00b7 now</span>'
    +     '</div>'
    +     '<div class="cr-visual-caption">' + _escape(v.caption || '') + '</div>'
    +   '</div>'
    + '</div>';
}

function _crRenderVideoPreview(v) {
  return ''
    + '<div class="cr-visual cr-visual-video" data-variation="' + _escape(v.id) + '">'
    +   '<div class="cr-visual-video-frame" aria-hidden="true">'
    +     '<span class="cr-visual-video-duration">0:15</span>'
    +     '<span class="cr-visual-video-play">'
    +       '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">'
    +         '<polygon points="7 4 20 12 7 20 7 4"/>'
    +       '</svg>'
    +     '</span>'
    +     '<div class="cr-visual-video-hook">' + _escape(v.hook || '') + '</div>'
    +   '</div>'
    +   '<div class="cr-visual-script">'
    +     '<div class="cr-visual-script-row">'
    +       '<span class="cr-visual-script-key">MIDDLE</span>'
    +       '<span class="cr-visual-script-val">' + _escape(v.middle || '') + '</span>'
    +     '</div>'
    +     '<div class="cr-visual-script-row">'
    +       '<span class="cr-visual-script-key">CTA</span>'
    +       '<span class="cr-visual-script-val">' + _escape(v.cta || '') + '</span>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

function _crRenderAudioPreview(v) {
  return ''
    + '<div class="cr-visual cr-visual-audio" data-variation="' + _escape(v.id) + '">'
    +   '<div class="cr-visual-audio-player" aria-hidden="true">'
    +     '<span class="cr-visual-audio-play">'
    +       '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">'
    +         '<polygon points="7 4 20 12 7 20 7 4"/>'
    +       '</svg>'
    +     '</span>'
    +     '<div class="cr-visual-wave">' + _crSeededBars(v.id, 32) + '</div>'
    +     '<span class="cr-visual-audio-time">0:30</span>'
    +   '</div>'
    +   '<div class="cr-visual-script">'
    +     '<div class="cr-visual-script-row">'
    +       '<span class="cr-visual-script-key">HOOK</span>'
    +       '<span class="cr-visual-script-val">' + _escape(v.hook || '') + '</span>'
    +     '</div>'
    +     '<div class="cr-visual-script-row">'
    +       '<span class="cr-visual-script-key">SPOT</span>'
    +       '<span class="cr-visual-script-val">' + _escape(v.spot || '') + '</span>'
    +     '</div>'
    +     '<div class="cr-visual-script-row">'
    +       '<span class="cr-visual-script-key">CTA</span>'
    +       '<span class="cr-visual-script-val">' + _escape(v.cta || '') + '</span>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

function _crRenderPostPreview(v) {
  const handle = _crHandleFromBusinessName();
  const initials = _crAvatarInitials();
  return ''
    + '<div class="cr-visual cr-visual-post" data-variation="' + _escape(v.id) + '">'
    +   '<div class="cr-visual-post-meta">'
    +     '<span class="cr-visual-avatar" aria-hidden="true">' + _escape(initials) + '</span>'
    +     '<span class="cr-visual-handle">@' + _escape(handle) + '</span>'
    +     '<span class="cr-visual-time">\u00b7 now</span>'
    +   '</div>'
    +   '<div class="cr-visual-post-text">' + _escape(v.text || '') + '</div>'
    + '</div>';
}

function _crRenderEmailPreview(v) {
  return ''
    + '<div class="cr-visual cr-visual-email" data-variation="' + _escape(v.id) + '">'
    +   '<div class="cr-visual-email-head">'
    +     '<div class="cr-visual-email-row">'
    +       '<span class="cr-visual-email-key">From</span>'
    +       '<span class="cr-visual-email-val">' + _escape(_crBusinessName()) + '</span>'
    +     '</div>'
    +     '<div class="cr-visual-email-row">'
    +       '<span class="cr-visual-email-key">Subject</span>'
    +       '<span class="cr-visual-email-val cr-visual-email-subject">' + _escape(v.subject || '') + '</span>'
    +     '</div>'
    +   '</div>'
    +   '<div class="cr-visual-email-body">' + _escape(v.body || '') + '</div>'
    + '</div>';
}

function _crRenderNewsletterPreview(v) {
  const brand = _crBusinessName().toUpperCase();
  return ''
    + '<div class="cr-visual cr-visual-newsletter" data-variation="' + _escape(v.id) + '">'
    +   '<div class="cr-visual-newsletter-head">'
    +     '<span class="cr-visual-newsletter-brand">' + _escape(brand) + '</span>'
    +     '<span class="cr-visual-newsletter-date">This week</span>'
    +   '</div>'
    +   '<div class="cr-visual-newsletter-headline">' + _escape(v.headline || '') + '</div>'
    +   '<div class="cr-visual-newsletter-body">' + _escape(v.body || '') + '</div>'
    + '</div>';
}

function _crRenderThreadPreview(v) {
  const lines = Array.isArray(v.lines) ? v.lines : [];
  const handle = _crHandleFromBusinessName();
  const initials = _crAvatarInitials();
  const total = lines.length;
  const itemsHtml = lines.map(function (l, i) {
    const isLast = i === total - 1;
    return ''
      + '<div class="cr-visual-thread-item' + (isLast ? ' cr-visual-thread-item-last' : '') + '">'
      +   '<div class="cr-visual-thread-avatar-col">'
      +     '<span class="cr-visual-avatar cr-visual-avatar-sm" aria-hidden="true">' + _escape(initials) + '</span>'
      +     (isLast ? '' : '<span class="cr-visual-thread-connector" aria-hidden="true"></span>')
      +   '</div>'
      +   '<div class="cr-visual-thread-body">'
      +     '<div class="cr-visual-thread-meta">'
      +       '<span class="cr-visual-handle">@' + _escape(handle) + '</span>'
      +       '<span class="cr-visual-thread-num">' + (i + 1) + '/' + total + '</span>'
      +     '</div>'
      +     '<div class="cr-visual-thread-text">' + _escape(l) + '</div>'
      +   '</div>'
      + '</div>';
  }).join('');
  return '<div class="cr-visual cr-visual-thread" data-variation="' + _escape(v.id) + '">' + itemsHtml + '</div>';
}

// Plain-text serializer for saving into results.items so the stored
// copy keeps its structure. Also used by the "Copy" button on Step 3
// and Step 4 to put a clean version onto the clipboard.
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

// Best-effort clipboard write with a legacy fallback. Returns a
// Promise-like so callers can chain a UI ack.
function _crCopyToClipboard(text) {
  if (!text) return Promise.resolve(false);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return false; });
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand && document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve(!!ok);
  } catch (_) {
    return Promise.resolve(false);
  }
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
  c.regenerationCount = 0;
  c.publishing = false;
}

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

  if (c.contentType === 'text' && !c.subFormat) c.subFormat = 'post';
  if (c.contentType && c.contentType !== 'text' && c.subFormat) c.subFormat = null;

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
  const c = getCreate();
  const step = c.step;

  // Step 3 stretches the container so 3 variation cards fit side-by-side.
  // Other steps keep the tight 640px form column that focuses attention
  // on the one thing being decided.
  const wrapClass = step === 3 ? 'cr-wrap cr-wrap-wide' : 'cr-wrap';

  let html = '<div class="' + wrapClass + '">';
  html += _crRenderProgress(step);
  html += _crRenderTaskBanner();
  if (step === 1) html += _crRenderStep1();
  else if (step === 2) html += _crRenderStep2();
  else if (step === 3) html += _crRenderStep3();
  else if (step === 4) html += _crRenderStep4();
  html += '</div>';

  container.innerHTML = html;

  _crBindTaskBanner();
  if (step === 1) _crBindStep1();
  else if (step === 2) _crBindStep2();
  else if (step === 3) _crBindStep3();
  else if (step === 4) _crBindStep4();

  // The publish success overlay is rendered separately so it can sit on
  // top of everything else in the content area during its 1.4s life.
  if (c.publishing) _crMountPublishingOverlay();
}

// ---------------------------------------------
// Progress + task banner (shared chrome)
// ---------------------------------------------

function _crRenderProgress(step) {
  const total = CR_STEP_META.length;
  const current = CR_STEP_META[step - 1] || CR_STEP_META[0];
  const pct = Math.round((step / total) * 100);
  const dots = CR_STEP_META.map(function (m) {
    const state = m.num < step ? 'done' : (m.num === step ? 'active' : 'pending');
    return '<span class="cr-prog-dot cr-prog-dot-' + state + '" aria-hidden="true"></span>';
  }).join('');
  return ''
    + '<div class="cr-progress">'
    +   '<div class="cr-progress-head">'
    +     '<span class="cr-progress-count">Step ' + step + ' of ' + total + '</span>'
    +     '<span class="cr-progress-sep" aria-hidden="true">\u00b7</span>'
    +     '<span class="cr-progress-label">' + _escape(current.label) + '</span>'
    +     '<span class="cr-progress-dots">' + dots + '</span>'
    +   '</div>'
    +   '<div class="cr-progress-bar"><div class="cr-progress-fill" style="width:' + pct + '%"></div></div>'
    + '</div>';
}

function _crRenderTaskBanner() {
  const c = getCreate();
  if (!c.fromTask) return '';
  const task = c.fromTask;
  const label = (task && task.type) ? String(task.type) : 'Today';
  const desc = (task && task.description) ? String(task.description) : '';
  const truncated = desc.length > 90 ? desc.slice(0, 90).replace(/\s+\S*$/, '') + '\u2026' : desc;
  return ''
    + '<div class="cr-task-banner" role="note">'
    +   '<div class="cr-task-banner-left">'
    +     '<span class="cr-task-banner-eyebrow">FROM TODAY \u00b7 ' + _escape(label.toUpperCase()) + '</span>'
    +     '<span class="cr-task-banner-desc">' + _escape(truncated || 'Clara pre-filled a starting point for you.') + '</span>'
    +   '</div>'
    +   '<button type="button" class="cr-task-banner-close" id="crTaskBannerClose" aria-label="Detach from task">\u00d7</button>'
    + '</div>';
}

function _crBindTaskBanner() {
  const close = document.getElementById('crTaskBannerClose');
  if (!close) return;
  close.addEventListener('click', function () {
    const c = getCreate();
    c.fromTask = null;
    _saveState();
    renderCreate(document.getElementById('homeContent'));
  });
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
      if (changed) {
        c.subFormat = key === 'text' ? 'post' : null;
        c.selectedPlatform = _crDefaultPlatformFor(key, c.subFormat);
        c.variations = [];
        c.selectedVariation = null;
        c.customBrief = '';
        c.regenerationCount = 0;
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

// Aim for a punchy, scannable brief. Anything over this length gets
// a soft warning styled on .cr-brief-count so the user knows to trim.
const CR_BRIEF_SOFT_MAX = 320;

function _crRenderStep2() {
  const c = getCreate();
  if (!c.contentType) return _crRenderStep1();

  const allowed = _crAllowedPlatforms();
  const platform = c.selectedPlatform || allowed[0];
  const platformLabel = _crPlatformLabel(platform);

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

  if (!c.customBrief || !c.customBrief.trim()) {
    c.customBrief = _crDefaultBrief(c.contentType, c.subFormat);
    _saveState();
  }

  const briefLen = (c.customBrief || '').length;
  const overSoft = briefLen > CR_BRIEF_SOFT_MAX;

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
    + '<div class="cr-brief-count' + (overSoft ? ' cr-brief-count-warn' : '') + '" id="crBriefCount">'
    +   briefLen + ' / ' + CR_BRIEF_SOFT_MAX + ' characters' + (overSoft ? ' \u00b7 tighter is better' : '')
    + '</div>'
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
      cur.customBrief = _crDefaultBrief(cur.contentType, cur.subFormat);
      cur.selectedPlatform = _crDefaultPlatformFor(cur.contentType, cur.subFormat);
      cur.variations = [];
      cur.selectedVariation = null;
      cur.regenerationCount = 0;
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
  const briefCount = document.getElementById('crBriefCount');
  if (briefInput) {
    // Auto-grow: on every keystroke resize the textarea to fit its
    // contents so long briefs don't scroll inside a 4-row box.
    const grow = function () {
      briefInput.style.height = 'auto';
      briefInput.style.height = Math.min(briefInput.scrollHeight, 320) + 'px';
    };
    // Kick once so a persisted brief also opens at the right height.
    requestAnimationFrame(grow);

    briefInput.addEventListener('input', function () {
      getCreate().customBrief = briefInput.value;
      _saveState();
      grow();
      if (briefCount) {
        const len = briefInput.value.length;
        const over = len > CR_BRIEF_SOFT_MAX;
        briefCount.textContent = len + ' / ' + CR_BRIEF_SOFT_MAX + ' characters' + (over ? ' \u00b7 tighter is better' : '');
        briefCount.classList.toggle('cr-brief-count-warn', over);
      }
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
      cur.regenerationCount = 0;
      cur.variations = _crVariationsFor(cur.contentType, cur.subFormat, 0);
      cur.selectedVariation = null;
      cur.generating = false;
      _saveState();
      _crGoTo(3);
    }, 3000);
  }
}

// ---------------------------------------------
// Step 3 — Variations (3-across grid)
// ---------------------------------------------

function _crRenderStep3() {
  const c = getCreate();
  if (!c.contentType) return _crRenderStep1();

  let variations = Array.isArray(c.variations) ? c.variations : [];
  if (variations.length === 0 || !variations[0] || !variations[0].format) {
    variations = _crVariationsFor(c.contentType, c.subFormat, c.regenerationCount || 0);
    c.variations = variations;
    _saveState();
  }

  const selectedId = c.selectedVariation ? c.selectedVariation.id : null;
  // In the 3-item grid two variations can share an id character (both
  // "A" from different pool windows), so we also match on `angle` +
  // position when checking selection. Cheapest cross-check is a stored
  // key on the variation itself.
  const selectedKey = c.selectedVariation ? c.selectedVariation.id + '|' + (c.selectedVariation.angle || '') : null;

  const cardsHtml = variations.map(function (v, i) {
    const key = v.id + '|' + (v.angle || '');
    const on = selectedKey ? key === selectedKey : (selectedId && v.id === selectedId);
    const meta = CR_ANGLE_META[v.angle] || { label: v.angle || 'Variation', sub: '' };
    return ''
      + '<div class="cr-variation-card' + (on ? ' cr-variation-card-active' : '') + '" data-variation-index="' + i + '" data-angle="' + _escape(v.angle || '') + '">'
      +   '<div class="cr-variation-head">'
      +     '<div class="cr-variation-head-text">'
      +       '<div class="cr-variation-angle">' + _escape(meta.label.toUpperCase()) + '</div>'
      +       '<div class="cr-variation-sub">' + _escape(meta.sub) + '</div>'
      +     '</div>'
      +     '<button type="button" class="cr-copy-btn" data-copy-index="' + i + '" aria-label="Copy this variation">'
      +       '<span class="cr-copy-icon">' + CR_COPY_ICON + '</span>'
      +     '</button>'
      +   '</div>'
      +   _crRenderVariationBody(v)
      + '</div>';
  }).join('');

  return ''
    + '<button type="button" class="cr-back-link" id="crBackBtn">\u2190 Back</button>'
    + '<div class="cr-step3-head">'
    +   '<div>'
    +     '<h1 class="cr-heading cr-heading-sm">Pick one to publish.</h1>'
    +     '<p class="cr-subheading">Three angles on the same brief. Tap Copy to save any of them.</p>'
    +   '</div>'
    +   '<button type="button" class="cr-regen-btn" id="crRegenBtn">'
    +     '<span class="cr-regen-icon">' + CR_REGEN_ICON + '</span>'
    +     '<span>Regenerate</span>'
    +   '</button>'
    + '</div>'
    + '<div class="cr-variations cr-variations-grid">' + cardsHtml + '</div>'
    + '<button type="button" class="cr-continue-btn" id="crContinueBtn"' + (selectedId ? '' : ' disabled') + '>'
    +   'Continue \u2192'
    + '</button>';
}

function _crBindStep3() {
  const back = document.getElementById('crBackBtn');
  if (back) back.addEventListener('click', function () { _crGoTo(2); });

  document.querySelectorAll('[data-variation-index]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      // Copy button lives inside the card. Its own handler stops
      // propagation, but as a belt-and-braces, ignore any click that
      // originated inside the copy button.
      if (e.target && e.target.closest && e.target.closest('.cr-copy-btn')) return;
      const idx = parseInt(card.getAttribute('data-variation-index'), 10);
      const c = getCreate();
      const v = (c.variations || [])[idx];
      if (!v) return;
      c.selectedVariation = v;
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  });

  document.querySelectorAll('[data-copy-index]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-copy-index'), 10);
      const c = getCreate();
      const v = (c.variations || [])[idx];
      if (!v) return;
      _crCopyToClipboard(_crVariationPreviewText(v)).then(function (ok) {
        if (!ok) return;
        _crFlashCopyBtn(btn);
      });
    });
  });

  const regen = document.getElementById('crRegenBtn');
  if (regen) {
    regen.addEventListener('click', function () {
      const c = getCreate();
      c.regenerationCount = (c.regenerationCount || 0) + 1;
      c.variations = _crVariationsFor(c.contentType, c.subFormat, c.regenerationCount);
      c.selectedVariation = null;
      _saveState();
      renderCreate(document.getElementById('homeContent'));
    });
  }

  const cont = document.getElementById('crContinueBtn');
  if (cont) {
    cont.addEventListener('click', function () {
      if (!getCreate().selectedVariation) return;
      _crGoTo(4);
    });
  }
}

function _crFlashCopyBtn(btn) {
  if (!btn) return;
  const original = btn.innerHTML;
  btn.classList.add('cr-copy-btn-ok');
  btn.innerHTML = '<span class="cr-copy-icon">' + CR_CHECK_ICON + '</span>';
  setTimeout(function () {
    btn.classList.remove('cr-copy-btn-ok');
    btn.innerHTML = original;
  }, 1200);
}

// ---------------------------------------------
// Step 4 — Publish
// ---------------------------------------------
//
// Confidence chip copy is derived from (angle × platform) so it looks
// specific without being real. Users see three flavours: high, solid,
// experimental. Same string for the same combo across renders.

function _crConfidence(v, platform) {
  if (!v) return { level: 'solid', label: 'Solid pick', copy: 'Clara thinks this will land \u2014 the angle matches your audience.' };
  const angle = v.angle || 'Direct';
  const platformLabel = _crPlatformLabel(platform);

  if (angle === 'Direct') {
    return {
      level: 'high',
      label: 'High confidence',
      copy: 'Direct-angle posts perform best for you. This one should land cleanly on ' + platformLabel + '.'
    };
  }
  if (angle === 'Story') {
    return {
      level: 'solid',
      label: 'Solid pick',
      copy: 'Customer-voice content earns saves. Post it when your audience is most likely to be on ' + platformLabel + '.'
    };
  }
  return {
    level: 'experiment',
    label: 'Worth testing',
    copy: 'Question-led hooks perform unevenly. If it hits on ' + platformLabel + ', double down with a follow-up.'
  };
}

function _crRenderStep4() {
  const c = getCreate();
  if (!c.selectedVariation) return _crRenderStep3();

  const platform = c.selectedPlatform || (_crAllowedPlatforms()[0] || 'instagram');
  const platformLabel = _crPlatformLabel(platform);
  const icon = CR_PLATFORM_ICONS[platform] || '';
  const conf = _crConfidence(c.selectedVariation, platform);

  return ''
    + '<button type="button" class="cr-back-link" id="crBackBtn">\u2190 Back</button>'
    + '<h1 class="cr-heading cr-heading-sm">Ready when you are.</h1>'
    + '<p class="cr-subheading">Review the piece and pick where it goes next.</p>'
    + '<div class="cr-publish-preview">'
    +   '<div class="cr-publish-preview-head">'
    +     '<span class="cr-publish-label">READY TO PUBLISH</span>'
    +     '<button type="button" class="cr-copy-btn cr-copy-btn-inline" id="crCopyPublishBtn" aria-label="Copy this content">'
    +       '<span class="cr-copy-icon">' + CR_COPY_ICON + '</span>'
    +       '<span>Copy</span>'
    +     '</button>'
    +   '</div>'
    +   '<div class="cr-publish-body">' + _crRenderVariationBody(c.selectedVariation) + '</div>'
    + '</div>'
    + '<div class="cr-publish-meta">'
    +   '<div class="cr-publish-badge">'
    +     '<span class="cr-publish-badge-icon">' + icon + '</span>'
    +     '<span class="cr-publish-badge-label">Publishing to ' + _escape(platformLabel) + '</span>'
    +   '</div>'
    +   '<div class="cr-confidence cr-confidence-' + conf.level + '">'
    +     '<div class="cr-confidence-head">'
    +       '<span class="cr-confidence-dot" aria-hidden="true"></span>'
    +       '<span class="cr-confidence-label">' + _escape(conf.label) + '</span>'
    +     '</div>'
    +     '<div class="cr-confidence-copy">' + _escape(conf.copy) + '</div>'
    +   '</div>'
    + '</div>'
    + '<div class="cr-publish-options">'
    +   '<button type="button" class="cr-publish-btn" id="crPublishBtn">Publish now</button>'
    +   '<button type="button" class="cr-publish-draft" id="crDraftBtn">Save as draft</button>'
    + '</div>'
    + '<button type="button" class="cr-back-link cr-back-link-center" id="crStartOverBtn">\u2190 Start over</button>';
}

function _crBindStep4() {
  const back = document.getElementById('crBackBtn');
  if (back) back.addEventListener('click', function () { _crGoTo(3); });

  const publishBtn = document.getElementById('crPublishBtn');
  if (publishBtn) {
    publishBtn.addEventListener('click', function () {
      const c = getCreate();
      _crPushResultItem('published');
      // Keep the chosen platform + variation available for the success
      // overlay's copy, then blow away the rest of the wizard state.
      const platformLabel = _crPlatformLabel(c.selectedPlatform || 'instagram');
      c.publishing = true;
      _saveState();
      _crMountPublishingOverlay(platformLabel);

      // Give the overlay just under 1.4s to play, then redirect to
      // Results (the published-content + analytics screen). If the
      // user has navigated away in that window we silently bail on
      // the redirect.
      setTimeout(function () {
        _resetCreate();
        _saveState();
        if (appState.mode === 'home' && appState.activeView === 'create') {
          appState.activeView = 'results';
          _saveState();
          renderApp();
        }
      }, 1400);
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

  const copyBtn = document.getElementById('crCopyPublishBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      const c = getCreate();
      _crCopyToClipboard(_crVariationPreviewText(c.selectedVariation)).then(function (ok) {
        if (!ok) return;
        _crFlashCopyBtn(copyBtn);
      });
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
// Publishing success overlay
// ---------------------------------------------
//
// Small full-viewport scrim that plays for ~1.3s between "Publish now"
// and the redirect to Insights. Three amber dots -> check mark, with
// the platform name baked into the copy so it reads real.

function _crMountPublishingOverlay(platformLabel) {
  if (document.getElementById('crPublishingOverlay')) return;
  const label = platformLabel || 'your channel';
  const el = document.createElement('div');
  el.id = 'crPublishingOverlay';
  el.className = 'cr-publishing';
  el.innerHTML = ''
    + '<div class="cr-publishing-card">'
    +   '<div class="cr-publishing-dots">'
    +     '<span class="cr-publishing-dot"></span>'
    +     '<span class="cr-publishing-dot"></span>'
    +     '<span class="cr-publishing-dot"></span>'
    +   '</div>'
    +   '<div class="cr-publishing-check" aria-hidden="true">' + CR_CHECK_ICON + '</div>'
    +   '<div class="cr-publishing-title">Publishing to ' + _escape(label) + '\u2026</div>'
    +   '<div class="cr-publishing-sub">Clara will start tracking this piece in Insights.</div>'
    + '</div>';
  document.body.appendChild(el);
  requestAnimationFrame(function () {
    el.classList.add('cr-publishing-show');
  });
  // Swap dots for a check ~half-way through so the moment feels
  // completed before the redirect.
  setTimeout(function () {
    el.classList.add('cr-publishing-done');
  }, 900);
  // Kick a fade-out just before the redirect, so the user sees the
  // scrim melt away over the Insights page instead of being ripped
  // off screen.
  setTimeout(function () {
    el.classList.remove('cr-publishing-show');
  }, 1350);
  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1650);
}

// ---------------------------------------------
// Publish / draft helpers
// ---------------------------------------------

function _crResultsType(contentType, subFormat) {
  if (contentType === 'image') return 'image';
  if (contentType === 'video') return 'video';
  if (contentType === 'audio') return 'audio';
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
  // Clara proactive trigger: only fires when this push takes results
  // from 0 \u2192 1 items AND the concept hasn't been congratulated yet.
  // Drafts count too \u2014 the intent is "you made something", not just
  // "you published". The check itself is idempotent via
  // concept.claraTriggers.firstResultFired.
  if (typeof window._claraCheckFirstResult === 'function') {
    const concept = getActiveConcept();
    if (concept) {
      try { window._claraCheckFirstResult(concept); } catch (err) { console.error('Clara first-result check failed:', err); }
    }
  }
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
// Shared SVG catalog. Exposed so the Results screen (and any other
// consumer) can render platform glyphs without duplicating the source
// \u2014 kept in sync with CR_PLATFORMS so a new platform key only
// needs the icon added here once.
window.CR_PLATFORM_ICONS = CR_PLATFORM_ICONS;
