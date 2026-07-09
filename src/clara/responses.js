// ---------------------------------------------
// Clarity 2.0 — Clara's canned + generated copy
// ---------------------------------------------

const CLARA_FIRST = "Hey, I'm Clara. Tell me about your business and what you're trying to achieve right now.";
const CLARA_SECOND = "Got it. Are you trying to reach people nearby or do you also sell online?";
const CLARA_FINAL = "Perfect. Give me a moment.";

const CL_STARTER_CHIPS = [
  'How do I get more customers?',
  'What should I post today?',
  'How do I stand out from competitors?',
  'Help me make an offer.'
];

function _claraChallengeQuestion(type) {
  if (type === 'food') {
    return "Got it. Is your main challenge getting new people through the door, or getting existing customers to come back more often?";
  }
  if (type === 'service' || type === 'trades') {
    return "Makes sense. Are you mainly looking to get more leads, or do you want to build more of a reputation and get found online?";
  }
  if (type === 'tech') {
    return "Nice. Is the focus on getting more signups, or converting the users you already have?";
  }
  if (type === 'retail') {
    return "Good. Are you trying to attract new shoppers, or increase how much existing customers spend?";
  }
  return "What\u2019s your biggest challenge right now: finding new customers, or keeping the ones you have?";
}

window.CLARA_FIRST = CLARA_FIRST;
window.CLARA_SECOND = CLARA_SECOND;
window.CLARA_FINAL = CLARA_FINAL;
window.CL_STARTER_CHIPS = CL_STARTER_CHIPS;
window._claraChallengeQuestion = _claraChallengeQuestion;
