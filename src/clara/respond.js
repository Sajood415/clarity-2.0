// ---------------------------------------------
// Clarity 2.0 — Clara response engine
// ---------------------------------------------
//
// Runs Clara's free-chat replies (post-onboarding). Given the user's
// message and the active concept, returns:
//
//   { text: string, insightCard?: { label, text } }
//
// The reply is composed of two independent parts:
//   1. An intent match — routed through _claraIntentReply. Every branch
//      reads real business context (name, type, goal, channels, budget,
//      generatedPersona, research payload, tasks) so the answer feels
//      specific rather than generic.
//   2. An optional insight-card reference — resolved by
//      _claraMatchInsightCard. When the message mentions "market",
//      "customer", "edge" or "first move", we surface the same card
//      the Overview page shows so Clara stays consistent with the
//      workspace's own read.
//
// Intent priority matters because messages overlap ("what content should
// I post for my customers"). We match in a fixed order: market → customer
// → edge → first-move → outreach/leads → content → tasks/today →
// budget/ads → default. First hit wins.
//
// Absent context is handled gracefully. `generatedPersona` and the
// deeper `research.competition.whitespace` / `research.marketScan.
// gapHeadline` / `research.customerIntelligence.topTrigger` fields
// don't exist in the current schema; every branch either falls back
// to a type-keyed sentence or borrows the Overview insight generator.

// ---------------------------------------------
// Message text normalisation
// ---------------------------------------------

function _clNormalise(msg) {
  return String(msg || '').toLowerCase().trim();
}

function _clContainsAny(haystack, needles) {
  for (let i = 0; i < needles.length; i++) {
    if (haystack.indexOf(needles[i]) !== -1) return true;
  }
  return false;
}

// ---------------------------------------------
// Insight card matcher
// ---------------------------------------------
//
// Returns `{ label, text }` when the message references one of the four
// Overview insight cards, else null. The card is rendered inline under
// Clara's reply so users see the same summary phrase they'd see on the
// Overview page.

function _claraMatchInsightCard(message, concept) {
  const m = _clNormalise(message);
  const b = concept && concept.business ? concept.business : {};
  const gen = (typeof window !== 'undefined' && window._ovInsights) ? window._ovInsights : null;
  if (!gen) return null;

  // Order intentionally: "first move" is checked BEFORE "market" so
  // "what should I do first" doesn't get pulled toward the market
  // card by the word "do".
  if (_clContainsAny(m, ['first move', 'what should i do', 'where to start', 'where do i start', 'where should i start', 'where should i begin', 'where do i begin'])) {
    return { label: 'FIRST MOVE', text: gen.firstMove(b) };
  }
  if (_clContainsAny(m, ['market', 'opportunity'])) {
    return { label: 'YOUR MARKET', text: gen.market(b) };
  }
  if (_clContainsAny(m, ['customer', 'persona'])) {
    return { label: 'YOUR CUSTOMER', text: gen.customer(b) };
  }
  if (_clContainsAny(m, ['edge', 'competition', 'competitor', 'competitors'])) {
    return { label: 'YOUR EDGE', text: gen.edge(b) };
  }
  return null;
}

// ---------------------------------------------
// Intent router
// ---------------------------------------------

