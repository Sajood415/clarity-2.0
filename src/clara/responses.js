// ---------------------------------------------
// Clarity 2.0 — Clara's onboarding copy + option lists
// ---------------------------------------------
//
// Every string Clara says during the structured 6-question onboarding
// lives here, plus the option lists for single- and multi-select steps
// and the label→machine-key maps. Kept isolated from chat.js so wording
// tweaks don't require touching the state machine.
//
// The chat.js state machine reads:
//   CLARA_OPENING, CL_OPTIONS_OPENING
//   CL_Q1_QUESTION, CL_OPTIONS_Q1, CL_Q1_TYPE_MAP, CL_Q1_ACK, CL_Q1_OTHER_QUESTION
//   CL_Q2_QUESTION, CL_OPTIONS_Q2, CL_Q2_ACK
//   CL_Q3_QUESTION, CL_Q3_PLACEHOLDER, CL_Q3_ACK_1, CL_Q3_ACK_2
//   CL_Q4_QUESTION, CL_OPTIONS_Q4, CL_Q4_ESCAPE, _q4Ack(), _inferReach()
//   CL_Q6_QUESTION, CL_Q6_PLACEHOLDER, CL_Q6_ACK

// --- Opening ---
//
// Clara now asks for the business name as her very first question,
// conversation-style. No upfront modal, no "Ready? / Let's go" buttons
// \u2014 the sidebar row updates live as the user types (see chat.js
// opening-step input handler) so the concept is named the moment the
// user commits, exactly like ChatGPT/Claude auto-titling.

const CLARA_OPENING = "Hey, I'm Clara. Before we get started \u2014 what are you calling this business?";
const CL_NAME_PLACEHOLDER = "e.g. Ahmed's Bakery";
// Warm one-line ack that echoes the name back. Kept generic on purpose
// (no adjectives) so it reads sincere for a bakery, a SaaS, or anything
// in between. Followed immediately by Q1 in the queue.
function _claraNameAck(name) {
  const safe = (name || '').trim();
  if (!safe) return "Got it.";
  return "Love it \u2014 " + safe + ". Let's build something great together.";
}
// Legacy: kept exported so any lingering reference doesn't crash. The
// state machine no longer renders these as an options row.
const CL_OPTIONS_OPENING = [];

// --- Q1: business type ---

const CL_Q1_QUESTION = "What kind of business are you growing?";
const CL_OPTIONS_Q1 = [
  'Small business',
  'Online store or ecommerce brand',
  'Service-based business',
  'SaaS or tech company',
  'Creator or personal brand',
  'Agency or consultant',
  'Nonprofit',
  'Other'
];
// Labels are user-facing (approved by product) and get stored in
// business.type indirectly via this map. Machine keys ('small',
// 'ecommerce', ...) are the stable identifiers downstream (task
// generator, persona models). Never key anything off the label text.
const CL_Q1_TYPE_MAP = {
  'Small business':                    'small',
  'Online store or ecommerce brand':   'ecommerce',
  'Service-based business':            'service',
  'SaaS or tech company':              'tech',
  'Creator or personal brand':         'creator',
  'Agency or consultant':              'agency',
  'Nonprofit':                         'nonprofit',
  'Other':                             'other'
};
const CL_Q1_ACK = {
  small:     "Nice, local businesses are where it all starts.",
  ecommerce: "Great, online stores have so much potential right now.",
  service:   "Perfect, service businesses live and die by reputation.",
  tech:      "Interesting, tech is a crowded space but there's always room to stand out.",
  creator:   "Love it, personal brands are one of the most powerful things you can build.",
  agency:    "Got it, agencies need a strong pipeline to grow.",
  nonprofit: "Wonderful, let's make sure your mission gets the attention it deserves."
};
// Follow-up if the user picked "Other" — collects a free-text description.
const CL_Q1_OTHER_QUESTION = "Got it. Can you tell me a bit more about what you do?";
const CL_Q1_OTHER_ACK = "Thanks, that gives me the context I need.";

// --- Q2: goal ---

