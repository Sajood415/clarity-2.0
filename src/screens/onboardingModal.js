// ---------------------------------------------
// Clarity 2.0 — Onboarding (full-screen Typeform-style)
// ---------------------------------------------
//
// A single full-viewport page (not a modal) that walks the user through
// Clara's 7 questions. Structure:
//
//   [ ob-fullscreen ]                fixed inset 0, warm radial bg, z 400
//     [ ob-topbar ]                  56px row: Clarity | progress | X of 7
//     [ ob-content ]                 flex-1, centered column, max 640
//       C avatar (32px, amber grad)
//       question (28/700, centered)
//       subtitle (15/muted, centered)
//       ob-answer                    chips / textarea / continue
//     [ ob-back-link ]               fixed bottom-left "← Back"
//
// Seven questions:
//   Q1 (single-select),  q_name (free text),  Q2 (single-select),
//   Q3 (free text),      Q4 (multi-select),   Q5 (single-select),
//   Q6 (free text).
//
// Q1 has one branch: picking "Other" routes through q1_other (a
// free-text follow-up) before q_name. That sub-step's progress index
// collapses onto Q1's slot so the bar doesn't jump backwards.
//
// q_name was added after the initial 6-question rollout because the
// Overview greeting, concept header, sidebar badge, and Clara's
// context-aware responses all reference business.name and were
// falling back to "your business" without it.
//
// State machine + widget renderers are local to this file. Each answer
// commits to appState.business, then _obGoNext(...) fades the content
// area out and the next step's content back in. After Q6 the "building"
// state plays for 3s and the screen fades out onto the Overview view.

// ---------------------------------------------
// Step config
// ---------------------------------------------

// The ordered steps that drive the progress bar. Sub-steps
// (q1_other) share the index of their parent so progress doesn't
// jump around when Clara asks the "Other" follow-up. q_name sits
// right after q1 so Clara has the business name in hand before she
// starts asking about goals / customers. 'review' is the final beat
// \u2014 a summary screen where the user confirms every answer before
// Clara starts building. It renders 100% on the progress bar and its
// own "Review" label in the step counter (mirrors how 'building' is
// treated) rather than showing "N of N" which would misread as done.
const OB_STEP_ORDER = ['q1', 'q_name', 'q2', 'q3', 'q4', 'q5', 'q6', 'review'];
const OB_TOTAL_STEPS = OB_STEP_ORDER.length;

// Per-step subtitle copy. q1_other is a sub-step, not a numbered
// question, so it gets its own line rather than reusing Q1's.
const OB_SUBTITLES = {
  q1:       'This helps Clara understand how to position your business.',
  q1_other: 'A quick description of what you do helps Clara tailor her suggestions.',
  q_name:   'Clara will use this in her suggestions, reports, and dashboard greetings.',
  q2:       'Clara will prioritise suggestions around this goal.',
  q3:       'Be as specific as you can. The more detail the better.',
  q4:       'Select everything that applies right now.',
  q5:       'This helps Clara know what kinds of suggestions to make.',
  q6:       'Pick a country and add a city. Add as many locations as you serve.',
  review:   "Quick check before Clara builds your workspace. Tap any pencil to fix something."
};

// Per-step question text — pulled from responses.js so wording changes
// there flow through without extra edits here. The review step doesn't
// pull from responses.js (its heading is a Clara-authored review prompt
// specific to this screen) and 'building'/'done' have no question at
// all.
function _obQuestionCopy(step) {
  switch (step) {
    case 'q1':       return CL_Q1_QUESTION;
    case 'q1_other': return CL_Q1_OTHER_QUESTION;
    case 'q_name':   return CL_QNAME_QUESTION;
    case 'q2':       return CL_Q2_QUESTION;
    case 'q3':       return CL_Q3_QUESTION;
    case 'q4':       return CL_Q4_QUESTION;
    case 'q5':       return CL_Q5_QUESTION;
    case 'q6':       return CL_Q6_QUESTION;
    case 'review':   return "Here's what I've got so far.";
    default:         return '';
  }
}

// Progress bar segment index (0-based). Sub-steps collapse to parent.
function _obStepIndex(step) {
  if (step === 'q1_other') return OB_STEP_ORDER.indexOf('q1');
  const idx = OB_STEP_ORDER.indexOf(step);
  return idx === -1 ? OB_TOTAL_STEPS - 1 : idx;
}

// ---------------------------------------------
// Runtime state (transient, not persisted)
// ---------------------------------------------

const _obState = {
  currentStep: 'q1',
  // Snapshot of the multi-select selection between clicks so we can
  // toggle without hitting appState on every keystroke.
  channelsDraft: [],
  // Locks the flow while a fade/thinking timer is active so double
  // clicks and rapid Enter presses can't skip ahead.
  transitioning: false,
  // Reference to the currently-bound global keydown handler so we can
  // remove it on completion (avoids leaks + stale bindings when the
  // dashboard shell mounts afterward).
  keyHandler: null,
  // True when the user opened a step via the Review screen's "Edit"
  // pencil. Any handler that would normally _obGoNext to the linear
  // next step routes to 'review' instead (and clears this flag).
  // \u2190 Back while this flag is set also cancels the edit and
  // returns to review \u2014 clearer UX than "back one step" mid-edit.
  //
  // Intentionally NOT persisted to concept.chat. If a user reloads
  // mid-edit, the flag resets to false and the flow resumes as a
  // linear pass through the remaining steps \u2014 each of which is
  // pre-filled with the previously committed answer, so completing
  // that pass takes seconds and lands them back on Review naturally.
  // Persisting the flag would require a schema addition + normalizer
  // change for what is a very rare recovery path.
  editReturnToReview: false
};

function _obKnownStep(step) {
  return step === 'q1' || step === 'q1_other' || step === 'q_name'
      || step === 'q2' || step === 'q3'
      || step === 'q4' || step === 'q5' || step === 'q6'
      || step === 'review';
}

// ---------------------------------------------
// Entry: mount the full-screen page into a host element
// ---------------------------------------------

function renderOnboardingModal(host) {
  if (!host) return;

  // Resume mid-flow: honor the concept's persisted onboardingStep so a
  // reload doesn't dump the user back at Q1 if they were on Q4. Legacy
  // values ('name', 'opening', 'done', etc.) fall through to q1.
  const chat = getChat();
  const persistedStep = chat && chat.onboardingStep;
  if (_obKnownStep(persistedStep)) {
    _obState.currentStep = persistedStep;
  } else {
    _obState.currentStep = 'q1';
  }

  // Prime the multi-select draft from any prior save so users returning
  // to Q4 see their previous picks pre-selected.
  const business = getBusiness();
  _obState.channelsDraft = Array.isArray(business.channels) ? business.channels.slice() : [];
  _obState.transitioning = false;

  host.innerHTML = `
    <div class="ob-fullscreen" id="obFullscreen" role="dialog" aria-modal="true" aria-labelledby="obQuestion">
      <div class="ob-topbar">
        <div class="ob-brand">Clarity</div>
        <div class="ob-progress-track" aria-hidden="true">
          <div class="ob-progress-fill" id="obProgressFill"></div>
        </div>
        <div class="ob-step-counter" id="obStepCounter"></div>
      </div>
      <div class="ob-content" id="obContent"></div>
      <button type="button" class="ob-back-link" id="obBackLink">\u2190 Back</button>
    </div>
  `;

  _obRenderStep();
  _obBindBack();
  _obBindGlobalKeys();
}

// ---------------------------------------------
// Rendering
// ---------------------------------------------

function _obRenderStep() {
  _obUpdateProgress();
  _obUpdateStepCounter();
  _obUpdateBackButton();

  const content = document.getElementById('obContent');
  if (!content) return;

  const step = _obState.currentStep;

  // Building/done have no question — render the thinking state and
  // bail before the standard question/answer layout runs.
  if (step === 'building' || step === 'done') {
    content.innerHTML = ''
      + '<div class="ob-thinking-state">'
      +   '<div class="ob-thinking-label">Clara is building your workspace.</div>'
      +   '<div class="ob-thinking-dots" aria-hidden="true">'
      +     '<span class="ob-thinking-dot"></span>'
      +     '<span class="ob-thinking-dot"></span>'
      +     '<span class="ob-thinking-dot"></span>'
      +   '</div>'
      + '</div>';
    _obTriggerContentIn(content);
    return;
  }

  // Review renders its own summary layout (avatar + review-list + approve
  // button) instead of the standard question/answer shell so we can lay
  // the field rows out flush against a wider column.
  if (step === 'review') {
    content.innerHTML = _obReviewMarkup();
    _obBindReviewEvents();
    _obTriggerContentIn(content);
    return;
  }

  const question = _obQuestionCopy(step);
  const subtitle = OB_SUBTITLES[step] || '';

  content.innerHTML = `
    <div class="ob-avatar" aria-hidden="true">C</div>
    <h1 class="ob-question" id="obQuestion">${_escape(question)}</h1>
    <p class="ob-subtitle">${_escape(subtitle)}</p>
    <div class="ob-answer" id="obAnswer"></div>
  `;

  _obRenderAnswer(step);
  _obTriggerContentIn(content);
}

// Re-plays the fade+translate-in animation on the content column.
// Removes any prior animation classes and forces a reflow so the
// browser doesn't coalesce the class removal + re-add.
function _obTriggerContentIn(content) {
  content.classList.remove('ob-content-in', 'ob-content-out');
  void content.offsetWidth;
  content.classList.add('ob-content-in');
}

function _obUpdateProgress() {
  const fill = document.getElementById('obProgressFill');
  if (!fill) return;
  const step = _obState.currentStep;
  // "Building" fills the bar completely and adds a soft pulse.
  // "Review" also fills to 100% but WITHOUT the pulse \u2014 the pulse
  // is reserved for the actual "working on it" beat so the review
  // screen doesn't feel like it's already building.
  if (step === 'building' || step === 'done') {
    fill.style.width = '100%';
    fill.classList.add('ob-progress-full');
  } else {
    const idx = _obStepIndex(step);
    fill.style.width = ((idx + 1) / OB_TOTAL_STEPS * 100) + '%';
    fill.classList.remove('ob-progress-full');
  }
}

function _obUpdateStepCounter() {
  const counter = document.getElementById('obStepCounter');
  if (!counter) return;
  const step = _obState.currentStep;
  if (step === 'building' || step === 'done') {
    counter.textContent = 'Building';
    return;
  }
  // Review shows its own label rather than "N of N" \u2014 same idea
  // as Building. Prevents the misread "8 of 8 = already done".
  if (step === 'review') {
    counter.textContent = 'Review';
    return;
  }
  // Every non-review step counts against total-minus-review so "5 of 7"
  // still reads correctly during the linear question flow. Review is
  // effectively an epilogue, not another question.
  const idx = _obStepIndex(step);
  counter.textContent = (idx + 1) + ' of ' + (OB_TOTAL_STEPS - 1);
}

function _obUpdateBackButton() {
  const back = document.getElementById('obBackLink');
  if (!back) return;
  const step = _obState.currentStep;
  // Hidden on Q1 (nothing to go back to) and during the terminal
  // building/done states.
  const hidden = step === 'q1' || step === 'building' || step === 'done';
  if (hidden) back.setAttribute('hidden', '');
  else back.removeAttribute('hidden');
}

// ---------------------------------------------
// Answer renderers per step
// ---------------------------------------------

function _obRenderAnswer(step) {
  const host = document.getElementById('obAnswer');
  if (!host) return;

  switch (step) {
    case 'q1':
      _obRenderChips({
        host: host,
        options: CL_OPTIONS_Q1,
        selectedLabel: _obLabelForType(getBusiness().type),
        onPick: _obHandleQ1
      });
      break;

    case 'q1_other':
      _obRenderTextInput({
        host: host,
        placeholder: 'e.g. handmade wooden furniture for cafes and restaurants',
        minChars: 5,
        initialValue: (getBusiness().product || '').trim(),
        multiLine: true,
        onCommit: _obHandleQ1Other
      });
      break;

    case 'q_name':
      _obRenderTextInput({
        host: host,
        placeholder: CL_QNAME_PLACEHOLDER,
        minChars: 2,
        initialValue: (getBusiness().name || '').trim(),
        multiLine: false,
        onCommit: _obHandleQName
      });
      break;

    case 'q2':
      _obRenderChips({
        host: host,
        options: CL_OPTIONS_Q2,
        selectedLabel: getBusiness().goal || '',
        onPick: _obHandleQ2
      });
      break;

    case 'q3':
      _obRenderTextInput({
        host: host,
        placeholder: CL_Q3_PLACEHOLDER,
        minChars: 10,
        initialValue: (getBusiness().customer || '').trim(),
        multiLine: true,
        onCommit: _obHandleQ3
      });
      // Q3 gets an "Enhance with AI \u2726" button that types a
      // hardcoded template into the textarea, plus a live suggestion
      // pill that surfaces keyword-matched completions while the user
      // types. Both are template-driven (no external API) \u2014 see
      // clara/customerTemplates.js. Mounted as a separate call so the
      // generic _obRenderTextInput stays reusable for other steps.
      _obMountQ3AIExtras(host);
      break;

    case 'q4':
      _obRenderMultiChips({
        host: host,
        options: CL_OPTIONS_Q4,
        escape: CL_Q4_ESCAPE,
        selected: _obState.channelsDraft.slice(),
        onCommit: _obHandleQ4
      });
      break;

    case 'q5':
      _obRenderChips({
        host: host,
        options: CL_OPTIONS_Q5,
        selectedLabel: _obLabelForBudget(getBusiness().budget),
        onPick: _obHandleQ5
      });
      break;

    case 'q6':
      _obRenderLocationPicker({
        host: host,
        initial: _obReadLocations(),
        onCommit: _obHandleQ6
      });
      break;
  }
}

