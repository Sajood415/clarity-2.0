// ---------------------------------------------
// Clarity 2.0 -- Clara insight-thread response engine
// ---------------------------------------------
//
// Powers the "Ask Clara" thread that lives on every Daily Insight
// card (Today screen + insight detail sub-view). Mirrors the shape
// of `threadRespond.js` (per-task thread engine) so a user's
// mental model transfers cleanly between the two surfaces:
//
//   * User is looking at a specific insight -- responses are
//     keyed on lightweight tags derived from the insight's
//     `stat` sentence (retention / traffic / reviews / pricing /
//     search / social / referral / operations) rather than a
//     rigid enum.
//   * No LLM. Templates only. Same pattern as
//     `threadRespond.js`, `customerTemplates.js`, `insights.js`.
//   * Interpolates `{name}` (the business) and nothing else --
//     responses read as an advisor's take on the number, not a
//     bot repeating the sentence back.
//
// Public surface (both exposed on window; index.html loads this
// file before today.js so the handlers can call them at send
// time):
//
//   _claraInsightThreadOpening(insight, concept)  -> string
//   _claraInsightThreadRespond(userMsg, insight, concept) -> string
//
// `_claraInsightThreadOpening` is called ONCE per insight, the
// first time the user opens an Ask Clara thread and finds it
// empty. It ties the insight's headline back to the user's
// business so the transcript reads like a continuation of the
// card, not a fresh reset.
//
// `_claraInsightThreadRespond` handles every follow-up. It
// normalises the message, walks a priority-ordered keyword list
// (specific > general -- "how much time" hits `time`, not `how`),
// and returns the matching template with `{name}` interpolated.
// If no keyword hits, the per-tag `default` template fires; if
// no tag matches the insight either, a neutral generic default
// is used so we never crash on a novel insight template.

// ---------------------------------------------
// Message normalisation
// ---------------------------------------------

function _clInsThreadNormalise(msg) {
  return String(msg || '').toLowerCase().trim();
}

function _clInsThreadContainsAny(haystack, needles) {
  for (let i = 0; i < needles.length; i++) {
    if (haystack.indexOf(needles[i]) !== -1) return true;
  }
  return false;
}

// ---------------------------------------------
// Insight -> tag routing
// ---------------------------------------------
//
// The insight `id` is `ins_YYYY-MM-DD_<templateKey>` and the
// template keys already encode a topic (small_local_search,
// small_quiet_churn, small_reviews_signage, etc.). We collapse
// those into a smaller set of "advisor tags" so the response
// table stays maintainable. Anything unrecognised falls through
// to `generic`.

function _clInsTag(insight) {
  const id = String((insight && insight.id) || '').toLowerCase();
  const stat = String((insight && insight.stat) || '').toLowerCase();
  const headline = String((insight && insight.headline) || '').toLowerCase();
  const hay = id + ' ' + stat + ' ' + headline;

  if (_clInsThreadContainsAny(hay, ['review', 'reviews', 'reputation', 'star'])) return 'reviews';
  if (_clInsThreadContainsAny(hay, ['search', 'seo', 'google', 'local search', 'discover'])) return 'search';
  if (_clInsThreadContainsAny(hay, ['loyal', 'churn', 'retention', 'regular', 'returning'])) return 'retention';
  if (_clInsThreadContainsAny(hay, ['referral', 'word of mouth', 'friend', 'recommend'])) return 'referral';
  if (_clInsThreadContainsAny(hay, ['price', 'pricing', 'margin', 'discount', 'offer'])) return 'pricing';
  if (_clInsThreadContainsAny(hay, ['scope', 'delivery', 'operations', 'process', 'workflow'])) return 'operations';
  if (_clInsThreadContainsAny(hay, ['social', 'post', 'content', 'engagement', 'follower'])) return 'social';
  if (_clInsThreadContainsAny(hay, ['foot traffic', 'walk in', 'in-store', 'location'])) return 'traffic';
  return 'generic';
}