const CL_Q2_QUESTION = "What do you want Clarity to help you with first?";
const CL_OPTIONS_Q2 = [
  'Get more leads',
  'Increase sales',
  'Understand my customers better',
  'Improve my content or marketing',
  'Launch a new product or service',
  'Test ideas before I spend money',
  'Keep up with competitors',
  'Build a growth plan from scratch'
];
// business.goal is stored as the raw approved label so downstream logic
// (task generator, Create pre-fills) can key off it directly. When labels
// change, tasks.js branches must move in lockstep AND state.js needs a
// migration entry — see CL_Q2_LEGACY_GOAL_MAP below.
const CL_Q2_ACK = {
  'Get more leads':                    "Good choice. Lead generation is where most businesses need the most help.",
  'Increase sales':                    "Let's make that happen. I'll focus on what moves the needle fastest.",
  'Understand my customers better':    "Smart. Most businesses skip this and pay for it later.",
  'Improve my content or marketing':   "That's a great place to start. Better marketing changes everything.",
  'Launch a new product or service':   "Exciting. Let's make sure it lands right.",
  'Test ideas before I spend money':   "Love this. Testing before spending is the smart way to grow.",
  'Keep up with competitors':          "Knowing what they're doing gives you a real edge.",
  'Build a growth plan from scratch':  "Perfect. Let's build something you can actually execute."
};

// Migration table used by state.js normalizer to translate any concept
// saved with the pre-approval Q2 labels ("Understand my customers",
// "Launch something new", etc.) so their downstream task branching
// keeps working after this rename.
const CL_Q2_LEGACY_GOAL_MAP = {
  'Understand my customers': 'Understand my customers better',
  'Improve my marketing':    'Improve my content or marketing',
  'Launch something new':    'Launch a new product or service',
  'Test an idea':            'Test ideas before I spend money',
  'Watch my competitors':    'Keep up with competitors',
  'Build a growth plan':     'Build a growth plan from scratch'
};

// --- Q3: customer + product (free text) ---

const CL_Q3_QUESTION = "Who is your ideal customer and what do you sell them?";
const CL_Q3_PLACEHOLDER = "e.g. Local families who want fresh artisan bread delivered weekly, I sell sourdough loaves and pastry boxes.";
const CL_Q3_ACK_1 = "Got it. That tells me a lot about who you're building for.";
const CL_Q3_ACK_2 = "A couple more quick ones.";

// --- Q4: channels (multi-select) ---

const CL_Q4_QUESTION = "Where are you currently marketing your business?";
const CL_OPTIONS_Q4 = [
  'Website',
  'Instagram',
  'Facebook',
  'TikTok',
  'LinkedIn',
  'Email',
  'Google Ads',
  'Meta Ads',
  'SEO or blog',
  'In-person sales',
  'Referrals or word of mouth',
  "I'm not marketing yet"
];
// Escape-hatch option: tapping it clears all other selections and
// (on Done) saves business.channels as an empty array.
const CL_Q4_ESCAPE = "I'm not marketing yet";

// Reach inference buckets. Website + Email are intentionally neutral —
// they can be either and shouldn't force a bucket on their own.
const CL_Q4_LOCAL_CHANNELS  = ['Instagram', 'Facebook', 'TikTok', 'In-person sales', 'Referrals or word of mouth'];
const CL_Q4_ONLINE_CHANNELS = ['LinkedIn', 'Google Ads', 'Meta Ads', 'SEO or blog'];

// Migration table for state.js normalizer — remaps any concept saved
// with the pre-approval Q4 labels so persisted `business.channels`
// arrays and inference logic keep matching after the rename.
const CL_Q4_LEGACY_CHANNEL_MAP = {
  'In-person':        'In-person sales',
  'Word of mouth':    'Referrals or word of mouth',
  'Not marketing yet': "I'm not marketing yet"
};

// Warm acknowledgment based on the selected channels. Priorities matter:
// "spreading yourself thin" > platform-specific > default.
function _q4Ack(channels) {
  if (!channels || channels.length === 0) {
    return "No problem, we'll start from the beginning.";
  }
  if (channels.length > 3) {
    return "You're already spreading yourself across a few places. Let's make sure each one is working.";
  }
  if (channels.indexOf('Instagram') !== -1 || channels.indexOf('TikTok') !== -1) {
    return "Good, visual platforms are where most growth happens right now.";
  }
  if (channels.indexOf('LinkedIn') !== -1) {
    return "LinkedIn is underrated for most businesses. Good call.";
  }
  return "Good, I know where to focus.";
}

function _inferReach(channels) {
  if (!channels || channels.length === 0) return '';
  const hasLocal  = channels.some(function (c) { return CL_Q4_LOCAL_CHANNELS.indexOf(c) !== -1; });
  const hasOnline = channels.some(function (c) { return CL_Q4_ONLINE_CHANNELS.indexOf(c) !== -1; });
  if (hasLocal && hasOnline) return 'mixed';
  if (hasLocal)  return 'local';
  if (hasOnline) return 'online';
  return '';
}

// --- Q6: location (free text) ---

const CL_Q6_QUESTION = "Last one. Where is your business based? City or country is fine.";
const CL_Q6_PLACEHOLDER = "e.g. Lahore, Pakistan or London, UK";
const CL_Q6_ACK = "Perfect. Give me a moment to put this all together.";

