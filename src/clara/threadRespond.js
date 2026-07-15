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
//   _claraThreadRespond(userMsg, task, concept)
//     -> { text, patch?, closeAndReturn? }
//
// `_claraThreadOpening` is called ONCE per task, the first
// time a user opens the detail page and finds an empty
// thread. It seeds a single Clara message tying together the
// user's business name and the task's rationale.
//
// `_claraThreadRespond` is called on every user submission.
// The engine first looks for an UPDATE command in the message
// ("change this to X", "make it easier", "different one",
// "make it a post", etc). If one is detected it returns a
// patch the caller applies onto the live task + a signal to
// close the detail view. Otherwise it falls through to the
// template-based reply engine (unchanged): normalise, walk a
// priority-ordered keyword list (specific > general, so "how
// hard is this" hits `hard` not `how`), interpolate `{name}`.

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
// Update-command detection
// ---------------------------------------------
//
// The task-thread is a "debate" surface now: the user can say
// "change this to X", "make it easier", "give me a different one",
// "make it an offer instead" and Clara will mutate the underlying
// task rather than just reply. Detection is deterministic and
// keyword-based (same philosophy as the reply engine) so a
// production build never depends on an LLM. The chip buttons above
// the input send fixed phrases that always match a command.
//
// Returns null when the message is normal chat (no mutation), or an
// object of shape:
//   { kind: 'rewrite',   newDescription: '...'  }  \u2014 user supplied text
//   { kind: 'alternative' }                        \u2014 regenerate same type
//   { kind: 'easier'    }                          \u2014 gentler variant
//   { kind: 'shorter'   }                          \u2014 shorter time estimate
//   { kind: 'type',      newType: 'POST'|'OUTREACH'|'OFFER' }
//   { kind: 'type-cycle' }                         \u2014 rotate to next type
// The caller is expected to translate the command into a task patch
// (see _claraThreadBuildPatch) and apply it.

// Trims a captured "new description" fragment: strips leading
// punctuation, ensures sentence-case, guarantees a terminating
// period so short one-liners don't read as prompts.
function _clThreadTidyDesc(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^[\s\-:\u2014\u2013]+/, '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
}