// --- Single-select chips ---

function _obRenderChips(opts) {
  const options = opts.options || [];
  const selectedLabel = opts.selectedLabel || '';

  const chipsHtml = options.map(function (label) {
    const isSelected = label === selectedLabel;
    return (
      '<button type="button" class="ob-chip' + (isSelected ? ' ob-chip-selected' : '') + '" data-label="' + _escape(label) + '">'
      +   _escape(label)
      + '</button>'
    );
  }).join('');

  opts.host.innerHTML = '<div class="ob-chips-row">' + chipsHtml + '</div>';

  opts.host.querySelectorAll('.ob-chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (_obState.transitioning) return;
      const label = btn.getAttribute('data-label');
      // Visual selection immediately so the tap has feedback while the
      // 400ms auto-advance timer runs.
      opts.host.querySelectorAll('.ob-chip').forEach(function (c) {
        c.classList.remove('ob-chip-selected');
      });
      btn.classList.add('ob-chip-selected');
      _obState.transitioning = true;
      setTimeout(function () {
        _obState.transitioning = false;
        if (typeof opts.onPick === 'function') opts.onPick(label);
      }, 400);
    });
  });
}

// --- Multi-select chips (Q4) ---

function _obRenderMultiChips(opts) {
  const options = opts.options || [];
  const escape = opts.escape;
  const state = { selected: (opts.selected || []).slice() };

  function _render() {
    const chipsHtml = options.map(function (label) {
      const isSelected = state.selected.indexOf(label) !== -1;
      return (
        '<button type="button" class="ob-chip' + (isSelected ? ' ob-chip-selected' : '') + '" data-label="' + _escape(label) + '">'
        +   _escape(label)
        + '</button>'
      );
    }).join('');
    const canContinue = state.selected.length > 0;

    opts.host.innerHTML = ''
      + '<div class="ob-chips-row">' + chipsHtml + '</div>'
      + '<button type="button" class="ob-continue-btn" id="obContinueBtn" ' + (canContinue ? '' : 'disabled') + '>'
      +   'Continue \u2192'
      + '</button>';

    opts.host.querySelectorAll('.ob-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (_obState.transitioning) return;
        const label = btn.getAttribute('data-label');
        if (label === escape) {
          // Escape option is exclusive: clear everything else, keep only
          // the escape selected. Tap it again to unselect.
          state.selected = state.selected.indexOf(label) !== -1 ? [] : [label];
        } else {
          // Any real channel deselects the escape option automatically.
          state.selected = state.selected.filter(function (l) { return l !== escape; });
          const idx = state.selected.indexOf(label);
          if (idx === -1) state.selected.push(label);
          else state.selected.splice(idx, 1);
        }
        _obState.channelsDraft = state.selected.slice();
        _render();
      });
    });

    const continueBtn = document.getElementById('obContinueBtn');
    if (continueBtn) {
      continueBtn.addEventListener('click', function () {
        if (_obState.transitioning || state.selected.length === 0) return;
        // If the escape option is the ONLY selection, commit an empty
        // array to business.channels (matches the "no channels yet"
        // semantic used elsewhere).
        const commitList = (state.selected.length === 1 && state.selected[0] === escape)
          ? []
          : state.selected.slice();
        _obState.transitioning = true;
        setTimeout(function () {
          _obState.transitioning = false;
          if (typeof opts.onCommit === 'function') opts.onCommit(commitList);
        }, 200);
      });
    }
  }

  _render();
}

// --- Free-text input (Q3 / Q6 / q1_other) ---

function _obRenderTextInput(opts) {
  const placeholder = opts.placeholder || '';
  const minChars = opts.minChars || 0;
  const multiLine = !!opts.multiLine;
  const initial = opts.initialValue || '';

  const field = multiLine
    ? '<textarea class="ob-textarea" id="obInput" rows="3" placeholder="' + _escape(placeholder) + '">' + _escape(initial) + '</textarea>'
    : '<input type="text" class="ob-input-single" id="obInput" placeholder="' + _escape(placeholder) + '" value="' + _escape(initial) + '">';

  opts.host.innerHTML = ''
    + field
    + '<button type="button" class="ob-continue-btn" id="obContinueBtn" disabled>Continue \u2192</button>';

  const input = document.getElementById('obInput');
  const btn = document.getElementById('obContinueBtn');
  if (!input || !btn) return;

  function _syncButton() {
    const ok = input.value.trim().length >= minChars;
    btn.disabled = !ok;
  }

  function _submit() {
    if (_obState.transitioning) return;
    const value = input.value.trim();
    if (value.length < minChars) return;
    _obState.transitioning = true;
    setTimeout(function () {
      _obState.transitioning = false;
      if (typeof opts.onCommit === 'function') opts.onCommit(value);
    }, 200);
  }

  input.addEventListener('input', function () {
    _syncButton();
    // Auto-grow the multi-line textarea within a reasonable cap. The
    // cap is generous (320px) so enhanced answers \u2014 typically 3\u20134
    // lines \u2014 fit without triggering an internal scrollbar.
    if (multiLine) {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 320) + 'px';
    }
  });

  input.addEventListener('keydown', function (e) {
    // Enter commits when the min-char threshold is met. Shift+Enter
    // still inserts a newline in the multi-line field.
    if (e.key === 'Enter') {
      if (multiLine && e.shiftKey) return;
      e.preventDefault();
      if (input.value.trim().length < minChars) return;
      _submit();
      return;
    }
    // Backspace / Delete on an empty input jumps back a step. The
    // global handler covers the "no focused input" case; this handler
    // catches the "focused, but empty" case where the browser would
    // otherwise swallow the event.
    if ((e.key === 'Backspace' || e.key === 'Delete') && input.value.length === 0) {
      // Only intercept if there's actually a step to go back to.
      if (_obCanGoBack()) {
        e.preventDefault();
        _obGoBack();
      }
    }
  });

  btn.addEventListener('click', _submit);

  _syncButton();
  // Focus after mount so keyboard flow feels natural. Small timeout to
  // avoid contention with the content fade-in animation.
  setTimeout(function () {
    input.focus();
    // Put caret at end of the pre-filled value so users can just keep
    // typing on resume.
    if (typeof input.setSelectionRange === 'function') {
      const end = input.value.length;
      try { input.setSelectionRange(end, end); } catch (err) { /* not all inputs support this */ }
    }
  }, 260);
}

// ---------------------------------------------
// Answer handlers — commit to state, advance step
// ---------------------------------------------
//
// Every "answer committed" handler runs its next-step decision through
// _obAfterEdit(). When the user opened this step via the Review screen's
// pencil, editReturnToReview is true \u2014 in which case we route
// straight to 'review' instead of the linear next step. The flag is
// cleared on that first hop so a subsequent linear pass through the
// same step behaves normally.

function _obAfterEdit(defaultNext) {
  if (_obState.editReturnToReview) {
    _obState.editReturnToReview = false;
    return 'review';
  }
  return defaultNext;
}

function _obHandleQ1(label) {
  const b = getBusiness();
  const key = CL_Q1_TYPE_MAP[label] || 'other';
  b.type = key;
  _saveState();
  // 'Other' always routes through the free-text follow-up first \u2014
  // even when editing \u2014 because we still need the description
  // before returning to review. Q1_other's handler picks up the same
  // editReturnToReview flag and closes the loop from there.
  if (key === 'other') {
    _obGoNext('q1_other');
    return;
  }
  // Non-other + editing: skip q_name and go straight back to review.
  // Non-other + fresh flow: go to q_name as usual.
  _obGoNext(_obAfterEdit('q_name'));
}

function _obHandleQ1Other(text) {
  const b = getBusiness();
  b.product = text;
  _saveState();
  _obGoNext(_obAfterEdit('q_name'));
}

function _obHandleQName(text) {
  const b = getBusiness();
  b.name = text;
  _saveState();
  _obGoNext(_obAfterEdit('q2'));
}

function _obHandleQ2(label) {
  const b = getBusiness();
  b.goal = label;
  _saveState();
  _obGoNext(_obAfterEdit('q3'));
}

function _obHandleQ3(text) {
  const b = getBusiness();
  b.customer = text;
  _saveState();
  _obGoNext(_obAfterEdit('q4'));
}

function _obHandleQ4(channels) {
  const b = getBusiness();
  b.channels = channels.slice();
  // Reach inference (local / online / mixed) is stored alongside the
  // raw channels list so the rest of the app can key off business.reach.
  if (typeof _inferReach === 'function') {
    const reach = _inferReach(channels);
    if (reach) b.reach = reach;
  }
  _saveState();
  _obGoNext(_obAfterEdit('q5'));
}

function _obHandleQ5(label) {
  const b = getBusiness();
  b.budget = CL_Q5_BUDGET_MAP[label] || 'unknown';
  _saveState();
  _obGoNext(_obAfterEdit('q6'));
}

function _obHandleQ6(locations) {
  const b = getBusiness();
  const clean = _obNormalizeLocations(locations);
  b.locations = clean;
  // Rebuild the legacy string form so downstream consumers (today.js,
  // tasks.js, results.js, conceptsList.js, reports.js) that still read
  // business.location keep working without per-file changes.
  b.location = (typeof window._formatLocationsString === 'function')
    ? window._formatLocationsString(clean)
    : _obFallbackFormatLocations(clean);
  _saveState();
  // Q6 no longer jumps directly to _obStartBuilding(). It hands off to
  // the review screen instead \u2014 the only path to building is now
  // the "Looks good \u2192" button there. _obAfterEdit is a no-op here
  // because the next step is already 'review'; leaving it out keeps
  // the flag intact so a fresh-flow edit path can never accidentally
  // skip past the review beat.
  _obGoNext('review');
}

// Sanitizer: strips whitespace, drops entries that have neither a city
// nor a country, and de-duplicates on (country|city) case-insensitive.
function _obNormalizeLocations(list) {
  if (!Array.isArray(list)) return [];
  const seen = {};
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const entry = list[i] || {};
    const country = String(entry.country || '').trim();
    const city = String(entry.city || '').trim();
    if (!country && !city) continue;
    const key = (country + '|' + city).toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ country: country, city: city });
  }
  return out;
}

// Fallback formatter used only if state.js's helper somehow isn't on
// window yet (script load order guards against this, but the check
// keeps the flow robust against future re-arrangements).
function _obFallbackFormatLocations(list) {
  const parts = [];
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.city && e.country) parts.push(e.city + ', ' + e.country);
    else if (e.city) parts.push(e.city);
    else if (e.country) parts.push(e.country);
  }
  return parts.join(' \u00b7 ');
}

// Reads the current concept's saved locations for Q6 rehydration.
// Falls back to parsing the legacy string field if the structured
// array is empty \u2014 belt-and-braces on top of the state.js
// normalizer so a fresh page load never drops the user's earlier
// answer.
function _obReadLocations() {
  const b = getBusiness();
  if (Array.isArray(b.locations) && b.locations.length > 0) {
    return b.locations.map(function (loc) {
      return { country: String(loc.country || ''), city: String(loc.city || '') };
    });
  }
  if (typeof window._parseLegacyLocation === 'function' && b.location) {
    return window._parseLegacyLocation(b.location);
  }
  return [];
}

// ---------------------------------------------
// Step navigation
// ---------------------------------------------

function _obGoNext(nextStep) {
  const chat = getChat();
  if (chat) {
    chat.onboardingStep = nextStep;
    _saveState();
  }
  _obTransitionTo(nextStep);
}

function _obCanGoBack() {
  return !!_obPreviousStep(_obState.currentStep);
}

function _obGoBack() {
  if (_obState.transitioning) return;
  const step = _obState.currentStep;

  // Edit mode: \u2190 Back cancels the edit and drops the user back on
  // the Review screen rather than walking one step further back into
  // the linear flow. Prevents accidental wander-off ("I clicked Edit
  // on Q3, but Back sent me to Q2 and now I'm lost").
  if (_obState.editReturnToReview) {
    _obState.editReturnToReview = false;
    const chat = getChat();
    if (chat) {
      chat.onboardingStep = 'review';
      _saveState();
    }
    _obTransitionTo('review');
    return;
  }

  const prev = _obPreviousStep(step);
  if (!prev) return;
  const chat = getChat();
  if (chat) {
    chat.onboardingStep = prev;
    _saveState();
  }
  _obTransitionTo(prev);
}

function _obPreviousStep(step) {
  switch (step) {
    case 'q1_other': return 'q1';
    case 'q_name':   return _obPreviousQNameOrigin();
    case 'q2':       return 'q_name';
    case 'q3':       return 'q2';
    case 'q4':       return 'q3';
    case 'q5':       return 'q4';
    case 'q6':       return 'q5';
    case 'review':   return 'q6';
    default:         return null;
  }
}

// q_name can be arrived at from either q1 (any non-other type) or
// q1_other. Rewind honors the actual path the user took, keyed off
// business.type.
function _obPreviousQNameOrigin() {
  const t = getBusiness().type;
  return t === 'other' ? 'q1_other' : 'q1';
}