// ---------------------------------------------
// Post-onboarding customer validation
// ---------------------------------------------
//
// Right after "Your workspace is ready", Clara reads back what she
// understood as the main customer so the user can confirm or correct
// it in one tap. This runs exactly once per concept and its terminal
// state is `business.customerValidated = true`.

const CL_VALIDATE_YES = "Yes, that's right";
const CL_VALIDATE_FIX = "Actually let me fix that";
const CL_OPTIONS_VALIDATE = [CL_VALIDATE_YES, CL_VALIDATE_FIX];

const CL_VALIDATE_YES_ACK = "Perfect. I've built your workspace around that. Let's get started.";
const CL_VALIDATE_FIX_QUESTION = "No problem. Tell me more about who you're actually building for.";
const CL_VALIDATE_FIX_ACK = "Got it, I've updated your customer profile. Everything will be more accurate from here.";
const CL_VALIDATE_FIX_PLACEHOLDER = "Describe your ideal customer\u2026";

// Reads back the customer summary in Clara's voice. Prefers the raw Q3
// answer (first sentence, capped at 80 chars) and falls back to a
// goal-derived phrase if Q3 was skipped or is empty. Trailing punctuation
// from the substring cut is trimmed so we don't end mid-comma.
function _claraValidationQuestion() {
  const b = getBusiness();
  const raw = (b.customer || '').trim();
  let subject;
  if (raw) {
    subject = raw.split('.')[0].trim().substring(0, 80).replace(/[,;\s]+$/, '');
  } else {
    const goal = (b.goal && b.goal.trim()) ? b.goal.trim().toLowerCase() : 'growing your business';
    subject = 'someone who cares about ' + goal;
  }
  return 'Based on what you told me, I think your main customer is ' + subject + '. Does that sound right?';
}

// ---------------------------------------------
// Exports
// ---------------------------------------------

window.CLARA_OPENING = CLARA_OPENING;
window.CL_OPTIONS_OPENING = CL_OPTIONS_OPENING;
window.CL_NAME_PLACEHOLDER = CL_NAME_PLACEHOLDER;
window._claraNameAck = _claraNameAck;

window.CL_Q1_QUESTION = CL_Q1_QUESTION;
window.CL_OPTIONS_Q1 = CL_OPTIONS_Q1;
window.CL_Q1_TYPE_MAP = CL_Q1_TYPE_MAP;
window.CL_Q1_ACK = CL_Q1_ACK;
window.CL_Q1_OTHER_QUESTION = CL_Q1_OTHER_QUESTION;
window.CL_Q1_OTHER_ACK = CL_Q1_OTHER_ACK;

window.CL_Q2_QUESTION = CL_Q2_QUESTION;
window.CL_OPTIONS_Q2 = CL_OPTIONS_Q2;
window.CL_Q2_ACK = CL_Q2_ACK;
window.CL_Q2_LEGACY_GOAL_MAP = CL_Q2_LEGACY_GOAL_MAP;

window.CL_Q3_QUESTION = CL_Q3_QUESTION;
window.CL_Q3_PLACEHOLDER = CL_Q3_PLACEHOLDER;
window.CL_Q3_ACK_1 = CL_Q3_ACK_1;
window.CL_Q3_ACK_2 = CL_Q3_ACK_2;

window.CL_Q4_QUESTION = CL_Q4_QUESTION;
window.CL_OPTIONS_Q4 = CL_OPTIONS_Q4;
window.CL_Q4_ESCAPE = CL_Q4_ESCAPE;
window.CL_Q4_LEGACY_CHANNEL_MAP = CL_Q4_LEGACY_CHANNEL_MAP;
window._q4Ack = _q4Ack;
window._inferReach = _inferReach;

window.CL_Q6_QUESTION = CL_Q6_QUESTION;
window.CL_Q6_PLACEHOLDER = CL_Q6_PLACEHOLDER;
window.CL_Q6_ACK = CL_Q6_ACK;

window.CL_VALIDATE_YES = CL_VALIDATE_YES;
window.CL_VALIDATE_FIX = CL_VALIDATE_FIX;
window.CL_OPTIONS_VALIDATE = CL_OPTIONS_VALIDATE;
window.CL_VALIDATE_YES_ACK = CL_VALIDATE_YES_ACK;
window.CL_VALIDATE_FIX_QUESTION = CL_VALIDATE_FIX_QUESTION;
window.CL_VALIDATE_FIX_ACK = CL_VALIDATE_FIX_ACK;
window.CL_VALIDATE_FIX_PLACEHOLDER = CL_VALIDATE_FIX_PLACEHOLDER;
window._claraValidationQuestion = _claraValidationQuestion;
