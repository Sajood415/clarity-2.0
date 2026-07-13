// ---------------------------------------------
// Clarity 2.0 — Clara task-thread response engine
// ---------------------------------------------
//
// Powers the "DISCUSS WITH CLARA" thread that lives inside every
// Today task-detail page. This engine is intentionally isolated
// from `respond.js` (the free-chat engine) because the surface
// area here is much narrower:
//
//   * The user is already looking at a specific task
//     (POST / OUTREACH / OFFER) — so responses are keyed on
//     `task.type` first, keyword second.
//   * There's no insight-card sidecar and no research payload
//     lookup — just short, opinionated answers that reference
//     `business.name` and `task.description`.
//   * No external API. Templates only. Same pattern as
//     `customerTemplates.js` and `insights.js`.
//
// Public surface (both exposed on window for the concatenated
// script-tag load order in index.html):
//
//   _claraThreadOpening(task, concept)  -> string
//   _claraThreadRespond(userMsg, task, concept) -> string
//
// `_claraThreadOpening` is called ONCE per task, the first
// time a user opens the detail page and finds an empty
// thread. It seeds a single Clara message tying together the
// user's business name and the task's rationale.
//
// `_claraThreadRespond` is called on every user submission.
// It normalises the message, walks a priority-ordered keyword
// list (specific > general, so "how hard is this" hits `hard`
// not `how`), and returns the matching template with `{name}`
// and `{description}` interpolated. If no keyword hits, the
// per-type `default` template is used.

// ---------------------------------------------
// Message normalisation (same shape as respond.js)
// ---------------------------------------------

function _clThreadNormalise(msg) {
  return String(msg || '').toLowerCase().trim();
}

function _clThreadContainsAny(haystack, needles) {
  for (let i = 0; i < needles.length; i++) {
    if (haystack.indexOf(needles[i]) !== -1) return true;
  }
  return false;
}

// ---------------------------------------------
// Keyword router
// ---------------------------------------------
//
// Priority order matters: specific > general. This keeps
// "how hard is this?" from being pulled toward the `how`
// bucket by the presence of the word "how".
//
// The order is: alt (alternative/other) > skip > platform >
// time > hard > easy > suggest > help > how > why > (fallback).
//
// Every keyword returns a template key that maps into
// `CL_THREAD_TEMPLATES[task.type][keyword]`. Callers fall back
// to `default` if a type/keyword combo is missing (defensive —
// today's template table is complete but we don't want a
// future task type to crash the thread).
//
// Templates deliberately do NOT echo the task description
// back at the user \u2014 responses read like a smart advisor
// talking, not a bot repeating input. Only `{name}` is
// interpolated, and only in branches where the business
// name genuinely adds signal.

function _clThreadMatchKeyword(msg) {
  if (_clThreadContainsAny(msg, ['alternative', 'different', 'other', 'instead', 'else'])) return 'alt';
  if (_clThreadContainsAny(msg, ['skip', 'don\u2019t want', 'dont want', 'not do', 'not doing'])) return 'skip';
  if (_clThreadContainsAny(msg, ['platform', 'where should i post', 'which app', 'channel'])) return 'platform';
  if (_clThreadContainsAny(msg, ['time', 'how long', 'minutes', 'minute', 'hour', 'quick'])) return 'time';
  if (_clThreadContainsAny(msg, ['hard', 'difficult', 'tough', 'stuck'])) return 'hard';
  if (_clThreadContainsAny(msg, ['easy', 'simple', 'too easy'])) return 'easy';
  if (_clThreadContainsAny(msg, ['suggest', 'suggestion', 'idea', 'ideas', 'example'])) return 'suggest';
  if (_clThreadContainsAny(msg, ['help', 'guide', 'walk me through'])) return 'help';
  if (_clThreadContainsAny(msg, ['how'])) return 'how';
  if (_clThreadContainsAny(msg, ['why'])) return 'why';
  return null;
}

// ---------------------------------------------
// Template table
// ---------------------------------------------
//
// Each task type has 10 keyword-matched templates + a `default`
// fallback = 11 responses. All strings reference `{name}` and
// most reference `{description}` where useful.