// Animated fade between two step contents. The top bar and back link
// stay put; only the content column translates and cross-fades.
function _obTransitionTo(nextStep) {
  const content = document.getElementById('obContent');
  if (!content) {
    // Tear down any Q3 AI timers (typing animation frames, suggestion
    // debounce) before rendering the next step. Safe no-op when Q3
    // isn't active.
    _obQ3TeardownAI();
    _obState.currentStep = nextStep;
    _obRenderStep();
    return;
  }
  _obState.transitioning = true;
  content.classList.remove('ob-content-in');
  void content.offsetWidth;
  content.classList.add('ob-content-out');
  setTimeout(function () {
    // Same teardown here \u2014 catches the normal transition path,
    // whereas the branch above catches the "content already gone"
    // path (e.g. router swapped hm-shell mid-flight).
    _obQ3TeardownAI();
    _obState.currentStep = nextStep;
    _obRenderStep();
    _obState.transitioning = false;
  }, 200);
}

// ---------------------------------------------
// Global keyboard shortcuts
// ---------------------------------------------
//
// Bound once at mount, removed at completion so it doesn't leak past
// the dashboard shell mount. Rules:
//   - Escape:  swallowed. Onboarding is non-dismissable.
//   - Enter:   handled locally by inputs / buttons; multi-select needs
//              a keyboard fallback since no chip is focused by default.
//   - Backspace/Delete: goes back when no text input is focused (chip
//              steps) or when the focused input is empty (text steps —
//              also handled locally, this is a safety net for cases
//              where focus escapes the input).

function _obBindGlobalKeys() {
  if (_obState.keyHandler) {
    document.removeEventListener('keydown', _obState.keyHandler);
  }
  const handler = function (e) {
    // Non-dismissable.
    if (e.key === 'Escape') {
      e.preventDefault();
      return;
    }

    if (_obState.transitioning) return;

    const step = _obState.currentStep;
    if (step === 'building' || step === 'done') return;

    const target = e.target;
    const isTextField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

    // Enter on multi-select (Q4): trigger the Continue button if enabled.
    if (e.key === 'Enter' && !isTextField && step === 'q4') {
      const btn = document.getElementById('obContinueBtn');
      if (btn && !btn.disabled) {
        e.preventDefault();
        btn.click();
      }
      return;
    }

    // Enter on Review: trigger the "Looks good \u2192" approve button.
    // Uses its own ID so it doesn't collide with any per-step Continue.
    if (e.key === 'Enter' && !isTextField && step === 'review') {
      const approve = document.getElementById('obReviewApprove');
      if (approve) {
        e.preventDefault();
        approve.click();
      }
      return;
    }

    // Backspace / Delete goes back when we aren't inside a non-empty
    // text field. The per-input handler also intercepts the empty case
    // so the browser doesn't try to navigate history.
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // Q6's location picker has its own inputs (country search, city
      // field) whose empty-then-backspace shouldn't rip the user back
      // to Q5 mid-selection. Skip the goback shortcut when focus is
      // anywhere inside .ob-loc-picker \u2014 the "\u2190 Back" link
      // is still one click away.
      if (target && typeof target.closest === 'function' && target.closest('.ob-loc-picker')) {
        return;
      }
      const focusedInputEmpty = isTextField && target.value.length === 0;
      if (!isTextField || focusedInputEmpty) {
        if (_obCanGoBack()) {
          e.preventDefault();
          _obGoBack();
        }
      }
    }
  };
  _obState.keyHandler = handler;
  document.addEventListener('keydown', handler);
}

function _obUnbindGlobalKeys() {
  if (_obState.keyHandler) {
    document.removeEventListener('keydown', _obState.keyHandler);
    _obState.keyHandler = null;
  }
  // Q6 location picker registers a document-level outside-click handler
  // so its country dropdown closes on stray clicks. If onboarding
  // finishes with the picker still mounted (rare but possible on
  // reload), we need to tear that handler down here too or it will
  // leak past the dashboard mount and keep firing forever.
  if (_obLocationPicker && _obLocationPicker.outsideHandler) {
    document.removeEventListener('click', _obLocationPicker.outsideHandler);
    _obLocationPicker.outsideHandler = null;
  }
}

function _obBindBack() {
  const back = document.getElementById('obBackLink');
  if (back) back.addEventListener('click', _obGoBack);
}

// ---------------------------------------------
// Building / completion
// ---------------------------------------------

function _obStartBuilding() {
  const chat = getChat();
  if (chat) {
    chat.onboardingStep = 'building';
    _saveState();
  }
  _obTransitionTo('building');
  // Progress bar goes to 100% + pulse; the thinking-state renderer
  // (invoked from _obRenderStep) handles the "Clara is building..."
  // copy and the amber dots. After 3s we fade the whole screen out.
  setTimeout(_obCompleteFlow, 3000);
}

function _obCompleteFlow() {
  // Order matters. Pin the app-level routing state FIRST so a throw in
  // any downstream call (message push, task seeding, greeter, etc.)
  // can't strand the user on the "building" screen with no way out.
  // The 5 canonical steps from the spec, in this exact order:
  //   1. appState.mode = 'home'                (defensive: already home
  //      by the time we get here, but pins it against any stale value)
  //   2. appState.activeView = 'overview'       (this is our routing key
  //      \u2014 the same idea as appState.nav in the spec; the router
  //      switches on activeView, not `nav`)
  //   3. appState.onboardingOverlayOpen = false (dismount the overlay)
  //   4. _saveState()                           (persist BEFORE any
  //      async re-render so a reload lands here too)
  //   5. renderApp()                            (paint the dashboard)
  appState.mode = 'home';
  appState.activeView = 'overview';
  appState.onboardingOverlayOpen = false;

  // Flip the concept out of onboarding. Wrapped defensively \u2014
  // if chat is somehow missing, we still fall through to the dashboard
  // rather than short-circuiting the whole completion path.
  const chat = getChat();
  if (chat) {
    chat.onboardingComplete = true;
    chat.onboardingStep = 'done';
    if (!Array.isArray(chat.messages)) chat.messages = [];
    chat.messages.push({
      role: 'clara',
      text: "Your workspace is ready. I'll be here in the Chat tab whenever you want to talk."
    });
  }

  // Seed the Tasks board with Clara's GTM suggestions so the new user's
  // first visit to Tasks isn't an empty state. Safe to call more than
  // once \u2014 _seedClaraTasksIfMissing bails when items already exist.
  // try/catch so a seed failure never blocks the dashboard render.
  try {
    if (typeof window._seedClaraTasksIfMissing === 'function') {
      const active = getActiveConcept();
      if (active) window._seedClaraTasksIfMissing(active);
    }
  } catch (err) {
    console.error('Clara task seed failed during onboarding complete:', err);
  }

  // Seed today's Daily Insights so the Today screen has its 3 cards
  // ready the moment the user lands there. Independent try/catch from
  // task seeding so a bug in one path never blocks the other, and
  // neither can strand the user on the loading screen.
  try {
    if (typeof window._seedTodayInsightsIfMissing === 'function') {
      const active = getActiveConcept();
      if (active) window._seedTodayInsightsIfMissing(active);
    }
  } catch (err) {
    console.error('Daily insights seed failed during onboarding complete:', err);
  }

  // Legacy flag consumed by the old concept header (harmless now).
  window._justUnlockedConcept = true;

  _saveState();
  _obUnbindGlobalKeys();

  // Fade the entire onboarding screen out before the dashboard shell
  // takes over. The setTimeout render is unconditional \u2014 fade
  // classes are cosmetic; the dashboard paints either way after 280ms.
  const screen = document.getElementById('obFullscreen');
  if (screen) screen.classList.add('ob-fullscreen-out');
  setTimeout(function () { renderApp(); }, 280);
}

// ---------------------------------------------
// Small helpers (label ↔ machine-key reverse lookups)
// ---------------------------------------------

function _obLabelForType(typeKey) {
  if (!typeKey) return '';
  const keys = Object.keys(CL_Q1_TYPE_MAP);
  for (let i = 0; i < keys.length; i++) {
    if (CL_Q1_TYPE_MAP[keys[i]] === typeKey) return keys[i];
  }
  return '';
}

function _obLabelForBudget(budgetKey) {
  if (!budgetKey) return '';
  const keys = Object.keys(CL_Q5_BUDGET_MAP);
  for (let i = 0; i < keys.length; i++) {
    if (CL_Q5_BUDGET_MAP[keys[i]] === budgetKey) return keys[i];
  }
  return '';
}

// ---------------------------------------------
// Q3 — AI-assist extras (Enhance button + live suggestion pill)
// ---------------------------------------------
//
// Two features that mount below the standard Q3 textarea:
//
//   1. "Enhance with AI \u2726" button
//        Fills the textarea with a 1\u20132 sentence answer built from a
//        hardcoded (type \u00d7 goal) template table in
//        clara/customerTemplates.js. Animates in one character at a
//        time to feel generative; button shows a spinner and both it
//        and the textarea are locked for the ~2\u20134 second duration.
//        After it finishes, the user can freely edit the result.
//
//   2. Live keyword suggestion pill
//        Debounced 600ms; matches the typed text against keyword hints
//        (also in clara/customerTemplates.js). Renders as a ghost pill
//        with "Use this \u2192" that replaces the textarea content.
//        Hides when the field is empty or no keyword matches. Never
//        fires while Enhance is running.
//
// All timers and animation frames live on module-scoped
// _obQ3State so _obQ3TeardownAI() can cancel them cleanly on step
// transition. Nothing here is persisted \u2014 timers reset on remount.

const OB_Q3_TYPE_SPEED_MS   = 15;   // per-character insert delay
const OB_Q3_SUGGEST_DEBOUNCE_MS = 600;
const OB_Q3_SPARK_SVG = '<span class="ob-q3-enhance-spark" aria-hidden="true">\u2726</span>';
const OB_Q3_SPINNER_SVG = ''
  + '<span class="ob-q3-enhance-spinner" aria-hidden="true">'
  +   '<svg viewBox="0 0 20 20" width="14" height="14">'
  +     '<circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" '
  +       'stroke-width="2" stroke-linecap="round" stroke-dasharray="12 30" />'
  +   '</svg>'
  + '</span>';

const _obQ3State = {
  // setInterval id for the typing animation. Non-null while enhance is
  // actively streaming characters into the textarea.
  typingTimer: null,
  // setTimeout id for the 600ms input debounce. Reset on every keystroke.
  suggestDebounce: null,
  // Whether an enhance run is currently active. Used to gate the
  // suggestion pill (task requirement: "Do not fire suggestions if
  // Enhance is already running") and to short-circuit new enhance
  // clicks while one is already streaming.
  enhanceRunning: false
};

function _obMountQ3AIExtras(host) {
  if (!host) return;
  // Reset transient state so a remount (edit \u2192 back \u2192 edit)
  // never inherits stale flags or timers from a previous Q3 mount.
  _obQ3TeardownAI();

  const textarea = host.querySelector('#obInput');
  const continueBtn = host.querySelector('#obContinueBtn');
  if (!textarea || !continueBtn) return;

  // Enhance actions row \u2014 sits ABOVE the textarea, right-aligned.
  // Inserted before the textarea so it reads as an affordance
  // ("start with AI") rather than a footer.
  const actions = document.createElement('div');
  actions.className = 'ob-q3-actions';
  actions.innerHTML = ''
    + '<button type="button" class="ob-q3-enhance-btn" id="obQ3EnhanceBtn">'
    +   OB_Q3_SPARK_SVG
    +   '<span class="ob-q3-enhance-label">Enhance with AI</span>'
    +   OB_Q3_SPINNER_SVG
    + '</button>';
  host.insertBefore(actions, textarea);

  // Suggestion pill \u2014 sits BETWEEN the textarea and the Continue
  // button. Hidden by default; shown when a keyword match fires.
  const suggestion = document.createElement('div');
  suggestion.className = 'ob-q3-suggestion';
  suggestion.id = 'obQ3Suggestion';
  suggestion.setAttribute('hidden', '');
  suggestion.innerHTML = ''
    + '<span class="ob-q3-suggestion-prefix">Suggestion:</span>'
    + '<span class="ob-q3-suggestion-text" id="obQ3SuggestionText"></span>'
    + '<button type="button" class="ob-q3-suggestion-use" id="obQ3SuggestionUse">Use this \u2192</button>';
  host.insertBefore(suggestion, continueBtn);

  _obBindQ3AIEvents();
}

function _obBindQ3AIEvents() {
  const input = document.getElementById('obInput');
  const enhanceBtn = document.getElementById('obQ3EnhanceBtn');
  const suggestUse = document.getElementById('obQ3SuggestionUse');
  if (!input || !enhanceBtn) return;

  enhanceBtn.addEventListener('click', function () {
    if (_obQ3State.enhanceRunning) return;
    _obQ3StartEnhance();
  });

  // Debounced live suggestion. We piggyback on the existing input
  // element rather than owning our own listener chain \u2014 the
  // existing handler in _obRenderTextInput handles Continue-button
  // syncing and auto-grow; we just want to observe the same events.
  input.addEventListener('input', function () {
    if (_obQ3State.enhanceRunning) return;
    if (_obQ3State.suggestDebounce) clearTimeout(_obQ3State.suggestDebounce);
    _obQ3State.suggestDebounce = setTimeout(function () {
      _obQ3State.suggestDebounce = null;
      _obQ3RefreshSuggestion();
    }, OB_Q3_SUGGEST_DEBOUNCE_MS);
  });

  if (suggestUse) {
    suggestUse.addEventListener('click', function () {
      const textEl = document.getElementById('obQ3SuggestionText');
      if (!textEl) return;
      const suggestion = textEl.textContent || '';
      if (!suggestion) return;
      _obQ3ApplySuggestion(suggestion);
    });
  }
}

// ---------------------------------------------
// Enhance flow (typing animation)
// ---------------------------------------------