function _claraIntentReply(message, concept) {
  const m = _clNormalise(message);
  const b = concept && concept.business ? concept.business : {};
  const research = concept && concept.research ? concept.research : {};
  const tasksBlock = concept && concept.tasks ? concept.tasks : { items: [], activeBoard: 'default' };
  const results = concept && concept.results && Array.isArray(concept.results.items)
    ? concept.results.items
    : [];

  const name = (b.name && b.name.trim()) ? b.name.trim() : 'your business';
  const type = String(b.type || '').toLowerCase();
  const goal = String(b.goal || '').toLowerCase();
  const channels = Array.isArray(b.channels) ? b.channels : [];
  const budget = String(b.budget || 'unknown').toLowerCase();
  const persona = b.generatedPersona || null; // aspirational; usually absent

  // --- INTENT: market / opportunity / gap ---
  if (_clContainsAny(m, ['market', 'opportunity', 'gap'])) {
    const gap = (research.marketScan && research.marketScan.gapHeadline)
      ? research.marketScan.gapHeadline
      : (type === 'food' || type === 'small'
          ? 'Local demand is strong but most competitors are undifferentiated.'
          : type === 'tech' || type === 'saas'
          ? 'The simple highly specialised quadrant is the least contested.'
          : 'Most businesses in your space are not communicating clearly.');
    return 'Your market opportunity: ' + gap
      + ' The businesses winning right now are the ones who show up consistently and speak directly to one specific customer. That\u2019s the play for ' + name + '.';
  }

  // --- INTENT: customer / persona / who ---
  if (_clContainsAny(m, ['customer', 'persona', 'who is', 'who are'])) {
    let subject;
    if (persona) {
      subject = persona.name + ', ' + persona.age + '. ' + (persona.desc || '')
        + '. They care most about ' + ((persona.traits && persona.traits[0]) || 'trust and clarity')
        + ' and their main buying trigger is ' + (persona.trigger || 'a real recommendation from someone they trust');
    } else if (research.customerIntelligence && research.customerIntelligence.topTrigger) {
      subject = research.customerIntelligence.topTrigger;
    } else if (b.customer && b.customer.trim()) {
      subject = b.customer.trim();
    } else {
      subject = 'someone who values quality and trust above all else';
    }
    // Strip a trailing period so we don't end up with ".." when the
    // user's raw customer text already ends with a full stop.
    subject = subject.replace(/[.!?\s]+$/, '');
    return 'Your main customer is ' + subject
      + '. Does this still feel accurate or do you want to refine it?';
  }

  // --- INTENT: edge / competition / competitors ---
  if (_clContainsAny(m, ['edge', 'competition', 'competitor'])) {
    const whitespace = (research.competition && research.competition.whitespace)
      ? research.competition.whitespace
      : ('Most competitors in your space focus on '
          + (type === 'food' || type === 'small'
              ? 'product over experience.'
              : type === 'tech' || type === 'saas'
              ? 'features over simplicity.'
              : 'acquisition over retention.')
          + ' That\u2019s your opening.');
    return 'Your edge based on what I found: ' + whitespace + ' Want to talk through how to use this?';
  }

  // --- INTENT: first move / where to start (Overview parity) ---
  if (_clContainsAny(m, ['first move', 'what should i do', 'where to start', 'where do i start', 'where should i start', 'where should i begin', 'where do i begin'])) {
    const gen = window._ovInsights;
    const moveLine = gen ? gen.firstMove(b) : 'Pick one channel, one message, one week.';
    return 'Here\u2019s the first move I\u2019d make for ' + name + ': ' + moveLine
      + ' Want me to break it down into a task you can knock out today?';
  }

  // --- INTENT: outreach / leads / customers-as-verb ("get more customers") ---
  if (_clContainsAny(m, ['outreach', 'leads', 'lead ', 'reach out', 'get more customers', 'get customers', 'more customers'])) {
    const channelLine = channels.indexOf('LinkedIn') !== -1
      ? 'You\u2019re on LinkedIn which is perfect for this. '
      : 'Even without paid channels, ';
    const target = persona ? persona.name : 'your ideal customer';
    return 'For ' + name + ', the fastest outreach move right now is direct and personal. '
      + channelLine
      + 'reach out to 5 people who have shown interest but never converted. Reference something specific about them. Generic messages get ignored. '
      + 'Do you want me to draft a message template for ' + target + '?';
  }

  // --- INTENT: content / post / what to post ---
  if (_clContainsAny(m, ['content', 'post ', 'posting', 'what to post', 'what should i post', 'what do i post', 'caption'])
      || m === 'post') {
    const angle = type === 'food' || type === 'small'
      ? 'showing your process. Behind the scenes content outperforms polished posts for food and local businesses.'
      : type === 'tech' || type === 'saas'
      ? 'the problem you solve, not the features. Lead with the pain point.'
      : type === 'service' || type === 'agency'
      ? 'a specific client result. Outcomes build trust faster than anything.'
      : 'what makes you different in one specific way.';
    const topPlatform = channels.length > 0 ? channels[0] : 'Instagram';
    return 'Based on what I know about ' + name + ', your strongest content angle right now is ' + angle
      + ' Your top platform is ' + topPlatform + '. Want me to write a draft for today?';
  }

  // --- INTENT: tasks / today / what to do ---
  if (_clContainsAny(m, ['task', 'today', 'what should i work on', 'what do i work on'])) {
    const items = Array.isArray(tasksBlock.items) ? tasksBlock.items : [];
    const activeBoard = tasksBlock.activeBoard || 'default';
    const onBoard = items.filter(function (t) { return t && t.boardId === activeBoard; });
    const incomplete = onBoard.filter(function (t) { return t.status !== 'done'; });
    // Priority order: p0 < p1 < p2 (lower id = higher priority).
    const priorityRank = { p0: 0, p1: 1, p2: 2 };
    const sorted = incomplete.slice().sort(function (a, b) {
      return (priorityRank[a.priority] || 3) - (priorityRank[b.priority] || 3);
    });
    if (sorted.length === 0) {
      return 'You have 0 tasks left today. You\u2019ve cleared everything. Want me to suggest what to focus on next?';
    }
    const first = sorted[0];
    return 'You have ' + sorted.length + ' task' + (sorted.length === 1 ? '' : 's') + ' left today. '
      + 'Your highest priority right now is: ' + first.title
      + '. Want me to walk you through how to approach it?';
  }

  // --- INTENT: budget / ads / paid ---
  if (_clContainsAny(m, ['budget', 'ads', 'paid', 'advertising', 'spend'])) {
    if (budget === 'zero' || budget === 'low' || budget === 'unknown') {
      const igLine = channels.indexOf('Instagram') !== -1
        ? 'Instagram content and direct outreach will outperform any ad spend at this stage.'
        : 'Consistent content and direct outreach will outperform any ad spend at this stage.';
      return 'With your current budget, paid ads are not the move yet. The highest ROI actions for ' + name + ' right now are organic. ' + igLine;
    }
    return 'You have budget to work with. Before running ads, make sure your organic content is converting first. Ads amplify what\u2019s already working, they don\u2019t fix what isn\u2019t. What are you thinking of running?';
  }

  // --- DEFAULT fallback ---
  const goalLine = goal.indexOf('leads') !== -1
    ? 'getting in front of new people consistently.'
    : goal.indexOf('sales') !== -1
    ? 'converting the people already paying attention to you.'
    : goal.indexOf('content') !== -1 || goal.indexOf('marketing') !== -1
    ? 'showing up with one strong piece of content per week.'
    : 'building trust with your existing audience first.';
  const goalPhrase = (b.goal && b.goal.trim())
    ? b.goal.trim().toLowerCase()
    : 'grow your business';
  return 'Good question. Based on what I know about ' + name + ' and your goal to ' + goalPhrase
    + ', I\u2019d focus on ' + goalLine + ' Want to go deeper on any of this?';
}