// ---------------------------------------------
// Keyword router
// ---------------------------------------------
//
// Same priority discipline as `threadRespond.js`: specific >
// general. Every keyword returns a template key that must exist
// on every advisor tag (all rows include `default` at minimum);
// if a specific keyword slot is missing for a tag we fall back
// to that tag's `default`.

function _clInsThreadMatchKeyword(msg) {
  if (_clInsThreadContainsAny(msg, ['proof', 'source', 'where from', 'trust', 'real'])) return 'proof';
  if (_clInsThreadContainsAny(msg, ['do', 'action', 'start', 'first step', 'begin', 'now'])) return 'action';
  if (_clInsThreadContainsAny(msg, ['example', 'idea', 'ideas', 'suggest', 'suggestion'])) return 'example';
  if (_clInsThreadContainsAny(msg, ['time', 'how long', 'minutes', 'minute', 'hour', 'quick'])) return 'time';
  if (_clInsThreadContainsAny(msg, ['apply', 'me', 'my', 'for us', 'us'])) return 'apply';
  if (_clInsThreadContainsAny(msg, ['skeptic', 'skeptical', 'doubt', 'sure', 'really'])) return 'skeptic';
  if (_clInsThreadContainsAny(msg, ['how'])) return 'how';
  if (_clInsThreadContainsAny(msg, ['why'])) return 'why';
  return null;
}

// ---------------------------------------------
// Template table
// ---------------------------------------------
//
// 8 tags x 8 keyword slots + a `default` per tag = 72 lines.
// All strings reference `{name}` where useful. Kept short and
// opinionated -- the pattern is "here's what I'd actually do
// with this stat", not a summary of the stat.