function _obQ3StartEnhance() {
  const input = document.getElementById('obInput');
  const btn = document.getElementById('obQ3EnhanceBtn');
  if (!input || !btn) return;

  const business = getBusiness();
  const enhanced = _claraEnhanceCustomer(business);
  if (!enhanced) return;

  _obQ3State.enhanceRunning = true;
  _obQ3HideSuggestion();
  // Cancel any pending debounce \u2014 suggestions can't fire while
  // enhance is running and we don't want a stale timeout waking up
  // afterwards with a mid-enhance input value.
  if (_obQ3State.suggestDebounce) {
    clearTimeout(_obQ3State.suggestDebounce);
    _obQ3State.suggestDebounce = null;
  }

  btn.classList.add('ob-q3-enhance-btn-running');
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  input.readOnly = true;
  input.value = '';
  _obQ3SyncInputAfterMutation(input);

  let i = 0;
  _obQ3State.typingTimer = setInterval(function () {
    // Guard against the textarea being replaced mid-animation (e.g.
    // user hit Back on the keyboard, the Q3 DOM was swapped out).
    const live = document.getElementById('obInput');
    if (!live) { _obQ3FinishEnhance(true); return; }
    if (i >= enhanced.length) { _obQ3FinishEnhance(false); return; }
    live.value += enhanced.charAt(i);
    _obQ3SyncInputAfterMutation(live);
    i += 1;
  }, OB_Q3_TYPE_SPEED_MS);
}

function _obQ3FinishEnhance(unmounted) {
  if (_obQ3State.typingTimer) {
    clearInterval(_obQ3State.typingTimer);
    _obQ3State.typingTimer = null;
  }
  _obQ3State.enhanceRunning = false;

  if (unmounted) return;

  const input = document.getElementById('obInput');
  const btn = document.getElementById('obQ3EnhanceBtn');
  if (input) {
    input.readOnly = false;
    // Scroll caret to the end + focus so the user can immediately
    // start editing without an extra click.
    input.focus();
    if (typeof input.setSelectionRange === 'function') {
      const end = input.value.length;
      try { input.setSelectionRange(end, end); } catch (err) { /* ignore */ }
    }
    _obQ3SyncInputAfterMutation(input);
    // Cancel the debounce our own input listener just armed via that
    // synthetic dispatch above. Otherwise 600ms after enhance
    // finishes a suggestion pill would flash on top of the freshly
    // enhanced text \u2014 confusing since the user just chose the
    // enhance path, not the suggest path.
    if (_obQ3State.suggestDebounce) {
      clearTimeout(_obQ3State.suggestDebounce);
      _obQ3State.suggestDebounce = null;
    }
  }
  if (btn) {
    btn.classList.remove('ob-q3-enhance-btn-running');
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
  }
}

// Setting textarea.value programmatically doesn't fire the 'input'
// event, so the Continue-button sync + auto-grow logic that
// _obRenderTextInput bound never runs. Dispatch a synthetic 'input'
// event so both effects (button enabled state, textarea height) stay
// in step with the character-by-character enhance animation.
function _obQ3SyncInputAfterMutation(input) {
  try {
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } catch (err) {
    // Older browsers might not support Event constructor \u2014 fall
    // back to a manual read of the sync helpers via the current
    // input value. Cap matches the primary auto-grow in
    // _obRenderTextInput so the two paths stay in sync.
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 320) + 'px';
  }
}

// ---------------------------------------------
// Suggestion flow (keyword hints)
// ---------------------------------------------

function _obQ3RefreshSuggestion() {
  if (_obQ3State.enhanceRunning) return;
  const input = document.getElementById('obInput');
  if (!input) return;
  const value = input.value || '';
  if (!value.trim()) { _obQ3HideSuggestion(); return; }
  const hit = _claraSuggestForCustomer(value);
  if (!hit) { _obQ3HideSuggestion(); return; }
  _obQ3ShowSuggestion(hit.suggest);
}

function _obQ3ShowSuggestion(text) {
  const wrap = document.getElementById('obQ3Suggestion');
  const textEl = document.getElementById('obQ3SuggestionText');
  if (!wrap || !textEl) return;
  textEl.textContent = text;
  wrap.removeAttribute('hidden');
}

function _obQ3HideSuggestion() {
  const wrap = document.getElementById('obQ3Suggestion');
  const textEl = document.getElementById('obQ3SuggestionText');
  if (wrap) wrap.setAttribute('hidden', '');
  if (textEl) textEl.textContent = '';
}

function _obQ3ApplySuggestion(text) {
  const input = document.getElementById('obInput');
  if (!input) return;
  input.value = text;
  _obQ3SyncInputAfterMutation(input);
  _obQ3HideSuggestion();
  // The synthetic 'input' event dispatched above re-arms our debounce
  // via the same listener that watches user keystrokes \u2014 which
  // would then fire 600ms later and re-show the exact same pill
  // (since the applied text still contains the keyword). Cancel it
  // so the user gets a clean textarea until they type something new.
  if (_obQ3State.suggestDebounce) {
    clearTimeout(_obQ3State.suggestDebounce);
    _obQ3State.suggestDebounce = null;
  }
  input.focus();
  if (typeof input.setSelectionRange === 'function') {
    const end = input.value.length;
    try { input.setSelectionRange(end, end); } catch (err) { /* ignore */ }
  }
}

// ---------------------------------------------
// Teardown
// ---------------------------------------------
//
// Idempotent \u2014 called by _obTransitionTo on every step change so
// leaving Q3 (via Continue, Back, or edit-return) cancels any live
// timers. Also called at the top of _obMountQ3AIExtras so a fresh
// mount always starts from a clean slate, whether Q3 is being seen
// for the first time or being re-entered via the Review edit path.

function _obQ3TeardownAI() {
  if (_obQ3State.typingTimer) {
    clearInterval(_obQ3State.typingTimer);
    _obQ3State.typingTimer = null;
  }
  if (_obQ3State.suggestDebounce) {
    clearTimeout(_obQ3State.suggestDebounce);
    _obQ3State.suggestDebounce = null;
  }
  _obQ3State.enhanceRunning = false;
}

// ---------------------------------------------
// Review screen — post-Q6 confirmation before building
// ---------------------------------------------
//
// Renders a summary card list of every answer collected during
// onboarding. Layout:
//
//   [ ob-avatar C ]
//   [ ob-question ]         Here's what I've got so far.
//   [ ob-subtitle  ]         Quick check before Clara builds...
//   [ ob-review-list ]
//     [ row: Business type       "Small business"        \u270e ]
//     [ row: What you do         "handmade wooden..."    \u270e ]  (Q1_other, only when type === 'other')
//     [ row: Business name       "Ahmed's Bakery"        \u270e ]
//     [ row: Goal                "Get more leads"        \u270e ]
//     [ row: Ideal customer      "Local families..."     \u270e ]
//     [ row: Marketing channels  chips of channels       \u270e ]
//     [ row: Monthly budget      "$250\u2013$1,000"      \u270e ]
//     [ row: Location            chips of city, country  \u270e ]
//   [ ob-continue-btn "Looks good \u2192" ]
//
// Each pencil calls _obEditStep(stepKey) which flips
// _obState.editReturnToReview and transitions to the target step. That
// step's committed answer routes back to review via _obAfterEdit.

// Inline pencil icon (Lucide-style). Kept inline because icons.js is
// dashboard-only and pulling that dependency here would create a
// circular concern (onboarding is meant to be self-contained \u2014
// it runs on top of the sidebar, not the other way around).
const OB_EDIT_ICON_SVG = ''
  + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" '
  +   'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
  +   'stroke-linejoin="round" aria-hidden="true">'
  +   '<path d="M12 20h9" />'
  +   '<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />'
  + '</svg>';

// Builds the full markup for the review screen's content column. Pure
// string \u2014 event binding happens in _obBindReviewEvents after
// _obRenderStep drops this into #obContent.
function _obReviewMarkup() {
  const rows = _obReviewRows();
  const rowsHtml = rows.map(function (row) {
    return _obReviewRowHtml(row);
  }).join('');
  const question = _obQuestionCopy('review');
  const subtitle = OB_SUBTITLES.review || '';
  return ''
    + '<div class="ob-avatar" aria-hidden="true">C</div>'
    + '<h1 class="ob-question" id="obQuestion">' + _escape(question) + '</h1>'
    + '<p class="ob-subtitle">' + _escape(subtitle) + '</p>'
    + '<div class="ob-review-list" id="obReviewList">' + rowsHtml + '</div>'
    + '<button type="button" class="ob-continue-btn ob-review-approve" id="obReviewApprove">'
    +   'Looks good \u2192'
    + '</button>';
}

// Assembles the list of row descriptors in canonical display order.
// Each row is { step, label, valueHtml, empty } where:
//   step      \u2014 the onboarding step to jump to when Edit is tapped
//   label     \u2014 small-caps field name shown above the answer
//   valueHtml \u2014 already-escaped HTML for the answer body (may be
//                 chip pills, multi-line text, or a plain span)
//   empty     \u2014 optional flag for muted "Not set" styling
function _obReviewRows() {
  const b = getBusiness();
  const rows = [];

  // Q1 \u2014 business type. Show the human label from the reverse map;
  // 'Other' rows are followed by a dedicated Q1_other row so the raw
  // typeDescription (stored on business.product) sits under its own
  // label rather than being smushed into the type row.
  const typeLabel = _obLabelForType(b.type);
  rows.push({
    step: 'q1',
    label: 'Business type',
    valueHtml: typeLabel
      ? '<span class="ob-review-value-text">' + _escape(typeLabel) + '</span>'
      : _obReviewEmptyValueHtml(),
    empty: !typeLabel
  });

  // Q1_other \u2014 only surfaces when the user picked "Other" so the
  // description they typed doesn't disappear into thin air. Editing
  // this row jumps to q1_other directly (not q1) so they can just
  // tweak the description without re-picking the type.
  if (b.type === 'other') {
    const desc = (b.product || '').trim();
    rows.push({
      step: 'q1_other',
      label: 'What you do',
      valueHtml: desc
        ? '<span class="ob-review-value-text">' + _escape(desc) + '</span>'
        : _obReviewEmptyValueHtml(),
      empty: !desc
    });
  }

  // Q_name
  const name = (b.name || '').trim();
  rows.push({
    step: 'q_name',
    label: 'Business name',
    valueHtml: name
      ? '<span class="ob-review-value-text">' + _escape(name) + '</span>'
      : _obReviewEmptyValueHtml(),
    empty: !name
  });

  // Q2 \u2014 stored as the raw approved label already, so just echo it.
  const goal = (b.goal || '').trim();
  rows.push({
    step: 'q2',
    label: 'Goal',
    valueHtml: goal
      ? '<span class="ob-review-value-text">' + _escape(goal) + '</span>'
      : _obReviewEmptyValueHtml(),
    empty: !goal
  });

  // Q3 \u2014 free text, potentially long. Multi-line safe via CSS
  // white-space: pre-wrap on .ob-review-value-text.
  const customer = (b.customer || '').trim();
  rows.push({
    step: 'q3',
    label: 'Ideal customer + what you sell',
    valueHtml: customer
      ? '<span class="ob-review-value-text ob-review-value-multiline">' + _escape(customer) + '</span>'
      : _obReviewEmptyValueHtml(),
    empty: !customer
  });

  // Q4 \u2014 chip pills for each committed channel. Empty array is a
  // real, meaningful answer ("I'm not marketing yet") and gets its
  // own muted-but-not-empty phrasing.
  const channels = Array.isArray(b.channels) ? b.channels : [];
  let channelsValueHtml;
  let channelsEmpty = false;
  if (channels.length === 0) {
    channelsValueHtml = '<span class="ob-review-value-text ob-review-value-soft">Not marketing yet</span>';
  } else {
    channelsValueHtml = '<div class="ob-review-chips">'
      + channels.map(function (c) {
          return '<span class="ob-review-chip">' + _escape(c) + '</span>';
        }).join('')
      + '</div>';
  }
  rows.push({
    step: 'q4',
    label: 'Marketing channels',
    valueHtml: channelsValueHtml,
    empty: channelsEmpty
  });

  // Q5 \u2014 stored as a machine key; reverse-map to the human label.
  const budgetLabel = _obLabelForBudget(b.budget);
  rows.push({
    step: 'q5',
    label: 'Monthly budget',
    valueHtml: budgetLabel
      ? '<span class="ob-review-value-text">' + _escape(budgetLabel) + '</span>'
      : _obReviewEmptyValueHtml(),
    empty: !budgetLabel
  });

  // Q6 \u2014 locations. Prefer the structured array; fall back to the
  // legacy string if somehow the array is empty but the string has
  // content (shouldn't happen post-Q6 but guards migrated legacy state).
  const locs = Array.isArray(b.locations) ? b.locations : [];
  let locsValueHtml;
  let locsEmpty = false;
  if (locs.length > 0) {
    locsValueHtml = '<div class="ob-review-chips">'
      + locs.map(function (loc) {
          const city = (loc.city || '').trim();
          const country = (loc.country || '').trim();
          const label = city && country ? city + ', ' + country : (city || country);
          return '<span class="ob-review-chip">' + _escape(label) + '</span>';
        }).join('')
      + '</div>';
  } else if ((b.location || '').trim()) {
    locsValueHtml = '<span class="ob-review-value-text">' + _escape(b.location.trim()) + '</span>';
  } else {
    locsValueHtml = _obReviewEmptyValueHtml();
    locsEmpty = true;
  }
  rows.push({
    step: 'q6',
    label: locs.length > 1 ? 'Locations' : 'Location',
    valueHtml: locsValueHtml,
    empty: locsEmpty
  });

  return rows;
}

