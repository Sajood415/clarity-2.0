// ---------------------------------------------
// Clarity 2.0 — Onboarding (full-screen Typeform-style)
// ---------------------------------------------
//
// A single full-viewport page (not a modal) that walks the user through
// Clara's 6 questions. Structure:
//
//   [ ob-fullscreen ]                fixed inset 0, warm radial bg, z 400
//     [ ob-topbar ]                  56px row: Clarity | progress | X of 6
//     [ ob-content ]                 flex-1, centered column, max 640
//       C avatar (32px, amber grad)
//       question (28/700, centered)
//       subtitle (15/muted, centered)
//       ob-answer                    chips / textarea / continue
//     [ ob-back-link ]               fixed bottom-left "← Back"
//
// Six questions:
//   Q1 (single-select), Q2 (single-select), Q3 (free text),
//   Q4 (multi-select),  Q5 (single-select), Q6 (free text).
//
// Q1 has one branch: picking "Other" routes through q1_other (a
// free-text follow-up) before Q2. That sub-step's progress index
// collapses onto Q1's slot so the bar doesn't jump backwards.
//
// State machine + widget renderers are local to this file. Each answer
// commits to appState.business, then _obGoNext(...) fades the content
// area out and the next step's content back in. After Q6 the "building"
// state plays for 3s and the screen fades out onto the Overview view.

// ---------------------------------------------
// Step config
// ---------------------------------------------

// The six ordered steps that drive the progress bar. Sub-steps
// (q1_other) share the index of their parent so progress doesn't
// jump around when Clara asks the "Other" follow-up.
const OB_STEP_ORDER = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
const OB_TOTAL_STEPS = OB_STEP_ORDER.length;

// Per-step subtitle copy. q1_other is a sub-step, not a numbered
// question, so it gets its own line rather than reusing Q1's.
const OB_SUBTITLES = {
  q1:       'This helps Clara understand how to position your business.',
  q1_other: 'A quick description of what you do helps Clara tailor her suggestions.',
  q2:       'Clara will prioritise suggestions around this goal.',
  q3:       'Be as specific as you can. The more detail the better.',
  q4:       'Select everything that applies right now.',
  q5:       'This helps Clara know what kinds of suggestions to make.',
  q6:       'City or country is enough.'
};

// Per-step question text — pulled from responses.js so wording changes
// there flow through without extra edits here.
function _obQuestionCopy(step) {
  switch (step) {
    case 'q1':       return CL_Q1_QUESTION;
    case 'q1_other': return CL_Q1_OTHER_QUESTION;
    case 'q2':       return CL_Q2_QUESTION;
    case 'q3':       return CL_Q3_QUESTION;
    case 'q4':       return CL_Q4_QUESTION;
    case 'q5':       return CL_Q5_QUESTION;
    case 'q6':       return CL_Q6_QUESTION;
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
  keyHandler: null
};

function _obKnownStep(step) {
  return step === 'q1' || step === 'q1_other'
      || step === 'q2' || step === 'q3'
      || step === 'q4' || step === 'q5' || step === 'q6';
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
  // "Building" fills the bar completely and adds a soft pulse. All
  // other steps show (currentStep + 1) / 6.
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
  const idx = _obStepIndex(step);
  counter.textContent = (idx + 1) + ' of ' + OB_TOTAL_STEPS;
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
      _obRenderTextInput({
        host: host,
        placeholder: CL_Q6_PLACEHOLDER,
        minChars: 2,
        initialValue: (getBusiness().location || '').trim(),
        multiLine: false,
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
    // Auto-grow the multi-line textarea within a reasonable cap.
    if (multiLine) {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 220) + 'px';
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

function _obHandleQ1(label) {
  const b = getBusiness();
  const key = CL_Q1_TYPE_MAP[label] || 'other';
  b.type = key;
  _saveState();
  if (key === 'other') _obGoNext('q1_other');
  else _obGoNext('q2');
}

function _obHandleQ1Other(text) {
  const b = getBusiness();
  b.product = text;
  _saveState();
  _obGoNext('q2');
}

function _obHandleQ2(label) {
  const b = getBusiness();
  b.goal = label;
  _saveState();
  _obGoNext('q3');
}

function _obHandleQ3(text) {
  const b = getBusiness();
  b.customer = text;
  _saveState();
  _obGoNext('q4');
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
  _obGoNext('q5');
}

function _obHandleQ5(label) {
  const b = getBusiness();
  b.budget = CL_Q5_BUDGET_MAP[label] || 'unknown';
  _saveState();
  _obGoNext('q6');
}

function _obHandleQ6(text) {
  const b = getBusiness();
  b.location = text;
  _saveState();
  _obStartBuilding();
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
    case 'q2':       return _obPreviousQ2Origin();
    case 'q3':       return 'q2';
    case 'q4':       return 'q3';
    case 'q5':       return 'q4';
    case 'q6':       return 'q5';
    default:         return null;
  }
}

// Q2 can be arrived at from either q1 (any non-other type) or q1_other.
// Rewind honors the actual path the user took, keyed off business.type.
function _obPreviousQ2Origin() {
  const t = getBusiness().type;
  return t === 'other' ? 'q1_other' : 'q1';
}

// Animated fade between two step contents. The top bar and back link
// stay put; only the content column translates and cross-fades.
function _obTransitionTo(nextStep) {
  const content = document.getElementById('obContent');
  if (!content) {
    _obState.currentStep = nextStep;
    _obRenderStep();
    return;
  }
  _obState.transitioning = true;
  content.classList.remove('ob-content-in');
  void content.offsetWidth;
  content.classList.add('ob-content-out');
  setTimeout(function () {
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

    // Backspace / Delete goes back when we aren't inside a non-empty
    // text field. The per-input handler also intercepts the empty case
    // so the browser doesn't try to navigate history.
    if (e.key === 'Backspace' || e.key === 'Delete') {
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
  const chat = getChat();
  if (!chat) return;
  chat.onboardingComplete = true;
  chat.onboardingStep = 'done';
  // Post-completion: seed one Clara message into the Chat nav history
  // so the first visit to Chat isn't an empty state.
  chat.messages.push({
    role: 'clara',
    text: "Your workspace is ready. I'll be here in the Chat tab whenever you want to talk."
  });
  // Seed the Tasks board with Clara's GTM suggestions so the new user's
  // first visit to Tasks isn't an empty state. Safe to call more than
  // once — _seedClaraTasksIfMissing bails when items already exist.
  if (typeof window._seedClaraTasksIfMissing === 'function') {
    const active = getActiveConcept();
    if (active) window._seedClaraTasksIfMissing(active);
  }
  // Legacy flag consumed by the old concept header (harmless now).
  window._justUnlockedConcept = true;

  appState.activeView = 'overview';
  appState.onboardingOverlayOpen = false;
  _saveState();

  _obUnbindGlobalKeys();

  // Fade the entire onboarding screen out before the dashboard shell
  // takes over.
  const screen = document.getElementById('obFullscreen');
  if (screen) screen.classList.add('ob-fullscreen-out');
  setTimeout(function () {
    renderApp();
  }, 280);
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

window.renderOnboardingModal = renderOnboardingModal;