function _clThreadDetectCommand(rawMsg) {
  const m = String(rawMsg || '').trim();
  if (!m) return null;

  // Fast path: the four chip buttons send fixed canonical phrases,
  // so we short-circuit them before the more permissive regex
  // heuristics below. Keeps "Change this task" from being tokenised
  // as an explicit-rewrite (no "to X" payload) and dropped on the
  // floor by the general "change it$" alternative pattern (which
  // ends with $).
  if (/^change\s+this\s+task[.!?]?$/i.test(m))       return { kind: 'alternative' };
  if (/^make\s+it\s+easier[.!?]?$/i.test(m))         return { kind: 'easier' };
  if (/^try\s+a\s+different\s+type[.!?]?$/i.test(m)) return { kind: 'type-cycle' };

  // Explicit rewrite with a target payload:
  //   "change this to X"
  //   "change it to X"
  //   "change the task to X"
  //   "make it X"
  //   "rewrite (as|to) X"
  //   "update to X"
  //   "set (it|task) to X"
  let hit = m.match(/^(?:change|rewrite|update|set)\s+(?:this|it|the\s+task|task)?\s*(?:to|as|into|:)\s+(.{6,})$/i);
  if (hit) {
    const desc = _clThreadTidyDesc(hit[1]);
    if (desc.length >= 6) return { kind: 'rewrite', newDescription: desc };
  }
  hit = m.match(/^make\s+(?:it|the\s+task|task)\s+(.{6,})$/i);
  if (hit && !/^(?:easier|simpler|shorter|quicker|faster|a\s+post|an?\s+outreach|an?\s+offer)\b/i.test(hit[1])) {
    const desc = _clThreadTidyDesc(hit[1]);
    if (desc.length >= 6) return { kind: 'rewrite', newDescription: desc };
  }
  hit = m.match(/^(?:my\s+task|new\s+task|task)\s*(?:is|should\s+be|=|:)\s*(.{6,})$/i);
  if (hit) {
    const desc = _clThreadTidyDesc(hit[1]);
    if (desc.length >= 6) return { kind: 'rewrite', newDescription: desc };
  }

  // Type swaps. Guard so plain mentions of "post" (very common
  // English word) don't trigger a type change on their own -- we
  // require an accompanying change/make/switch verb.
  const wantsTypeVerb = /\b(?:make|change|switch|swap|turn|convert)\b/i.test(m);
  if (wantsTypeVerb && /\b(?:a\s+post|to\s+(?:a\s+)?post|post\s+task|post\s+instead)\b/i.test(m)) {
    return { kind: 'type', newType: 'POST' };
  }
  if (wantsTypeVerb && /\b(?:an?\s+outreach|to\s+outreach|outreach\s+task|outreach\s+instead)\b/i.test(m)) {
    return { kind: 'type', newType: 'OUTREACH' };
  }
  if (wantsTypeVerb && /\b(?:an?\s+offer|to\s+(?:an?\s+)?offer|offer\s+task|offer\s+instead)\b/i.test(m)) {
    return { kind: 'type', newType: 'OFFER' };
  }

  // Chip-phrase: "Try a different type" -> cycle to next type.
  if (/\b(?:different\s+type|another\s+type|try\s+a\s+different\s+type|switch\s+type|cycle\s+type)\b/i.test(m)) {
    return { kind: 'type-cycle' };
  }

  // Shorter / quicker.
  if (/\b(?:shorter|quicker|faster|less\s+time|make\s+it\s+short|shrink\s+it|too\s+long)\b/i.test(m)) {
    return { kind: 'shorter' };
  }

  // Easier / simpler.
  if (/\b(?:easier|simpler|too\s+hard|too\s+difficult|dumb\s+it\s+down|make\s+it\s+easy|less\s+intense)\b/i.test(m)) {
    return { kind: 'easier' };
  }

  // Regenerate alternative. Catches: "change it", "change this",
  // "change (my )?task", "don't like it", "not for me", "different
  // one", "another one", "new task", "alternative", "swap this",
  // "give me a different one". The explicit-rewrite branch above
  // has priority, so "change X to Y" resolves to rewrite; only bare
  // "change X" falls to this branch.
  if (/(?:don'?t\s+like|dont\s+like|not\s+for\s+me|not\s+into|hate\s+this|change\s+(?:this\s+task|(?:my\s+)?task|it|this)\b|different\s+one|another\s+one|another\s+task|new\s+task|alternative|swap\s+(?:this|it)|regenerat|give\s+me\s+(?:a\s+)?(?:different|another|new))/i.test(m)) {
    return { kind: 'alternative' };
  }

  return null;
}

// ---------------------------------------------
// Alt/simpler/shorter template libraries
// ---------------------------------------------
//
// Each type has 4 alternative descriptions + reasons that Clara can
// rotate through when the user asks for a different one. Task carries
// its own `_altIdx` counter that we advance on every alt so successive
// clicks feel like a real dial being turned, not a random shuffle.

const CL_THREAD_ALT_TEMPLATES = {
  POST: [
    {
      description: 'Post one short win from this week at {name}. Two lines, no filter, no hashtags.',
      reason: 'Small wins compound. The audience that saw yesterday\u2019s post needs a reason to check back tomorrow.',
      time: '5 min'
    },
    {
      description: 'Share a customer quote from a recent chat about {name}. Their words, not yours.',
      reason: 'Real customer language beats copy every time. It also signals: someone actually uses this.',
      time: '5 min'
    },
    {
      description: 'Post a photo of the workspace where {name} actually happens. One line caption, no polish.',
      reason: 'Behind-the-scenes shots humanise the brand and outperform product shots for new audiences.',
      time: '5 min'
    },
    {
      description: 'Ask one open question your customer at {name} is quietly wrestling with.',
      reason: 'Questions get 3x the replies of statements. Comments train the algorithm to show the post to more of the right people.',
      time: '5 min'
    }
  ],
  OUTREACH: [
    {
      description: 'Send a personal note to 3 past customers of {name} who haven\u2019t bought again. No pitch.',
      reason: 'A "how\u2019s it going" from someone they already trust pulls back more revenue than any cold campaign.',
      time: '10 min'
    },
    {
      description: 'Message 3 people who liked your last {name} post. Ask what caught their eye.',
      reason: 'They\u2019ve already raised a hand. Follow up while it\u2019s warm \u2014 the conversation writes itself from there.',
      time: '10 min'
    },
    {
      description: 'Reply to one comment or DM on {name} you never got around to. Personal, no template.',
      reason: 'Every unanswered message is a small trust leak. Reversing them takes minutes and lands better than any new post.',
      time: '5 min'
    },
    {
      description: 'DM 5 people who fit your ideal customer profile for {name}. Ask what they\u2019re working on \u2014 not what they need.',
      reason: 'Curiosity converts. Opening a real conversation is 10x more effective than opening a sales pitch.',
      time: '15 min'
    }
  ],
  OFFER: [
    {
      description: 'Package the most-requested thing at {name} as a fixed-price offer. One line, one price, one deadline.',
      reason: 'Clarity closes deals. Every hidden or negotiable price adds a hesitation cycle.',
      time: '15 min'
    },
    {
      description: 'Bundle two related things from {name} at a slight discount. Frame it as a starter kit.',
      reason: 'Bundles raise average order value without the "everyone is on sale" race to zero.',
      time: '15 min'
    },
    {
      description: 'Announce a 3-day price freeze on the next {name} order. Same price, tight window.',
      reason: 'Deadlines drive decisions. Same offer, published on Tuesday with a Friday cutoff, converts.',
      time: '10 min'
    },
    {
      description: 'Offer a free 15-minute consult tied to your main {name} service. Book 3 slots this week.',
      reason: 'Free calls disqualify tyre-kickers and let real prospects self-select. Cheaper than any lead magnet.',
      time: '15 min'
    }
  ]
};

// Simpler "easier" variants -- shorter descriptions, gentler tone,
// low-friction first step. Not the same as the alt table: these are
// intentionally the LEAST intimidating version of each task.
const CL_THREAD_EASIER_TEMPLATES = {
  POST: {
    description: 'Post one photo. Just one line as the caption.',
    reason: 'Lowest effort version that still counts as showing up. Consistency > polish, especially in week one.',
    time: '3 min'
  },
  OUTREACH: {
    description: 'Send one message to one person about {name}. Doesn\u2019t have to be a pitch.',
    reason: 'One conversation is enough to break the "I haven\u2019t reached out in ages" spiral.',
    time: '3 min'
  },
  OFFER: {
    description: 'Write your simplest offer for {name} on paper: who, what, price. Nothing else.',
    reason: 'Clarity comes before publication. Get it right in one sentence before you build a landing page.',
    time: '5 min'
  }
};

// Type cycle order. Used when the user asks for "a different type"
// without specifying which one.
const CL_THREAD_TYPE_ORDER = ['POST', 'OUTREACH', 'OFFER'];

// Build a patch object the caller applies onto the live task. Uses
// `task._altIdx` (persisted on the task itself) to walk the alt
// table forwards on every request -- successive "change it" clicks
// feel like scrolling through options, not rolling dice.
function _claraThreadBuildPatch(command, task, concept) {
  const name = _clThreadBusinessName(concept);
  const currentType = String((task && task.type) || 'POST').toUpperCase();

  if (!command || !command.kind) return null;

  if (command.kind === 'rewrite') {
    return {
      description: command.newDescription,
      reason: 'You wrote this one yourself.',
      _authored: 'user'
    };
  }

  if (command.kind === 'type' || command.kind === 'type-cycle') {
    let nextType;
    if (command.kind === 'type') {
      nextType = command.newType;
    } else {
      const idx = CL_THREAD_TYPE_ORDER.indexOf(currentType);
      nextType = CL_THREAD_TYPE_ORDER[(idx + 1) % CL_THREAD_TYPE_ORDER.length];
    }
    // For a type swap, seed the description from the alt table of
    // the NEW type so the copy actually matches the new lane.
    const table = CL_THREAD_ALT_TEMPLATES[nextType] || CL_THREAD_ALT_TEMPLATES.POST;
    const pick = table[0];
    return {
      type: nextType,
      description: _clThreadInterpolate(pick.description, name),
      reason: _clThreadInterpolate(pick.reason, name),
      time: pick.time,
      _altIdx: 0
    };
  }

  if (command.kind === 'alternative') {
    const table = CL_THREAD_ALT_TEMPLATES[currentType] || CL_THREAD_ALT_TEMPLATES.POST;
    const curIdx = (typeof task._altIdx === 'number' && task._altIdx >= 0) ? task._altIdx : -1;
    const nextIdx = (curIdx + 1) % table.length;
    const pick = table[nextIdx];
    return {
      description: _clThreadInterpolate(pick.description, name),
      reason: _clThreadInterpolate(pick.reason, name),
      time: pick.time,
      _altIdx: nextIdx
    };
  }

  if (command.kind === 'easier') {
    const pick = CL_THREAD_EASIER_TEMPLATES[currentType] || CL_THREAD_EASIER_TEMPLATES.POST;
    return {
      description: _clThreadInterpolate(pick.description, name),
      reason: _clThreadInterpolate(pick.reason, name),
      time: pick.time
    };
  }

  if (command.kind === 'shorter') {
    // Shrink the time estimate. Text stays the same; the user just
    // wanted a quicker beat. Falls back to a sensible floor if the
    // current value doesn't parse (e.g. "quick note").
    const cur = String((task && task.time) || '5 min');
    const minMatch = cur.match(/(\d+)\s*min/i);
    if (minMatch) {
      const n = parseInt(minMatch[1], 10);
      const next = Math.max(3, Math.floor(n / 2));
      return { time: next + ' min' };
    }
    return { time: '5 min' };
  }

  return null;
}

// Confirmation copy shown as Clara's reply when a patch is applied.
// Kept short + declarative so the "task updated" beat feels like an
// action, not a paragraph.
function _clThreadConfirmationText(command, task, patch, name) {
  if (!command || !patch) return 'Got it.';
  if (command.kind === 'rewrite')     return 'Updated. Using your version now.';
  if (command.kind === 'type')        return 'Swapped to a ' + String(patch.type).toLowerCase() + ' task. Taking you back to Today.';
  if (command.kind === 'type-cycle')  return 'Rotated to a ' + String(patch.type).toLowerCase() + ' angle. Taking you back to Today.';
  if (command.kind === 'alternative') return 'New angle for ' + name + '. Take a look on Today.';
  if (command.kind === 'easier')      return 'Made it lighter. Same intent, half the friction.';
  if (command.kind === 'shorter')     return 'Trimmed the time down. Back to Today.';
  return 'Task updated.';
}

// ---------------------------------------------
// Response engine
// ---------------------------------------------
//
// Returns { text, patch?, closeAndReturn? }:
//   \u2022 text            \u2014 Clara's chat reply to display
//   \u2022 patch           \u2014 Fields to Object.assign onto the task, if any
//   \u2022 closeAndReturn  \u2014 true when the caller should close the
//                         detail sub-view and smooth-scroll to the
//                         updated row on the Today list
//
// Update commands short-circuit the normal keyword-template path.
// Free-form chat still lands in the template table exactly as
// before, so nothing about the "just chat" experience changes.

function _claraThreadRespond(userMsg, task, concept) {
  const rawMsg = String(userMsg || '');
  const msg = _clThreadNormalise(rawMsg);
  const name = _clThreadBusinessName(concept);
  const type = String((task && task.type) || 'POST').toUpperCase();

  // 1) Command layer -- does this message ask Clara to CHANGE
  // something about the task?
  const command = _clThreadDetectCommand(rawMsg);
  if (command) {
    const patch = _claraThreadBuildPatch(command, task, concept);
    if (patch) {
      return {
        text: _clThreadConfirmationText(command, task, patch, name),
        patch: patch,
        closeAndReturn: true
      };
    }
    // Command detected but patch failed to build (defensive) -- fall
    // through to the reply engine so the user still gets *something*.
  }

  // 2) Reply layer -- normal chat, no mutation.
  const table = CL_THREAD_TEMPLATES[type] || CL_THREAD_TEMPLATES.POST;
  const keyword = _clThreadMatchKeyword(msg);
  const template = (keyword && table[keyword]) ? table[keyword] : table.default;
  return {
    text: _clThreadInterpolate(template, name),
    patch: null,
    closeAndReturn: false
  };
}

// ---------------------------------------------
// Exports
// ---------------------------------------------

window._claraThreadOpening = _claraThreadOpening;
window._claraThreadRespond = _claraThreadRespond;