function _obReviewRowHtml(row) {
  return ''
    + '<div class="ob-review-row' + (row.empty ? ' ob-review-row-empty' : '') + '">'
    +   '<div class="ob-review-row-main">'
    +     '<div class="ob-review-label">' + _escape(row.label) + '</div>'
    +     '<div class="ob-review-value">' + row.valueHtml + '</div>'
    +   '</div>'
    +   '<button type="button" class="ob-review-edit" data-step="' + _escape(row.step) + '" '
    +     'aria-label="Edit ' + _escape(row.label) + '">'
    +     OB_EDIT_ICON_SVG
    +     '<span class="ob-review-edit-label">Edit</span>'
    +   '</button>'
    + '</div>';
}

function _obReviewEmptyValueHtml() {
  // Displayed when a persisted concept is somehow missing a field the
  // user should have already answered. In practice we only reach this
  // branch through very-legacy migrations or corrupt state; the Edit
  // button routes them straight to the missing step to fix it.
  return '<span class="ob-review-value-text ob-review-value-empty">Not set</span>';
}

function _obBindReviewEvents() {
  const list = document.getElementById('obReviewList');
  if (list) {
    list.addEventListener('click', function (e) {
      const btn = e.target.closest('.ob-review-edit');
      if (!btn) return;
      const step = btn.getAttribute('data-step');
      if (!step) return;
      _obEditStep(step);
    });
  }
  const approve = document.getElementById('obReviewApprove');
  if (approve) {
    approve.addEventListener('click', function () {
      if (_obState.transitioning) return;
      // Belt-and-braces: any lingering edit flag must be cleared before
      // building so a subsequent re-entry (unlikely, but possible via
      // an external state mutation) can't accidentally reroute through
      // review again.
      _obState.editReturnToReview = false;
      _obStartBuilding();
    });
  }
}

// Jumps the flow to a specific question step in edit mode. Sets the
// flag so that step's answer handler routes back to review instead of
// continuing linearly. Also refreshes the multi-select draft when
// editing Q4 so the chip pills reflect the current business.channels
// rather than whatever channelsDraft was last frozen at during the
// initial pass.
function _obEditStep(step) {
  if (_obState.transitioning) return;
  if (!_obKnownStep(step)) return;
  _obState.editReturnToReview = true;
  if (step === 'q4') {
    const b = getBusiness();
    _obState.channelsDraft = Array.isArray(b.channels) ? b.channels.slice() : [];
  }
  const chat = getChat();
  if (chat) {
    chat.onboardingStep = step;
    _saveState();
  }
  _obTransitionTo(step);
}

// ---------------------------------------------
// Q6 — Location picker (country dropdown + city + interactive world map)
// ---------------------------------------------
//
// Structured replacement for the legacy free-text location field. UX:
//   1. Searchable country dropdown (static list, ~60 countries).
//   2. Once a country is picked, a city text input appears with a few
//      known-major-city suggestion chips for that country.
//   3. "Add" commits the pair to a draft array; each entry renders as
//      a removable tag under the form.
//   4. Below the tags sits an inline SVG world map (equirectangular
//      projection). Every committed location gets a pin at its
//      approximate lat/lng; adjacent pins are joined by a thin amber
//      polyline in commit order.
//   5. Continue is enabled once the draft has \u2265 1 entry; on commit
//      we save the structured array and also derive the legacy string
//      for backward-compat consumers.
//
// No external libs. Country lookup + major-city lat/lng are hardcoded
// (top 50+ countries, 2\u20134 cities each) \u2014 the map is a
// hand-simplified continental SVG, projected 1000\u00d7500 equirectangular.

// --- Country + major-city dataset ---
//
// { name, lat, lng, cities: [{ name, lat, lng }] }
// `lat`/`lng` on the country level is the default pin location when a
// user types a city we don't have in the table \u2014 usually the
// capital or geographic centroid. Cities cover top hubs a mockup user
// is realistically going to pick; the free city input lets them type
// anything else without losing the pin (we just fall back to the
// country's default lat/lng in that case).

const OB_COUNTRIES = [
  { name: 'Pakistan',          lat: 30.38, lng: 69.35, cities: [
    { name: 'Karachi', lat: 24.86, lng: 67.01 },
    { name: 'Lahore',  lat: 31.55, lng: 74.34 },
    { name: 'Islamabad', lat: 33.68, lng: 73.05 },
    { name: 'Peshawar', lat: 34.02, lng: 71.58 }
  ]},
  { name: 'India',             lat: 20.59, lng: 78.96, cities: [
    { name: 'Mumbai', lat: 19.08, lng: 72.88 },
    { name: 'Delhi',  lat: 28.70, lng: 77.10 },
    { name: 'Bangalore', lat: 12.97, lng: 77.59 },
    { name: 'Hyderabad', lat: 17.39, lng: 78.49 }
  ]},
  { name: 'Bangladesh',        lat: 23.68, lng: 90.36, cities: [
    { name: 'Dhaka', lat: 23.81, lng: 90.41 },
    { name: 'Chittagong', lat: 22.36, lng: 91.78 }
  ]},
  { name: 'Sri Lanka',         lat: 7.87,  lng: 80.77, cities: [
    { name: 'Colombo', lat: 6.93, lng: 79.86 }
  ]},
  { name: 'Nepal',             lat: 28.39, lng: 84.12, cities: [
    { name: 'Kathmandu', lat: 27.72, lng: 85.32 }
  ]},
  { name: 'China',             lat: 35.86, lng: 104.20, cities: [
    { name: 'Beijing',  lat: 39.90, lng: 116.41 },
    { name: 'Shanghai', lat: 31.23, lng: 121.47 },
    { name: 'Shenzhen', lat: 22.54, lng: 114.06 },
    { name: 'Guangzhou',lat: 23.13, lng: 113.26 }
  ]},
  { name: 'Japan',             lat: 36.20, lng: 138.25, cities: [
    { name: 'Tokyo',  lat: 35.68, lng: 139.69 },
    { name: 'Osaka',  lat: 34.69, lng: 135.50 },
    { name: 'Kyoto',  lat: 35.01, lng: 135.76 }
  ]},
  { name: 'South Korea',       lat: 35.91, lng: 127.77, cities: [
    { name: 'Seoul',  lat: 37.57, lng: 126.98 },
    { name: 'Busan',  lat: 35.18, lng: 129.08 }
  ]},
  { name: 'Indonesia',         lat: -0.79, lng: 113.92, cities: [
    { name: 'Jakarta', lat: -6.21, lng: 106.85 },
    { name: 'Bali',    lat: -8.34, lng: 115.09 },
    { name: 'Surabaya',lat: -7.25, lng: 112.75 }
  ]},
  { name: 'Vietnam',           lat: 14.06, lng: 108.28, cities: [
    { name: 'Ho Chi Minh City', lat: 10.82, lng: 106.63 },
    { name: 'Hanoi',            lat: 21.03, lng: 105.85 }
  ]},
  { name: 'Thailand',          lat: 15.87, lng: 100.99, cities: [
    { name: 'Bangkok',     lat: 13.76, lng: 100.50 },
    { name: 'Chiang Mai',  lat: 18.79, lng: 98.98 }
  ]},
  { name: 'Philippines',       lat: 12.88, lng: 121.77, cities: [
    { name: 'Manila',   lat: 14.60, lng: 120.98 },
    { name: 'Cebu',     lat: 10.32, lng: 123.90 }
  ]},
  { name: 'Malaysia',          lat: 4.21,  lng: 101.98, cities: [
    { name: 'Kuala Lumpur', lat: 3.14, lng: 101.69 },
    { name: 'Penang',       lat: 5.42, lng: 100.33 }
  ]},
  { name: 'Singapore',         lat: 1.35,  lng: 103.82, cities: [
    { name: 'Singapore', lat: 1.35, lng: 103.82 }
  ]},
  { name: 'Turkey',            lat: 38.96, lng: 35.24, cities: [
    { name: 'Istanbul', lat: 41.01, lng: 28.98 },
    { name: 'Ankara',   lat: 39.93, lng: 32.86 },
    { name: 'Izmir',    lat: 38.42, lng: 27.13 }
  ]},
  { name: 'Saudi Arabia',      lat: 23.89, lng: 45.08, cities: [
    { name: 'Riyadh', lat: 24.71, lng: 46.68 },
    { name: 'Jeddah', lat: 21.49, lng: 39.19 }
  ]},
  { name: 'United Arab Emirates', lat: 23.42, lng: 53.85, cities: [
    { name: 'Dubai',    lat: 25.20, lng: 55.27 },
    { name: 'Abu Dhabi',lat: 24.47, lng: 54.37 }
  ]},
  { name: 'Iran',              lat: 32.43, lng: 53.69, cities: [
    { name: 'Tehran', lat: 35.69, lng: 51.39 }
  ]},
  { name: 'Iraq',              lat: 33.22, lng: 43.68, cities: [
    { name: 'Baghdad', lat: 33.32, lng: 44.36 }
  ]},
  { name: 'Israel',            lat: 31.05, lng: 34.85, cities: [
    { name: 'Tel Aviv',  lat: 32.08, lng: 34.78 },
    { name: 'Jerusalem', lat: 31.78, lng: 35.22 }
  ]},
  { name: 'Egypt',             lat: 26.82, lng: 30.80, cities: [
    { name: 'Cairo',      lat: 30.04, lng: 31.24 },
    { name: 'Alexandria', lat: 31.20, lng: 29.92 }
  ]},
  { name: 'Nigeria',           lat: 9.08,  lng: 8.68, cities: [
    { name: 'Lagos', lat: 6.52, lng: 3.38 },
    { name: 'Abuja', lat: 9.08, lng: 7.40 }
  ]},
  { name: 'Kenya',             lat: -0.02, lng: 37.91, cities: [
    { name: 'Nairobi', lat: -1.29, lng: 36.82 }
  ]},
  { name: 'South Africa',      lat: -30.56, lng: 22.94, cities: [
    { name: 'Johannesburg', lat: -26.20, lng: 28.05 },
    { name: 'Cape Town',    lat: -33.92, lng: 18.42 },
    { name: 'Durban',       lat: -29.86, lng: 31.02 }
  ]},
  { name: 'Morocco',           lat: 31.79, lng: -7.09, cities: [
    { name: 'Casablanca', lat: 33.57, lng: -7.59 },
    { name: 'Marrakech',  lat: 31.63, lng: -7.99 }
  ]},
  { name: 'Ethiopia',          lat: 9.15,  lng: 40.49, cities: [
    { name: 'Addis Ababa', lat: 9.03, lng: 38.74 }
  ]},
  { name: 'Ghana',             lat: 7.95,  lng: -1.02, cities: [
    { name: 'Accra', lat: 5.60, lng: -0.19 }
  ]},
  { name: 'Australia',         lat: -25.27, lng: 133.77, cities: [
    { name: 'Sydney',    lat: -33.87, lng: 151.21 },
    { name: 'Melbourne', lat: -37.81, lng: 144.96 },
    { name: 'Brisbane',  lat: -27.47, lng: 153.02 },
    { name: 'Perth',     lat: -31.95, lng: 115.86 }
  ]},
  { name: 'New Zealand',       lat: -40.90, lng: 174.89, cities: [
    { name: 'Auckland',   lat: -36.85, lng: 174.76 },
    { name: 'Wellington', lat: -41.29, lng: 174.78 }
  ]},
  { name: 'United States',     lat: 37.09, lng: -95.71, cities: [
    { name: 'New York',      lat: 40.71, lng: -74.01 },
    { name: 'Los Angeles',   lat: 34.05, lng: -118.24 },
    { name: 'Chicago',       lat: 41.88, lng: -87.63 },
    { name: 'San Francisco', lat: 37.77, lng: -122.42 },
    { name: 'Miami',         lat: 25.76, lng: -80.19 },
    { name: 'Austin',        lat: 30.27, lng: -97.74 }
  ]},
  { name: 'Canada',            lat: 56.13, lng: -106.35, cities: [
    { name: 'Toronto',   lat: 43.65, lng: -79.38 },
    { name: 'Vancouver', lat: 49.28, lng: -123.12 },
    { name: 'Montreal',  lat: 45.50, lng: -73.57 }
  ]},
  { name: 'Mexico',            lat: 23.63, lng: -102.55, cities: [
    { name: 'Mexico City', lat: 19.43, lng: -99.13 },
    { name: 'Guadalajara', lat: 20.66, lng: -103.35 },
    { name: 'Monterrey',   lat: 25.69, lng: -100.32 }
  ]},
  { name: 'Brazil',            lat: -14.24, lng: -51.93, cities: [
    { name: 'S\u00e3o Paulo',      lat: -23.55, lng: -46.63 },
    { name: 'Rio de Janeiro', lat: -22.91, lng: -43.17 },
    { name: 'Bras\u00edlia',      lat: -15.80, lng: -47.86 }
  ]},
  { name: 'Argentina',         lat: -38.42, lng: -63.62, cities: [
    { name: 'Buenos Aires', lat: -34.60, lng: -58.38 }
  ]},
  { name: 'Chile',             lat: -35.68, lng: -71.54, cities: [
    { name: 'Santiago', lat: -33.45, lng: -70.67 }
  ]},
  { name: 'Colombia',          lat: 4.57,  lng: -74.30, cities: [
    { name: 'Bogot\u00e1',   lat: 4.71, lng: -74.07 },
    { name: 'Medell\u00edn', lat: 6.24, lng: -75.58 }
  ]},
  { name: 'Peru',              lat: -9.19,  lng: -75.02, cities: [
    { name: 'Lima', lat: -12.05, lng: -77.04 }
  ]},
  { name: 'Venezuela',         lat: 6.42,   lng: -66.59, cities: [
    { name: 'Caracas', lat: 10.48, lng: -66.90 }
  ]},
  { name: 'United Kingdom',    lat: 55.38,  lng: -3.44, cities: [
    { name: 'London',     lat: 51.51, lng: -0.13 },
    { name: 'Manchester', lat: 53.48, lng: -2.24 },
    { name: 'Edinburgh',  lat: 55.95, lng: -3.19 },
    { name: 'Birmingham', lat: 52.49, lng: -1.90 }
  ]},
  { name: 'Ireland',           lat: 53.14,  lng: -7.69, cities: [
    { name: 'Dublin', lat: 53.35, lng: -6.26 }
  ]},
  { name: 'France',            lat: 46.23,  lng: 2.21, cities: [
    { name: 'Paris',     lat: 48.86, lng: 2.35 },
    { name: 'Lyon',      lat: 45.76, lng: 4.84 },
    { name: 'Marseille', lat: 43.30, lng: 5.37 }
  ]},
  { name: 'Germany',           lat: 51.17,  lng: 10.45, cities: [
    { name: 'Berlin',    lat: 52.52, lng: 13.41 },
    { name: 'Munich',    lat: 48.14, lng: 11.58 },
    { name: 'Hamburg',   lat: 53.55, lng: 9.99 },
    { name: 'Frankfurt', lat: 50.11, lng: 8.68 }
  ]},
  { name: 'Italy',             lat: 41.87,  lng: 12.57, cities: [
    { name: 'Rome',   lat: 41.90, lng: 12.50 },
    { name: 'Milan',  lat: 45.46, lng: 9.19 },
    { name: 'Naples', lat: 40.85, lng: 14.27 }
  ]},
  { name: 'Spain',             lat: 40.46,  lng: -3.75, cities: [
    { name: 'Madrid',    lat: 40.42, lng: -3.70 },
    { name: 'Barcelona', lat: 41.39, lng: 2.17 },
    { name: 'Valencia',  lat: 39.47, lng: -0.38 }
  ]},
  { name: 'Portugal',          lat: 39.40,  lng: -8.22, cities: [
    { name: 'Lisbon', lat: 38.72, lng: -9.14 },
    { name: 'Porto',  lat: 41.15, lng: -8.61 }
  ]},
  { name: 'Netherlands',       lat: 52.13,  lng: 5.29, cities: [
    { name: 'Amsterdam', lat: 52.37, lng: 4.90 },
    { name: 'Rotterdam', lat: 51.92, lng: 4.48 }
  ]},
  { name: 'Belgium',           lat: 50.50,  lng: 4.47, cities: [
    { name: 'Brussels', lat: 50.85, lng: 4.35 }
  ]},
  { name: 'Sweden',            lat: 60.13,  lng: 18.64, cities: [
    { name: 'Stockholm', lat: 59.33, lng: 18.07 },
    { name: 'Gothenburg',lat: 57.71, lng: 11.97 }
  ]},
  { name: 'Norway',            lat: 60.47,  lng: 8.47, cities: [
    { name: 'Oslo',   lat: 59.91, lng: 10.75 },
    { name: 'Bergen', lat: 60.39, lng: 5.32 }
  ]},
  { name: 'Denmark',           lat: 56.26,  lng: 9.50, cities: [
    { name: 'Copenhagen', lat: 55.68, lng: 12.57 }
  ]},
  { name: 'Finland',           lat: 61.92,  lng: 25.75, cities: [
    { name: 'Helsinki', lat: 60.17, lng: 24.94 }
  ]},
  { name: 'Poland',            lat: 51.92,  lng: 19.15, cities: [
    { name: 'Warsaw', lat: 52.23, lng: 21.01 },
    { name: 'Krakow', lat: 50.06, lng: 19.94 }
  ]},
  { name: 'Russia',            lat: 61.52,  lng: 105.32, cities: [
    { name: 'Moscow',          lat: 55.75, lng: 37.62 },
    { name: 'Saint Petersburg',lat: 59.93, lng: 30.34 }
  ]},
  { name: 'Ukraine',           lat: 48.38,  lng: 31.17, cities: [
    { name: 'Kyiv', lat: 50.45, lng: 30.52 }
  ]},
  { name: 'Czech Republic',    lat: 49.82,  lng: 15.47, cities: [
    { name: 'Prague', lat: 50.08, lng: 14.44 }
  ]},
  { name: 'Austria',           lat: 47.52,  lng: 14.55, cities: [
    { name: 'Vienna', lat: 48.21, lng: 16.37 }
  ]},
  { name: 'Switzerland',       lat: 46.82,  lng: 8.23, cities: [
    { name: 'Zurich', lat: 47.38, lng: 8.54 },
    { name: 'Geneva', lat: 46.20, lng: 6.15 }
  ]},
  { name: 'Greece',            lat: 39.07,  lng: 21.82, cities: [
    { name: 'Athens', lat: 37.98, lng: 23.72 }
  ]},
  { name: 'Romania',           lat: 45.94,  lng: 24.97, cities: [
    { name: 'Bucharest', lat: 44.43, lng: 26.10 }
  ]},
  { name: 'Hungary',           lat: 47.16,  lng: 19.50, cities: [
    { name: 'Budapest', lat: 47.50, lng: 19.04 }
  ]}
];

