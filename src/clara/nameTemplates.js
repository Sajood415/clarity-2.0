// ---------------------------------------------
// Clarity 2.0 — Name Templates
// ---------------------------------------------
//
// Hardcoded business-name suggestion pool for the Q_name onboarding
// step's "Suggest a name" button. Deterministic (no API) so demo /
// offline runs always produce sensible output, and so a repeat click
// with the same input reliably produces the same suggestion.
//
// Interpolation tokens:
//   {product}    — first meaningful capitalized word extracted from
//                  business.product / business.typeDescription.
//                  Falls back to "Your" if neither source is set
//                  (Q1_other stores the free-text description on
//                  business.product, so both fields are consulted).
//   {location}   — first word of business.location (the city part of
//                  a "City, Country" string). Falls back to "Local".
//   {goal_word}  — mapped from business.goal via _claraGoalKey:
//                    leads     -> "Connect"
//                    sales     -> "Market"
//                    retention -> "Circle"
//                    growth    -> "Grow"
//                    default   -> "Co"     (marketing, launch, test,
//                                            competitors, and anything
//                                            _claraGoalKey doesn't
//                                            recognise all bucket here)
//
// Bucket keys mirror the machine keys produced by _claraTypeKey
// (defined in clara/customerTemplates.js): 'small' | 'ecommerce' |
// 'service' | 'tech' | 'creator' | 'agency' | 'nonprofit' | 'other'.
// Aliases the spec-facing names ('small_business', 'saas') route
// through _claraTypeKey so both storage keys land in the right pool.
// Each pool has EXACTLY 6 templates so the modulo-picked index stays
// stable across pools.

const CL_NAME_TEMPLATES = {
  small: [
    '{product} House',
    'The {location} {product}',
    '{product} & Co',
    'Local {product} Co',
    '{location} Made',
    'Corner {product}'
  ],
  ecommerce: [
    '{product} Store',
    'Shop {product}',
    '{product} Drop',
    'Daily {product}',
    '{product} Hub',
    'Get {product}'
  ],
  service: [
    '{product} Pro',
    '{product} Works',
    '{location} {product}',
    '{product} Studio',
    'The {product} Agency',
    '{product} Partners'
  ],
  tech: [
    '{product} HQ',
    '{product} App',
    'Use {product}',
    '{product} OS',
    'Get {product}',
    '{product} AI'
  ],
  creator: [
    '{product} by Me',
    'The {product} Show',
    '{product} Weekly',
    'With {product}',
    '{product} Lab',
    'Made with {product}'
  ],
  agency: [
    '{product} Agency',
    '{product} Studio',
    '{location} Creative',
    '{product} Group',
    'The {product} Co',
    '{product} Collective'
  ],
  nonprofit: [
    '{product} Foundation',
    '{location} {product} Fund',
    '{product} Initiative',
    'The {product} Project',
    '{product} Alliance',
    'Hope {product}'
  ],
  other: [
    '{product} Co',
    '{location} {product}',
    '{product} Works',
    'The {product}',
    '{product} Group',
    '{product} Lab'
  ]
};

// Goal-word map. Only the 4 canonical buckets the spec calls out are
// wired here; every other _claraGoalKey result (marketing, launch,
// test, competitors, or an unrecognised goal) falls through to the
// || 'Co' default in _claraNameGoalWord below.
const CL_NAME_GOAL_WORDS = {
  leads:     'Connect',
  sales:     'Market',
  retention: 'Circle',
  growth:    'Grow'
};

// ---------------------------------------------
// Token extractors
// ---------------------------------------------

// Small stopword set so "the candles" -> "Candles" and "our tea shop"
// -> "Tea". Kept minimal on purpose — over-aggressive filtering
// (removing everyday nouns like "shop" or "store") would strip the
// most useful tokens the user gave us. Comparison is lowercased.
const CL_NAME_STOPWORDS = {
  'a': 1, 'an': 1, 'the': 1,
  'my': 1, 'our': 1, 'your': 1, 'their': 1, 'his': 1, 'her': 1,
  'we': 1, 'i': 1, 'us': 1,
  'is': 1, 'are': 1, 'was': 1, 'were': 1
};