// ---------------------------------------------
// Public entry
// ---------------------------------------------

function _claraRespond(message, concept) {
  const text = _claraIntentReply(message, concept);
  const insightCard = _claraMatchInsightCard(message, concept);
  const reply = { text: text };
  if (insightCard) reply.insightCard = insightCard;
  return reply;
}

// ---------------------------------------------
// Follow-up: "next content idea" (used by the first-published trigger
// when the user taps "Yes, what's next?").
// ---------------------------------------------

function _claraNextContentIdea(concept) {
  const b = concept && concept.business ? concept.business : {};
  const name = (b.name && b.name.trim()) ? b.name.trim() : 'your business';
  const type = String(b.type || '').toLowerCase();
  const channels = Array.isArray(b.channels) ? b.channels : [];
  const platform = channels.length > 0 ? channels[0] : 'Instagram';

  let idea;
  if (type === 'food' || type === 'small') {
    idea = 'a 15-second behind-the-scenes clip of you making your product';
  } else if (type === 'ecommerce') {
    idea = 'a customer unboxing or product-in-use video';
  } else if (type === 'service' || type === 'agency') {
    idea = 'a short case-study post with one specific client outcome';
  } else if (type === 'tech' || type === 'saas') {
    idea = 'a one-liner about the exact problem your product solves';
  } else if (type === 'creator') {
    idea = 'a story-format post about your process this week';
  } else {
    idea = 'a single-line post about what makes ' + name + ' different';
  }
  return 'Next up: ' + idea + ' for ' + platform + '. Keep the same tone as your first piece and post within 48 hours \u2014 momentum matters more than polish right now.';
}

// ---------------------------------------------
// Exports
// ---------------------------------------------

window._claraRespond = _claraRespond;
window._claraMatchInsightCard = _claraMatchInsightCard;
window._claraNextContentIdea = _claraNextContentIdea;