const CL_INS_THREAD_TEMPLATES = {
  reviews: {
    proof: 'BrightLocal has been running this survey since 2015. Same directional finding every year -- reviews are the first filter, not the tiebreaker.',
    action: 'Ask three regulars for a review by name this week. Do it in person or in DM, not a mass email.',
    example: 'Try: "Hey, would you mind leaving a quick line about your last visit? Two sentences is plenty." Works ~40% of the time.',
    time: '3 minutes per ask. If you\u2019re drafting the request longer than that, you\u2019re overthinking it.',
    apply: 'For {name} specifically: check what shows up on the first page of Google for your name + city. If reviews are missing or dated, that\u2019s your gap.',
    skeptic: 'Fair. Even 5 fresh reviews from real customers moves the needle -- because buyers care as much about *recency* as count.',
    how: 'One line, one channel, one person at a time. "Would you leave a quick review?" That\u2019s it.',
    why: 'Reviews are how strangers decide. Without them, you\u2019re invisible even when you\u2019re close and open.',
    default: 'For {name}, this one is compounding: every new review makes the next customer\u2019s decision easier. Start with 3 this week.'
  },
  search: {
    proof: 'Google publishes this in their annual Consumer Insights report. The offline-conversion number has been climbing for a decade.',
    action: 'Verify your Google Business Profile today, add 5 recent photos, and update hours. That alone doubles most local businesses\u2019 visibility.',
    example: 'A florist I know added weekly photos of new arrivals and picked up 3-4 walk-ins/week within a month.',
    time: '20 minutes to verify + upload photos. Then 5 minutes/week to keep it warm.',
    apply: 'For {name}: search yourself on your phone, incognito. Whatever\u2019s missing at the top -- hours, photos, service list -- fill that first.',
    skeptic: 'It sounds too easy, but that\u2019s the whole reason it works. Most competitors don\u2019t bother.',
    how: 'Own the top 3 results for "{name} + city". Google Business Profile, your site, one social. Anything beyond that is bonus.',
    why: 'Local intent is high intent. Someone searching in the last 24 hours is a buyer, not a browser.',
    default: 'For {name}, the search game is boring on purpose: photos, hours, reviews, respond to every message. Do that, win the local pack.'
  },
  retention: {
    proof: 'Chamber of Commerce data. Same finding across industries -- indifference, not price, is the top churn reason.',
    action: 'Send a personal "hey, been a minute" note to your top 10 regulars this week. Costs nothing, changes everything.',
    example: 'A gym I worked with sent a handwritten card to lapsed members. 40% reactivated within 30 days.',
    time: '5 minutes per note. Batch it on one afternoon.',
    apply: 'For {name}: pull anyone who was a top buyer 3-6 months ago and hasn\u2019t returned. That\u2019s the list.',
    skeptic: 'The customers you already have are worth 5-10x a new lead. This isn\u2019t sentiment, it\u2019s math.',
    how: 'One personal message + one small offer they can\u2019t get elsewhere. Not a discount -- a signal that they matter.',
    why: 'Because acquisition is expensive and forgettable. Retention is cheap and compounding.',
    default: 'For {name}, the play is: look after the customers you already have. New ones show up when the existing ones brag about you.'
  },
  referral: {
    proof: 'YouGov and Nielsen have both replicated this. People trust a friend\u2019s recommendation 4x more than any ad.',
    action: 'Ask your last 5 happy customers if they know one person who\u2019d benefit. Not a "share this post" ask -- a specific one.',
    example: 'Direct message: "You mentioned your friend was looking for [X]. Happy to chat with them if it helps."',
    time: '2 minutes per ask.',
    apply: 'For {name}: whoever left the last glowing review or DM is warm right now. That\u2019s your ask.',
    skeptic: 'It feels awkward, but customers who love you actually want to help. Give them the language.',
    how: 'Make the ask specific and easy to say yes to. Vague asks get vague answers.',
    why: 'A referred customer converts higher, pays more, and stays longer. Every metric wins.',
    default: 'For {name}, referrals are quietly the highest-ROI channel. It just requires actually asking.'
  },
  pricing: {
    proof: 'Deltek Agency Study has run for 15 years. Scope creep and vague pricing are the top-2 margin killers, every single year.',
    action: 'Pick one signature offer, put a clear fixed price on it publicly this week. See what happens.',
    example: 'Instead of "packages start at", say "$X, includes A, B, C. Anything beyond is quoted separately." That\u2019s the whole page.',
    time: '15 minutes to write, 5 to publish.',
    apply: 'For {name}: if a stranger can\u2019t figure out what one thing costs from your site, that\u2019s the leak.',
    skeptic: 'Transparent pricing scares off the tire-kickers -- and that\u2019s the point. Better leads, faster closes.',
    how: 'One offer, one price, one paragraph of scope. Everything else lives in a separate quote.',
    why: 'Every hidden or negotiable price adds a hesitation cycle. Multiple cycles = lost deal.',
    default: 'For {name}, pricing clarity is the fastest lever most owners never pull. Try it once, watch the calls change.'
  },
  operations: {
    proof: 'This shows up across every operational benchmark study I\u2019ve seen -- the number is boringly consistent.',
    action: 'Write down your top 3 recurring "surprise" tasks this month. That\u2019s your scope creep list.',
    example: 'Add a "change request" clause to your next quote. 50% premium above your base rate. Watch the pattern shift.',
    time: '30 minutes to audit last month\u2019s hours. Do it once, act on it for a year.',
    apply: 'For {name}: whichever project bled the most last month -- that\u2019s the pattern, not an outlier.',
    skeptic: 'Sure, one project is noise. But if it\u2019s the same shape of loss every quarter, it\u2019s the model.',
    how: 'Scope written in outcomes, not tasks. Deliverables invite requests; outcomes close them.',
    why: 'You can\u2019t out-hustle a leaky process. Fixing the process makes the hustling actually pay.',
    default: 'For {name}, the fix is upstream: tighten the scope conversation and the margin follows.'
  },
  social: {
    proof: 'HubSpot\u2019s State of Marketing report. Same finding in Sprout Social\u2019s dataset. Answer-shaped posts beat promotional posts on every metric.',
    action: 'Post one answer to a common customer question this week. Photo optional, clarity required.',
    example: 'DM your last question from a customer. Reformat it, post the answer publicly. Do it every week.',
    time: '5-10 minutes per post.',
    apply: 'For {name}: check your DMs from the last 30 days. Every question that came up twice is a post waiting to happen.',
    skeptic: 'Yes -- because it works AS content AND as SEO AND as a customer service shortcut. Triple duty.',
    how: 'One question per post. State the question, answer plainly, one photo if it helps.',
    why: 'Answers earn trust. Promotional posts burn it.',
    default: 'For {name}, useful beats clever. Answer questions your customers actually ask.'
  },
  traffic: {
    proof: 'Local Consumer Report + BrightLocal both show this. Online research now happens BEFORE the walk-in, not after.',
    action: 'Own your first-page Google result. Photos, hours, reviews. Every friction there costs a walk-in.',
    example: 'A cafe I know added a "what\u2019s on the counter today" story every morning. Foot traffic up ~25% in 6 weeks.',
    time: '5 minutes/day on a live update. That\u2019s it.',
    apply: 'For {name}: what\u2019s your Google Business Profile look like on someone else\u2019s phone right now?',
    skeptic: 'Walk-ins feel spontaneous. They\u2019re not -- they\u2019re researched, then executed.',
    how: 'Photos, hours, "popular times", reply to every question. That\u2019s the whole formula.',
    why: 'The buyer decides on their phone before they leave the house. You either show up there or you don\u2019t.',
    default: 'For {name}, the walk-in starts on a screen. Make the screen version undeniable.'
  },
  generic: {
    proof: 'The source on the card is real. The number moves within a range across studies, but the direction is consistent every year.',
    action: 'Pick the smallest version of this you can do this week. Momentum > perfection.',
    example: 'The bullets on the card ARE the examples -- start with whichever one feels least scary.',
    time: 'Depends on the bullet. Most are 5-15 minutes of real work.',
    apply: 'For {name}: read the bullets as if I wrote them just for you. Which one is the most obvious next move?',
    skeptic: 'Fair to question -- but the pattern shows up too consistently to ignore.',
    how: 'Pick one bullet. Do it today. Notice what changed. Adjust from there.',
    why: 'Because the number is one signal, and the bullets are the plan. Don\u2019t stop at the number.',
    default: 'For {name}, treat this as a nudge, not a mandate. One small move this week beats a big plan next month.'
  }
};