// Fast label lookup used by the dropdown filter + saved-state rehydrate.
function _obFindCountry(name) {
  const target = String(name || '').trim().toLowerCase();
  if (!target) return null;
  for (let i = 0; i < OB_COUNTRIES.length; i++) {
    if (OB_COUNTRIES[i].name.toLowerCase() === target) return OB_COUNTRIES[i];
  }
  return null;
}

// Resolves a { country, city } pair to a lat/lng for pinning. Priority:
//   1. Exact known-city hit under the matching country.
//   2. Country default lat/lng (used when the user typed a city we
//      don't have in the table, or left it blank).
//   3. null when neither the country nor city match anything \u2014
//      handled upstream by simply skipping the pin.
function _obResolveLatLng(loc) {
  const country = _obFindCountry(loc.country);
  if (!country) return null;
  const cityQuery = String(loc.city || '').trim().toLowerCase();
  if (cityQuery && Array.isArray(country.cities)) {
    for (let i = 0; i < country.cities.length; i++) {
      if (country.cities[i].name.toLowerCase() === cityQuery) {
        return { lat: country.cities[i].lat, lng: country.cities[i].lng };
      }
    }
  }
  return { lat: country.lat, lng: country.lng };
}

// Equirectangular projection to the map's 1000\u00d7500 viewBox. Latitude
// is clamped to \u00b185 so poles don't overflow the box vertically.
function _obProjectLatLng(lat, lng) {
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const x = (lng + 180) / 360 * 1000;
  const y = (90 - clampedLat) / 180 * 500;
  return { x: x, y: y };
}

// --- Continental SVG paths ---
//
// Hand-authored continent outlines projected in the same equirectangular
// 1000\u00d7500 coordinate space that _obProjectLatLng uses, so pins line
// up with the underlying landmasses. Each path uses 30\u201360 vertices
// derived from real coastal reference points at a rough 1:110m
// simplification level \u2014 accurate enough to read as an actual
// world map (recognisable continent silhouettes) while staying compact
// enough to inline. Small archipelagos are approximated (Aleutians,
// Falklands, Caribbean, Pacific islands intentionally omitted).
//
// Reference coordinate anchors used while drafting each path:
//   Barrow, AK       (-156, 71)   -> (67, 53)
//   Newfoundland tip (-53,  47)   -> (353, 120)
//   Miami            (-80, 25.8)  -> (278, 178)
//   Panama-Colombia  (-77, 8.7)   -> (286, 226)
//   Rio de Janeiro   (-43, -22.9) -> (381, 314)
//   Cape Horn        (-67, -55)   -> (314, 403)
//   Cape Town        (18, -33.9)  -> (551, 344)
//   Horn of Africa   (51, 11)     -> (642, 220)
//   Nordkapp, Norway (25, 71)     -> (569, 53)
//   Chukotka         (170, 65)    -> (972, 69)
//   Cape Chelyuskin  (104, 78)    -> (789, 33)
//   Tokyo            (140, 35.7)  -> (889, 151)
//   Singapore        (104, 1.3)   -> (789, 246)
//   Perth            (116, -32)   -> (822, 339)
//   Sydney           (151, -34)   -> (920, 344)