const CL_THREAD_TEMPLATES = {
  POST: {
    how: 'Keep it simple \u2014 one photo or one voice note, 5 minutes tops. Don\u2019t chase polished, chase specific.',
    why: 'Consistency is 80% of the game. Skip today and tomorrow\u2019s post costs twice as much reach.',
    alt: 'Try a 15-second voice note instead. Same message, less production.',
    help: 'Write the caption first \u2014 one line, no fluff. Decide the visual after.',
    suggest: 'Pull a line from a past review or DM and use it as the caption. Real customer language always wins.',
    platform: 'Post where your customer scrolls, not where you scroll. Pick one and stay put for the week.',
    time: '5\u201310 minutes max. If you\u2019re past 20, it\u2019s trying to be perfect.',
    hard: 'Shortcut: use a real customer\u2019s exact words. One sentence, done.',
    easy: 'Good \u2014 that means the voice is clear. Post it, then draft two more before you lose the thread.',
    skip: 'You can skip once, but skipping breaks the compounding. Even a rough post beats zero.',
    default: 'For {name}, the honest answer is just publish. First drafts teach you more than any planning.'
  },
  OUTREACH: {
    how: 'Personalise the opener, keep the ask identical. Rewrite the first sentence, not the pitch.',
    why: 'Direct outreach converts 5\u201310x better than any post. You pick the customer instead of waiting for the algorithm.',
    alt: 'Try a 30-second voice note or a Loom. Voice cuts through where text gets skimmed.',
    help: 'Draft the message once, then swap only the first line per person. That line = something about them, not about {name}.',
    suggest: 'Try this: \u201cSaw [specific thing]. Curious how you\u2019re handling [related problem].\u201d No pitch, just curiosity.',
    platform: 'Wherever they\u2019re most active today. Follow their recent activity and meet them there.',
    time: '10 minutes per message, max. If you\u2019re 20 minutes deep on one person, you\u2019re overthinking.',
    hard: 'Start with the easiest ask \u2014 not a sale, just a conversation. \u201cCurious what you thought about X\u201d opens more doors.',
    easy: 'Supposed to feel easy. That\u2019s how you know it\u2019s not spammy. Just don\u2019t skip the personalisation.',
    skip: 'Skipping means waiting for people to find you. Slow. Even 3 personal messages today = 3 real conversations {name} doesn\u2019t have yet.',
    default: 'For {name}, the play is: personal, short, no pitch. Start the conversation, don\u2019t close it.'
  },
  OFFER: {
    how: 'One sentence: who it\u2019s for, what it is, why now. If it needs more, cut \u2014 don\u2019t add.',
    why: 'Clarity on price closes deals. Every hidden or negotiable price adds a hesitation cycle.',
    alt: 'Instead of a discount, try a bundle or a time-limited version. Discounts train customers to wait; scarcity trains them to act.',
    help: 'Look at your most-booked service or best seller. Package it, price it clearly, put a deadline on it.',
    suggest: 'A \u201cthis-week-only\u201d spin on your best seller. Same product, tighter window.',
    platform: 'Publish to your warmest audience first \u2014 email, DMs, past customers. Public channels come after you\u2019ve seen it convert once.',
    time: '15\u201320 minutes of real work. If you\u2019re an hour in, you\u2019re designing a landing page, not testing an offer.',
    hard: 'Start with your most-requested thing at {name} and put a fixed price on it. Adjust once you see who buys.',
    easy: 'That\u2019s the point \u2014 offers should be easy to explain and easy to say yes to.',
    skip: 'You can, but you\u2019re leaving your best customers guessing. A clear offer converts fence-sitters.',
    default: 'For {name}, ask yourself: who exactly is this for? If you can name one specific customer who\u2019d buy today, you\u2019re ready.'
  }
};

// ---------------------------------------------
// Interpolation
// ---------------------------------------------
//
// Templates use `{name}` as the only placeholder. Task
// description is intentionally NOT interpolated: responses
// should feel like an advisor talking, not a bot echoing
// input. All interpolated values are escaped downstream in
// today.js before being written into the DOM.

function _clThreadInterpolate(template, name) {
  return String(template || '').replace(/\{name\}/g, name);
}

// ---------------------------------------------
// Business-name helper
// ---------------------------------------------

function _clThreadBusinessName(concept) {
  const b = (concept && concept.business) ? concept.business : {};
  const raw = (b.name && String(b.name).trim()) ? String(b.name).trim() : '';
  return raw || 'your business';
}

// ---------------------------------------------
// Opening message
// ---------------------------------------------
//
// Called once, on first open of a task detail whose thread is
// empty. Returns a plain string; the caller wraps it into a
// message object and pushes it onto `task.thread`.
//
// Structure: "I picked this task for {name}. {reason} What
// would you like to know?" \u2014 the reason is dropped in
// verbatim because it's already sentence-cased and terminated
// in tasks.js. Falls back to a neutral phrase when reason is
// missing (shouldn't happen with seeded tasks but keeps
// legacy state safe).

function _claraThreadOpening(task, concept) {
  const name = _clThreadBusinessName(concept);
  const reason = (task && task.reason && String(task.reason).trim())
    ? String(task.reason).trim()
    : 'It moves the needle right now.';
  return 'I picked this task for ' + name + '. ' + reason + ' What would you like to know?';
}

// ---------------------------------------------
// Response engine
// ---------------------------------------------

function _claraThreadRespond(userMsg, task, concept) {
  const msg = _clThreadNormalise(userMsg);
  const name = _clThreadBusinessName(concept);
  const type = String((task && task.type) || 'POST').toUpperCase();

  // Route by type first, then keyword. Unknown types fall
  // through to POST which is the most common variant.
  const table = CL_THREAD_TEMPLATES[type] || CL_THREAD_TEMPLATES.POST;
  const keyword = _clThreadMatchKeyword(msg);
  const template = (keyword && table[keyword]) ? table[keyword] : table.default;

  return _clThreadInterpolate(template, name);
}

// ---------------------------------------------
// Exports
// ---------------------------------------------

window._claraThreadOpening = _claraThreadOpening;
window._claraThreadRespond = _claraThreadRespond;