// ---------------------------------------------
// Interpolation
// ---------------------------------------------

function _clInsThreadInterpolate(template, name) {
  return String(template || '').replace(/\{name\}/g, name);
}

// ---------------------------------------------
// Business-name helper
// ---------------------------------------------

function _clInsThreadBusinessName(concept) {
  const b = (concept && concept.business) ? concept.business : {};
  const raw = (b.name && String(b.name).trim()) ? String(b.name).trim() : '';
  return raw || 'your business';
}

// ---------------------------------------------
// Opening message
// ---------------------------------------------
//
// Called once, on first open of an insight thread that's empty.
// Ties the headline to the business so the transcript picks up
// where the card left off.

function _claraInsightThreadOpening(insight, concept) {
  const name = _clInsThreadBusinessName(concept);
  const headline = (insight && insight.headline && String(insight.headline).trim())
    ? String(insight.headline).trim()
    : '';
  const stem = headline
    ? 'This one caught my eye for ' + name + ': "' + headline + '." '
    : 'I flagged this for ' + name + '. ';
  return stem + 'Ask me what to do about it, why it matters, or how it applies to your setup.';
}

// ---------------------------------------------
// Response engine
// ---------------------------------------------

function _claraInsightThreadRespond(userMsg, insight, concept) {
  const msg = _clInsThreadNormalise(userMsg);
  const name = _clInsThreadBusinessName(concept);
  const tag = _clInsTag(insight);
  const table = CL_INS_THREAD_TEMPLATES[tag] || CL_INS_THREAD_TEMPLATES.generic;
  const keyword = _clInsThreadMatchKeyword(msg);
  const template = (keyword && table[keyword]) ? table[keyword] : table.default;
  return _clInsThreadInterpolate(template, name);
}

// ---------------------------------------------
// Exports
// ---------------------------------------------

window._claraInsightThreadOpening = _claraInsightThreadOpening;
window._claraInsightThreadRespond = _claraInsightThreadRespond;