const OB_WORLD_MAP_PATHS = [
  // North America (Alaska \u2192 Canadian arctic \u2192 Newfoundland \u2192
  // US east coast \u2192 Gulf of Mexico \u2192 Yucat\u00e1n \u2192 Central
  // America \u2192 back up the Pacific coast \u2192 BC \u2192 SE Alaska).
  // Single continuous path so a fill renders cleanly with no seams.
  'M 67,53 L 100,54 L 128,58 L 175,60 L 220,52 L 275,45 L 305,42 L 316,55 L 322,72 L 320,85 L 342,95 L 350,108 L 355,122 L 340,127 L 318,131 L 302,135 L 293,142 L 288,152 L 285,163 L 282,172 L 278,178 L 273,182 L 268,178 L 262,175 L 250,168 L 236,170 L 228,178 L 229,187 L 232,195 L 240,201 L 250,201 L 252,196 L 258,192 L 262,196 L 260,203 L 258,209 L 265,215 L 275,222 L 285,226 L 288,232 L 284,236 L 279,232 L 271,226 L 262,220 L 253,214 L 245,211 L 236,207 L 226,203 L 217,199 L 210,195 L 202,188 L 195,181 L 195,187 L 191,187 L 189,180 L 187,172 L 180,166 L 175,158 L 168,148 L 162,138 L 158,127 L 156,117 L 152,109 L 143,101 L 130,93 L 116,86 L 100,82 L 82,82 L 68,86 L 55,92 L 45,96 L 40,86 L 40,73 L 48,63 L 60,56 Z',

  // Greenland
  'M 380,42 L 400,38 L 425,40 L 445,50 L 458,68 L 460,88 L 452,100 L 438,108 L 422,108 L 405,102 L 390,90 L 380,72 L 378,55 Z',

  // South America (Cartagena \u2192 Amazon mouth \u2192 Brazil coast \u2192
  // Uruguay \u2192 Patagonia \u2192 Cape Horn \u2192 back up the Andean
  // Pacific coast to Panama).
  'M 285,232 L 294,224 L 302,228 L 315,232 L 328,238 L 348,243 L 367,253 L 386,268 L 397,285 L 402,302 L 393,317 L 383,326 L 378,335 L 370,344 L 358,350 L 344,346 L 340,358 L 342,375 L 340,388 L 342,398 L 335,406 L 322,410 L 313,403 L 305,393 L 301,378 L 300,362 L 302,348 L 304,336 L 303,322 L 302,308 L 297,295 L 291,283 L 286,271 L 282,258 L 281,248 L 283,240 Z',

  // Iceland
  'M 448,101 L 458,99 L 467,102 L 470,109 L 466,115 L 458,116 L 449,113 L 445,107 Z',

  // British Isles (Britain + Ireland as one blob \u2014 the Irish Sea
  // gap is smaller than a pin at this resolution).
  'M 484,102 L 492,99 L 498,101 L 500,107 L 498,113 L 501,119 L 505,124 L 501,128 L 494,127 L 488,122 L 484,115 L 480,108 Z',

  // Continental Europe + Scandinavia + Iberia (one shape covering
  // Portugal \u2192 France \u2192 Netherlands \u2192 Denmark \u2192 Norway \u2192
  // Sweden \u2192 Finland \u2192 back down through Baltic \u2192 Poland \u2192
  // Balkans \u2192 Italy \u2192 Spain \u2192 Gibraltar).
  'M 475,142 L 480,132 L 486,127 L 490,124 L 494,120 L 500,118 L 505,116 L 512,115 L 518,110 L 520,102 L 525,95 L 530,84 L 536,73 L 542,63 L 552,55 L 562,53 L 569,53 L 574,60 L 580,68 L 588,74 L 596,78 L 600,84 L 596,90 L 588,96 L 582,102 L 576,108 L 570,115 L 573,123 L 578,130 L 580,138 L 584,145 L 582,152 L 574,158 L 566,157 L 558,154 L 552,150 L 548,144 L 544,148 L 546,158 L 549,165 L 550,172 L 546,174 L 540,168 L 536,160 L 533,154 L 528,152 L 522,153 L 516,154 L 510,153 L 505,152 L 500,152 L 496,150 L 490,148 L 484,147 L 478,146 Z',

  // Africa
  'M 486,152 L 500,152 L 515,155 L 528,158 L 542,161 L 555,164 L 570,166 L 583,166 L 590,168 L 593,175 L 596,183 L 600,190 L 605,198 L 611,206 L 618,213 L 626,218 L 636,220 L 644,220 L 640,228 L 636,238 L 632,247 L 625,254 L 622,262 L 622,272 L 622,282 L 620,293 L 617,303 L 613,314 L 608,324 L 602,334 L 594,344 L 583,348 L 573,347 L 566,340 L 560,331 L 556,321 L 552,311 L 548,300 L 545,290 L 542,280 L 539,271 L 535,262 L 530,253 L 522,245 L 513,240 L 504,237 L 496,236 L 488,236 L 480,236 L 472,236 L 464,234 L 458,230 L 454,225 L 452,218 L 452,210 L 454,203 L 458,196 L 462,188 L 465,180 L 468,172 L 472,164 L 478,158 L 484,153 Z',

  // Madagascar
  'M 618,290 L 624,290 L 628,300 L 630,312 L 628,322 L 624,330 L 618,332 L 614,325 L 614,313 L 615,300 Z',

  // Arabian Peninsula (Sinai N \u2192 Levant border \u2192 Kuwait \u2192
  // Persian Gulf S coast \u2192 UAE \u2192 Musandam / Oman \u2192 Yemen \u2192
  // Aden \u2192 Red Sea back up to Sinai). Wide "kite" shape so
  // Riyadh (~630,181), Doha (~642,180), Dubai (~654,180), and
  // Muscat (~663,184) all land inside the fill instead of skirting
  // a narrow diagonal wedge.
  'M 593,170 L 610,170 L 625,173 L 640,176 L 652,181 L 660,187 L 665,195 L 665,203 L 660,210 L 652,217 L 642,225 L 632,231 L 622,232 L 614,225 L 608,215 L 602,204 L 597,193 L 592,182 L 590,175 Z',

  // Eurasia mainland (Russia + Central Asia + China + Korea + Turkey,
  // one massive path). The Iberia/Europe path above handles W Europe;
  // this one owns everything from the Caspian eastward to Chukotka
  // and down through China to the SE Asia coast. Joins Europe via
  // the Ural region so the eye reads it as one landmass.
  'M 570,110 L 585,105 L 600,100 L 618,96 L 635,90 L 655,82 L 675,74 L 690,68 L 705,63 L 720,58 L 735,52 L 750,48 L 762,45 L 775,42 L 789,33 L 800,35 L 812,42 L 825,45 L 838,44 L 852,45 L 866,45 L 880,46 L 895,48 L 908,50 L 920,54 L 932,58 L 945,60 L 958,63 L 970,66 L 975,72 L 973,82 L 968,90 L 960,92 L 952,90 L 942,90 L 934,94 L 940,102 L 950,108 L 955,116 L 948,124 L 940,120 L 930,116 L 920,116 L 915,124 L 918,133 L 915,140 L 908,138 L 900,132 L 890,133 L 886,141 L 883,150 L 890,158 L 895,166 L 892,175 L 885,178 L 878,175 L 868,168 L 862,158 L 858,150 L 848,148 L 838,150 L 830,157 L 830,168 L 837,178 L 843,186 L 838,196 L 830,204 L 822,213 L 820,222 L 816,232 L 810,243 L 802,253 L 796,264 L 790,272 L 786,266 L 792,258 L 796,248 L 793,240 L 785,236 L 778,230 L 774,220 L 776,210 L 780,202 L 780,190 L 772,180 L 763,175 L 754,175 L 748,183 L 744,192 L 740,200 L 736,195 L 738,188 L 738,180 L 732,175 L 725,175 L 720,170 L 725,162 L 733,158 L 735,150 L 728,145 L 720,145 L 712,150 L 706,148 L 700,142 L 696,135 L 690,132 L 682,132 L 676,127 L 670,120 L 662,118 L 655,120 L 648,118 L 645,110 L 635,105 L 625,105 L 615,110 L 605,112 L 595,115 L 585,115 L 578,113 Z',

  // South Asia (India + Pakistan + Bangladesh) as one path. Runs
  // Kashmir \u2192 Nepal/Bhutan/NE India \u2192 Bay of Bengal east \u2192
  // south tip at Kanyakumari (~745,222) \u2192 back up the Arabian Sea
  // coast \u2192 through Gujarat + Sindh (widened west edge so Karachi
  // near (686,181) lands on drawn land, not in the sea) \u2192
  // Balochistan \u2192 Peshawar/Kashmir.
  'M 680,152 L 690,150 L 700,152 L 710,158 L 718,166 L 726,175 L 733,184 L 740,193 L 745,203 L 745,213 L 740,222 L 733,229 L 725,232 L 718,228 L 712,220 L 708,210 L 704,200 L 701,192 L 696,187 L 691,188 L 686,186 L 682,182 L 680,175 L 678,167 L 678,158 Z',

  // Southeast Asia mainland (Myanmar \u2192 Thailand \u2192 Cambodia \u2192
  // Vietnam \u2192 back up through Laos).
  'M 762,187 L 770,193 L 776,200 L 780,208 L 782,218 L 786,228 L 792,236 L 800,240 L 803,250 L 800,258 L 793,258 L 790,251 L 784,246 L 776,244 L 770,240 L 764,236 L 760,226 L 762,218 L 762,208 L 761,198 Z',

  // Sumatra (Indonesia W)
  'M 758,236 L 768,242 L 776,250 L 782,258 L 785,266 L 782,270 L 774,266 L 768,262 L 762,254 L 758,246 Z',

  // Borneo
  'M 800,240 L 812,242 L 820,248 L 824,256 L 822,264 L 815,270 L 806,268 L 800,262 L 798,254 L 798,246 Z',

  // Java
  'M 784,270 L 795,270 L 805,272 L 815,272 L 822,274 L 815,278 L 802,278 L 792,277 L 784,275 Z',

  // Sulawesi (Celebes) \u2014 the "spider" shape simplified
  'M 828,254 L 834,252 L 838,258 L 836,266 L 838,272 L 834,275 L 830,270 L 828,262 Z',

  // New Guinea (Papua)
  'M 858,264 L 872,262 L 886,264 L 898,268 L 910,272 L 918,278 L 912,282 L 900,282 L 886,280 L 872,278 L 862,274 L 856,270 Z',

  // Philippines (approximate cluster)
  'M 830,204 L 837,206 L 840,214 L 838,223 L 834,230 L 830,225 L 828,215 L 828,208 Z',

  // Japan (three main islands as one elongated shape)
  'M 878,132 L 888,132 L 895,138 L 898,148 L 895,157 L 890,164 L 892,172 L 888,178 L 882,176 L 878,168 L 876,158 L 875,148 L 875,138 Z',

  // Sri Lanka
  'M 727,225 L 733,227 L 735,233 L 733,238 L 728,238 L 725,232 Z',

  // Australia (Perth SW \u2192 Cape Leeuwin \u2192 Cape Byron \u2192 Cape
  // York N \u2192 Kimberley \u2192 back to Perth).
  'M 820,338 L 830,335 L 845,332 L 862,330 L 878,330 L 892,332 L 902,335 L 908,340 L 908,348 L 902,354 L 896,360 L 886,362 L 890,354 L 895,346 L 890,342 L 882,348 L 877,354 L 866,358 L 855,360 L 843,358 L 832,354 L 823,348 L 817,342 Z',

  // Tasmania
  'M 878,368 L 886,368 L 892,374 L 888,382 L 880,382 L 876,376 Z',

  // New Zealand (North Island)
  'M 940,362 L 952,360 L 958,368 L 956,376 L 950,380 L 943,376 L 940,370 Z',

  // New Zealand (South Island)
  'M 936,384 L 946,382 L 954,390 L 952,400 L 944,404 L 936,400 L 934,392 Z',

  // Antarctica (thin strip across the bottom \u2014 clipped to viewBox
  // so pins near the equator never look off-center).
  'M 40,470 L 100,468 L 180,466 L 260,464 L 340,462 L 420,460 L 500,458 L 580,458 L 660,460 L 740,462 L 820,464 L 900,466 L 960,468 L 960,485 L 40,485 Z'
];

// Serializes the continent paths into a single SVG string so the picker
// can drop it into innerHTML in one shot. Uses currentColor for the fill
// so the CSS controls the exact tone via .ob-map-land.
function _obWorldMapSvgInner() {
  return OB_WORLD_MAP_PATHS.map(function (d) {
    return '<path class="ob-map-land" d="' + d + '" />';
  }).join('');
}

// Emits latitude + longitude gridlines every 30\u00b0 (plus the equator
// at 0\u00b0 as a slightly stronger line). This is what turns the shape
// into a legible map instead of a floating stipple of blobs \u2014 the
// eye needs the graticule to anchor scale and orientation.
function _obWorldMapGraticule() {
  const parts = [];
  // Meridians (vertical): every 30\u00b0 of longitude from -180 to +180.
  for (let lon = -150; lon <= 150; lon += 30) {
    const x = ((lon + 180) / 360) * 1000;
    parts.push('<line class="ob-map-grid" x1="' + x.toFixed(1) + '" y1="0" x2="' + x.toFixed(1) + '" y2="500" />');
  }
  // Parallels (horizontal): every 30\u00b0 of latitude from -60 to +60,
  // plus the equator at 0\u00b0 rendered slightly stronger.
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * 500;
    const cls = lat === 0 ? 'ob-map-grid ob-map-grid-equator' : 'ob-map-grid';
    parts.push('<line class="' + cls + '" x1="0" y1="' + y.toFixed(1) + '" x2="1000" y2="' + y.toFixed(1) + '" />');
  }
  return parts.join('');
}

// --- Picker state (module-scoped, non-persistent) ---
//
// Kept out of _obState because it's specific to this one step and would
// pollute the shared object. Reset every time _obRenderLocationPicker
// mounts a fresh Q6.
let _obLocationPicker = null;

function _obRenderLocationPicker(opts) {
  const host = opts.host;
  const initial = Array.isArray(opts.initial) ? opts.initial.slice() : [];

  // Tear down any previously-registered outside-click handler before we
  // create a fresh picker. Q6 can re-mount when the user navigates back
  // from Q5 or reloads mid-flow \u2014 without this, listeners would
  // stack on document and fire against stale DOM.
  if (_obLocationPicker && _obLocationPicker.outsideHandler) {
    document.removeEventListener('click', _obLocationPicker.outsideHandler);
    _obLocationPicker.outsideHandler = null;
  }

  _obLocationPicker = {
    entries: _obNormalizeLocations(initial),
    // Country selected in the dropdown but not yet committed as an
    // entry. Cleared on Add and on picking a different country.
    pendingCountry: '',
    // City draft value bound to the input. Cleared on Add.
    pendingCity: '',
    // Whether the dropdown menu is open. Closes on outside click and
    // on Escape.
    dropdownOpen: false,
    // Live filter typed into the dropdown's search field.
    dropdownFilter: '',
    // "country||city" identifier for the entry that was just added, so
    // _obLocRenderGlobe can spotlight it with the intro animation. Kept
    // separate from the entries array so index changes (e.g. from
    // removals) don't accidentally trigger a re-highlight.
    justAddedKey: '',
    // Bound outside-click handler so we can detach on re-render.
    outsideHandler: null
  };

  host.innerHTML = ''
    + '<div class="ob-loc-picker" id="obLocPicker">'
    +   '<div class="ob-loc-form">'
    +     '<div class="ob-loc-dropdown" id="obLocDropdown">'
    +       '<button type="button" class="ob-loc-dropdown-btn" id="obLocDropdownBtn" aria-haspopup="listbox" aria-expanded="false">'
    +         '<span class="ob-loc-dropdown-label" id="obLocDropdownLabel">Choose a country</span>'
    +         '<span class="ob-loc-dropdown-caret" aria-hidden="true">\u25be</span>'
    +       '</button>'
    +       '<div class="ob-loc-dropdown-menu" id="obLocDropdownMenu" role="listbox" hidden>'
    +         '<div class="ob-loc-dropdown-search-wrap">'
    +           '<svg class="ob-loc-dropdown-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    +             '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
    +           '</svg>'
    +           '<input type="text" class="ob-loc-dropdown-search" id="obLocDropdownSearch" placeholder="Search countries\u2026" autocomplete="off" />'
    +         '</div>'
    +         '<div class="ob-loc-dropdown-list" id="obLocDropdownList" role="presentation"></div>'
    +       '</div>'
    +     '</div>'
    +     '<div class="ob-loc-city-row" id="obLocCityRow" hidden>'
    +       '<input type="text" class="ob-loc-city-input" id="obLocCityInput" placeholder="City" autocomplete="off" />'
    +       '<button type="button" class="ob-loc-add-btn" id="obLocAddBtn" disabled>Add</button>'
    +     '</div>'
    +     '<div class="ob-loc-city-suggestions" id="obLocCitySuggestions" hidden></div>'
    +   '</div>'
    +   '<div class="ob-loc-tags" id="obLocTags" aria-live="polite"></div>'
    +   '<div class="ob-loc-globe-wrap">'
    +     '<svg class="ob-loc-globe" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
    +       '<defs>'
    +         '<radialGradient id="obGlobePinGlow" cx="50%" cy="50%" r="50%">'
    +           '<stop offset="0%" stop-color="rgba(245, 166, 35, 0.55)" />'
    +           '<stop offset="100%" stop-color="rgba(245, 166, 35, 0)" />'
    +         '</radialGradient>'
    +         '<linearGradient id="obGlobeOcean" x1="0%" y1="0%" x2="0%" y2="100%">'
    +           '<stop offset="0%"   stop-color="#100d09" />'
    +           '<stop offset="45%"  stop-color="#0d0a07" />'
    +           '<stop offset="100%" stop-color="#080604" />'
    +         '</linearGradient>'
    +         '<radialGradient id="obGlobeVignette" cx="50%" cy="50%" r="70%">'
    +           '<stop offset="60%"  stop-color="rgba(0,0,0,0)" />'
    +           '<stop offset="100%" stop-color="rgba(0,0,0,0.55)" />'
    +         '</radialGradient>'
    +       '</defs>'
    +       '<rect class="ob-map-ocean" x="0" y="0" width="1000" height="500" fill="url(#obGlobeOcean)" />'
    +       '<g class="ob-map-graticule">' + _obWorldMapGraticule() + '</g>'
    +       '<g class="ob-map-lands">' + _obWorldMapSvgInner() + '</g>'
    +       '<rect class="ob-map-vignette" x="0" y="0" width="1000" height="500" fill="url(#obGlobeVignette)" pointer-events="none" />'
    +       '<g class="ob-map-lines" id="obMapLines"></g>'
    +       '<g class="ob-map-pins"  id="obMapPins"></g>'
    +     '</svg>'
    +     '<div class="ob-loc-globe-hint" id="obLocGlobeHint">Add a location to see it appear on the map.</div>'
    +   '</div>'
    +   '<button type="button" class="ob-continue-btn" id="obContinueBtn" disabled>Continue \u2192</button>'
    + '</div>';

  _obLocRenderDropdownList();
  _obLocRenderTags();
  _obLocRenderGlobe();
  _obLocRenderCitySuggestions();
  _obLocSyncContinueBtn();
  _obLocBindEvents(opts.onCommit);
}