// Returns the first non-stopword token in a string, capitalized. Non-
// alphanumeric characters are stripped from each candidate word
// before the stopword check so punctuation like "we're" -> "we" is
// caught. Returns null when nothing usable is found; callers own the
// fallback so the substitution pass never emits an empty {product}.
function _claraFirstMeaningfulWord(str) {
  if (!str) return null;
  const trimmed = String(str).trim();
  if (!trimmed) return null;
  const words = trimmed.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    // Strip anything that isn't a Latin letter or digit. Keeps the
    // extractor working on ASCII input without pulling in the /u
    // Unicode flag (older browsers we still support don't handle
    // \p{L} in regex).
    const clean = words[i].replace(/[^A-Za-z0-9]/g, '');
    if (!clean) continue;
    if (CL_NAME_STOPWORDS[clean.toLowerCase()]) continue;
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }
  return null;
}

function _claraNameProductToken(business) {
  const b = business || {};
  // Priority 1: canonical product field (populated by the extractor
  // and by Q1_other's free-text answer).
  const fromProduct = _claraFirstMeaningfulWord(b.product);
  if (fromProduct) return fromProduct;
  // Priority 2: separate typeDescription field. Some codepaths surface
  // the Q1_other description here even though the modal writes it to
  // b.product; check both so we're robust to either.
  const fromTypeDesc = _claraFirstMeaningfulWord(b.typeDescription);
  if (fromTypeDesc) return fromTypeDesc;
  // Priority 3: last-resort filler. Reads sensibly in every template
  // ("Your Store", "Your Studio", "Your Agency"...) so no template
  // ever ships with a literal token in the DOM.
  return 'Your';
}

function _claraNameLocationToken(business) {
  const b = business || {};
  const raw = String(b.location || '').trim();
  if (!raw) return 'Local';
  // business.location is the legacy derived string form ("City,
  // Country" for a single location or "City, Country \u00b7 City2,
  // Country2" for multiple). We just want the first city; splitting
  // on ',' before the meaningful-word pass handles both shapes.
  const city = raw.split(',')[0].trim();
  const word = _claraFirstMeaningfulWord(city);
  return word || 'Local';
}

function _claraNameGoalWord(business) {
  const b = business || {};
  const goalKey = (typeof _claraGoalKey === 'function')
    ? _claraGoalKey(b.goal || '')
    : 'growth';
  return CL_NAME_GOAL_WORDS[goalKey] || 'Co';
}

// ---------------------------------------------
// Public API
// ---------------------------------------------
//
// Returns a fully-substituted name string. Never returns null; if the
// business object is empty we still emit a filler ("Your Co" for the
// 'other' bucket at index 0) so the UI has something to type into.

function _claraGenerateName(business) {
  const b = business || {};
  const typeKey = (typeof _claraTypeKey === 'function')
    ? _claraTypeKey(b.type)
    : 'other';
  const bucket = CL_NAME_TEMPLATES[typeKey] || CL_NAME_TEMPLATES.other;
  const product = _claraNameProductToken(b);
  const location = _claraNameLocationToken(b);
  const goalWord = _claraNameGoalWord(b);

  // Deterministic template pick. Priority: if the user has already
  // typed something into the name field, seed off its length so
  // repeated clicks on the same partial name produce the same
  // suggestion (feels intentional, not random). When the field is
  // empty we fall back to Date.now() so consecutive clicks cycle
  // through the pool instead of pinning at index 0.
  const nameLen = (b.name && b.name.length) ? b.name.length : 0;
  const seed = nameLen > 0 ? nameLen : Date.now();
  // Positive-modulo — Date.now() is always positive but the guard
  // makes the intent explicit and covers future callers that might
  // pass a negative seed.
  const idx = ((seed % bucket.length) + bucket.length) % bucket.length;
  const template = bucket[idx];

  return template
    .replace(/\{product\}/g, product)
    .replace(/\{location\}/g, location)
    .replace(/\{goal_word\}/g, goalWord);
}

window._claraGenerateName = _claraGenerateName;