// Repaints just the country list inside the dropdown menu. Called on
// initial mount and whenever the search filter changes. Menu open/close
// state is untouched.
function _obLocRenderDropdownList() {
  const listEl = document.getElementById('obLocDropdownList');
  if (!listEl) return;
  const filter = String(_obLocationPicker.dropdownFilter || '').trim().toLowerCase();
  const matches = filter
    ? OB_COUNTRIES.filter(function (c) { return c.name.toLowerCase().indexOf(filter) !== -1; })
    : OB_COUNTRIES.slice();
  if (matches.length === 0) {
    listEl.innerHTML = '<div class="ob-loc-dropdown-empty">No matches</div>';
    return;
  }
  const active = _obLocationPicker.pendingCountry;
  listEl.innerHTML = matches.map(function (c) {
    const isActive = c.name === active;
    return '<button type="button" class="ob-loc-dropdown-item' + (isActive ? ' ob-loc-dropdown-item-active' : '') + '" data-name="' + _escape(c.name) + '" role="option">'
      + _escape(c.name)
      + '</button>';
  }).join('');
}

// Repaints the removable-tag row that sits below the form. Empty state
// renders nothing (the container simply has no children so the map
// hint copy shifts up).
function _obLocRenderTags() {
  const tagsEl = document.getElementById('obLocTags');
  if (!tagsEl) return;
  const entries = _obLocationPicker.entries;
  if (entries.length === 0) {
    tagsEl.innerHTML = '';
    return;
  }
  tagsEl.innerHTML = entries.map(function (entry, i) {
    const city = (entry.city || '').trim();
    const country = (entry.country || '').trim();
    const label = city && country ? city + ', ' + country : (city || country);
    return '<span class="ob-loc-tag" data-idx="' + i + '">'
      +   '<span class="ob-loc-tag-label">' + _escape(label) + '</span>'
      +   '<button type="button" class="ob-loc-tag-remove" data-idx="' + i + '" aria-label="Remove ' + _escape(label) + '">\u00d7</button>'
      + '</span>';
  }).join('');
}

// Renders the amber pin cluster and the polyline connecting them in
// commit order. Pins whose lat/lng can't be resolved are skipped
// entirely rather than crashing the SVG. The polyline is only drawn
// when there are at least 2 resolvable points.
function _obLocRenderGlobe() {
  const pinsEl  = document.getElementById('obMapPins');
  const linesEl = document.getElementById('obMapLines');
  const hintEl  = document.getElementById('obLocGlobeHint');
  if (!pinsEl || !linesEl) return;

  const entries = _obLocationPicker.entries;
  const justAddedKey = _obLocationPicker.justAddedKey || '';
  const points = [];
  for (let i = 0; i < entries.length; i++) {
    const ll = _obResolveLatLng(entries[i]);
    if (!ll) continue;
    const xy = _obProjectLatLng(ll.lat, ll.lng);
    const country = String(entries[i].country || '').trim();
    const city = String(entries[i].city || '').trim();
    const key = country + '||' + city;
    points.push({
      x: xy.x,
      y: xy.y,
      city: city,
      country: country,
      isNew: key === justAddedKey
    });
  }

  if (points.length >= 2) {
    const polylinePoints = points.map(function (p) { return p.x + ',' + p.y; }).join(' ');
    linesEl.innerHTML = '<polyline class="ob-map-line" points="' + polylinePoints + '" />';
  } else {
    linesEl.innerHTML = '';
  }

  pinsEl.innerHTML = points.map(function (p) {
    const cls = 'ob-map-pin' + (p.isNew ? ' ob-map-pin-new' : '');
    // Labels are only rendered for the just-added pin \u2014 anything
    // else would crowd the map on multi-city selections. The label is
    // positioned above the pin with a small pointer offset.
    const label = p.isNew && p.city
      ? '<g class="ob-map-pin-label" transform="translate(0, -14)">'
      +   '<rect x="-30" y="-12" width="60" height="16" rx="8" ry="8" />'
      +   '<text x="0" y="0" text-anchor="middle">' + _escape(p.city) + '</text>'
      + '</g>'
      : '';
    return ''
      + '<g class="' + cls + '" transform="translate(' + p.x.toFixed(2) + ', ' + p.y.toFixed(2) + ')">'
      +   '<circle class="ob-map-pin-glow" r="14" fill="url(#obGlobePinGlow)" />'
      +   (p.isNew ? '<circle class="ob-map-pin-halo" r="22" />' : '')
      +   '<circle class="ob-map-pin-dot"  r="4.5" />'
      +   '<circle class="ob-map-pin-ring" r="7.5" />'
      +   label
      + '</g>';
  }).join('');

  // Clear the "just-added" flag once its animation has been rendered
  // so subsequent re-renders (e.g. from a tag removal on a different
  // entry) don't replay the spotlight on this pin. The CSS animation
  // continues playing out on the DOM node we already inserted.
  _obLocationPicker.justAddedKey = '';

  if (hintEl) {
    if (points.length === 0) hintEl.removeAttribute('hidden');
    else hintEl.setAttribute('hidden', '');
  }
}

// City suggestions appear once a country is picked so users can commit
// a "Karachi" or "Berlin" in one tap without typing.
function _obLocRenderCitySuggestions() {
  const wrap = document.getElementById('obLocCitySuggestions');
  if (!wrap) return;
  const name = _obLocationPicker.pendingCountry;
  if (!name) { wrap.setAttribute('hidden', ''); wrap.innerHTML = ''; return; }
  const country = _obFindCountry(name);
  if (!country || !country.cities || country.cities.length === 0) {
    wrap.setAttribute('hidden', ''); wrap.innerHTML = ''; return;
  }
  wrap.removeAttribute('hidden');
  wrap.innerHTML = '<div class="ob-loc-city-suggestions-label">Popular cities</div>'
    + '<div class="ob-loc-city-suggestions-row">'
    + country.cities.map(function (c) {
        return '<button type="button" class="ob-loc-city-suggestion" data-city="' + _escape(c.name) + '">' + _escape(c.name) + '</button>';
      }).join('')
    + '</div>';
}

function _obLocSyncContinueBtn() {
  const btn = document.getElementById('obContinueBtn');
  if (!btn) return;
  btn.disabled = _obLocationPicker.entries.length === 0;
}

function _obLocSyncAddBtn() {
  const btn = document.getElementById('obLocAddBtn');
  if (!btn) return;
  const hasCountry = !!_obLocationPicker.pendingCountry;
  const hasCity = !!String(_obLocationPicker.pendingCity || '').trim();
  btn.disabled = !(hasCountry && hasCity);
}

// Adds the current draft (pendingCountry + pendingCity) to the entries
// list, guarding against duplicates. Clears the city input but keeps
// the country selected so users can quickly add multiple cities in the
// same country.
function _obLocAddEntry() {
  const country = String(_obLocationPicker.pendingCountry || '').trim();
  const city = String(_obLocationPicker.pendingCity || '').trim();
  if (!country || !city) return;
  const merged = _obNormalizeLocations(
    _obLocationPicker.entries.concat([{ country: country, city: city }])
  );
  _obLocationPicker.entries = merged;
  _obLocationPicker.pendingCity = '';
  // Flag which entry was just committed so _obLocRenderGlobe can add
  // the ob-map-pin-new class for the one-shot spotlight animation.
  _obLocationPicker.justAddedKey = country + '||' + city;

  const cityInput = document.getElementById('obLocCityInput');
  if (cityInput) {
    cityInput.value = '';
    setTimeout(function () { cityInput.focus(); }, 0);
  }
  _obLocSyncAddBtn();
  _obLocRenderTags();
  _obLocRenderGlobe();
  _obLocSyncContinueBtn();
}

function _obLocRemoveEntry(idx) {
  if (idx < 0 || idx >= _obLocationPicker.entries.length) return;
  _obLocationPicker.entries.splice(idx, 1);
  _obLocRenderTags();
  _obLocRenderGlobe();
  _obLocSyncContinueBtn();
}

function _obLocSelectCountry(name) {
  const country = _obFindCountry(name);
  if (!country) return;
  _obLocationPicker.pendingCountry = country.name;
  _obLocationPicker.dropdownOpen = false;
  _obLocationPicker.dropdownFilter = '';
  const menu = document.getElementById('obLocDropdownMenu');
  const btn = document.getElementById('obLocDropdownBtn');
  const label = document.getElementById('obLocDropdownLabel');
  const cityRow = document.getElementById('obLocCityRow');
  if (menu) menu.setAttribute('hidden', '');
  if (btn)  btn.setAttribute('aria-expanded', 'false');
  if (label) label.textContent = country.name;
  if (cityRow) cityRow.removeAttribute('hidden');
  const search = document.getElementById('obLocDropdownSearch');
  if (search) search.value = '';
  _obLocRenderDropdownList();
  _obLocRenderCitySuggestions();
  _obLocSyncAddBtn();
  const cityInput = document.getElementById('obLocCityInput');
  if (cityInput) setTimeout(function () { cityInput.focus(); }, 0);
}

// Wires up all interactive elements. Called once per picker mount;
// listeners are attached to the newly-rendered nodes and torn down
// implicitly when _obRenderStep replaces the entire ob-answer subtree.
function _obLocBindEvents(onCommit) {
  const btn = document.getElementById('obLocDropdownBtn');
  const menu = document.getElementById('obLocDropdownMenu');
  const search = document.getElementById('obLocDropdownSearch');
  const list = document.getElementById('obLocDropdownList');
  const cityInput = document.getElementById('obLocCityInput');
  const addBtn = document.getElementById('obLocAddBtn');
  const tags = document.getElementById('obLocTags');
  const suggestions = document.getElementById('obLocCitySuggestions');
  const continueBtn = document.getElementById('obContinueBtn');
  const picker = document.getElementById('obLocPicker');

  if (btn && menu) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = !_obLocationPicker.dropdownOpen;
      _obLocationPicker.dropdownOpen = open;
      if (open) {
        menu.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
        if (search) setTimeout(function () { search.focus(); }, 0);
      } else {
        menu.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (search) {
    search.addEventListener('input', function () {
      _obLocationPicker.dropdownFilter = search.value;
      _obLocRenderDropdownList();
    });
    search.addEventListener('keydown', function (e) {
      // Enter on the search field picks the first visible result so
      // typing "berl<Enter>" quickly lands on Germany.
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = list ? list.querySelector('.ob-loc-dropdown-item') : null;
        if (first) _obLocSelectCountry(first.getAttribute('data-name'));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        _obLocationPicker.dropdownOpen = false;
        if (menu) menu.setAttribute('hidden', '');
        if (btn)  btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (list) {
    list.addEventListener('click', function (e) {
      const target = e.target.closest('.ob-loc-dropdown-item');
      if (!target) return;
      _obLocSelectCountry(target.getAttribute('data-name'));
    });
  }

  if (cityInput) {
    cityInput.addEventListener('input', function () {
      _obLocationPicker.pendingCity = cityInput.value;
      _obLocSyncAddBtn();
    });
    cityInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        _obLocAddEntry();
      }
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', function () { _obLocAddEntry(); });
  }

  if (tags) {
    tags.addEventListener('click', function (e) {
      const removeBtn = e.target.closest('.ob-loc-tag-remove');
      if (!removeBtn) return;
      const idx = parseInt(removeBtn.getAttribute('data-idx'), 10);
      if (!isNaN(idx)) _obLocRemoveEntry(idx);
    });
  }

  if (suggestions) {
    suggestions.addEventListener('click', function (e) {
      const btnEl = e.target.closest('.ob-loc-city-suggestion');
      if (!btnEl) return;
      const city = btnEl.getAttribute('data-city');
      if (!city) return;
      _obLocationPicker.pendingCity = city;
      if (cityInput) cityInput.value = city;
      _obLocSyncAddBtn();
      _obLocAddEntry();
    });
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', function () {
      if (_obState.transitioning) return;
      const entries = _obLocationPicker.entries.slice();
      if (entries.length === 0) return;
      _obState.transitioning = true;
      setTimeout(function () {
        _obState.transitioning = false;
        if (typeof onCommit === 'function') onCommit(entries);
      }, 200);
    });
  }

  // Outside-click closes the dropdown. Scoped to the picker element so
  // clicks on unrelated UI (should be none while onboarding is visible)
  // don't accidentally trigger anything else.
  const outside = function (e) {
    if (!_obLocationPicker || !_obLocationPicker.dropdownOpen) return;
    const dd = document.getElementById('obLocDropdown');
    if (dd && dd.contains(e.target)) return;
    _obLocationPicker.dropdownOpen = false;
    if (menu) menu.setAttribute('hidden', '');
    if (btn)  btn.setAttribute('aria-expanded', 'false');
  };
  _obLocationPicker.outsideHandler = outside;
  if (picker) picker.addEventListener('click', function () { /* keeps clicks inside picker from bubbling to document-level closers */ });
  document.addEventListener('click', outside);
}

window.renderOnboardingModal = renderOnboardingModal;
