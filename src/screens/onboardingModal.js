// ---------------------------------------------
// Clarity 2.0 \u2014 Onboarding Modal
// ---------------------------------------------
//
// A polished modal-style flow that walks the user through 7 questions
// (business name + Q1\u2013Q6). Replaces the old chat-embedded onboarding
// overlay entirely. Structure:
//
//   [ backdrop ]                    <- dark blur, fixed inset 0
//     [ modal ]                     <- 480px, centered, warm surface
//       C logo (36px, amber grad)
//       progress bar (7 segments filling)
//       "Step X of 7" + optional "\u2190 Back"
//       question (20/700)
//       subtitle (13/muted)
//       answer area (chips / textarea)
//       (continue button for multi + free text)
//
// The state machine is local to this file. Answers persist to
// appState.business as each step commits. On the final step's continue,
// the thinking state plays for 3s and then the overlay closes onto
// Overview (concept.chat.onboardingComplete = true).
//
// Not a chat. No message log, no thinking bubbles, no scroll. One
// question fades to the next.

// ---------------------------------------------
// Step config
// ---------------------------------------------
//
// stepIndex drives the progress bar. Sub-steps (q1_other) share the
// index of their parent so progress doesn't jump around when Clara
// asks the "Other" follow-up.
const OB_STEP_ORDER = ['name', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
const OB_TOTAL_STEPS = OB_STEP_ORDER.length;

// Per-step subtitle copy. Q1\u2013Q6 come from the user's spec verbatim;
// the name step gets one that matches the same tone.
const OB_SUBTITLES = {
  name:     'This is how your workspace will appear in the sidebar. You can rename it later.',
  q1:       'This helps Clara understand how to position your business.',
  q1_other: 'A quick description of what you do helps Clara tailor her suggestions.',
  q2:       'Clara will prioritise suggestions around this goal.',
  q3:       'Be as specific as you can. The more detail the better.',
  q4:       'Select everything that applies right now.',
  q5:       'This helps Clara know what kinds of suggestions to make.',
  q6:       'City or country is enough.'
};

// Per-step question text \u2014 pulled from responses.js so wording changes
// there flow through without extra edits here.
function _obQuestionCopy(step) {
  switch (step) {
    case 'name':     return 'What are you calling this business?';
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
  currentStep: 'name',
  // Snapshot of the multi-select selection between clicks so we can
  // toggle without hitting appState on every keystroke.
  channelsDraft: [],
  // Locks the modal while an animated transition or thinking timer is
  // active so double-clicks can't skip ahead.
  transitioning: false
};

// ---------------------------------------------
// Entry: mount the modal into a host element
// ---------------------------------------------

function renderOnboardingModal(host) {
  if (!host) return;

  // Resume mid-flow: honor the concept's persisted onboardingStep so a
  // reload doesn't dump the user back at "name" if they were on q4.
  // Anything unknown to this modal (or a post-onboarding state) resets
  // to 'name' \u2014 belt-and-braces, since the router only mounts this
  // modal for incomplete concepts.
  const chat = getChat();
  const persistedStep = chat && chat.onboardingStep;
  if (_obKnownStep(persistedStep)) {
    _obState.currentStep = persistedStep;
  } else {
    _obState.currentStep = 'name';
  }

  // Prime the multi-select draft from any prior save so users returning
  // to Q4 see their previous picks.
  const business = getBusiness();
  _obState.channelsDraft = Array.isArray(business.channels) ? business.channels.slice() : [];
  _obState.transitioning = false;

  host.innerHTML = `
    <div class="ob-backdrop" id="obBackdrop">
      <div class="ob-modal" id="obModal" role="dialog" aria-modal="true" aria-labelledby="obQuestion">
        <div class="ob-modal-logo" aria-hidden="true">C</div>
        <div class="ob-progress-bar" aria-hidden="true">
          <div class="ob-progress-fill" id="obProgressFill"></div>
        </div>
        <div class="ob-progress-row">
          <button type="button" class="ob-back-link" id="obBackBtn">\u2190 Back</button>
          <div class="ob-step-counter" id="obStepCounter"></div>
        </div>
        <div class="ob-content" id="obContent"></div>
      </div>
    </div>
  `;

  _obRenderStep();
  _obBindBackdrop();
}

function _obKnownStep(step) {
  return step === 'name'
      || step === 'q1' || step === 'q1_other'
      || step === 'q2' || step === 'q3'
      || step === 'q4' || step === 'q5' || step === 'q6';
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
  const question = _obQuestionCopy(step);
  const subtitle = OB_SUBTITLES[step] || '';

  content.innerHTML = `
    <h2 class="ob-question" id="obQuestion">${_escape(question)}</h2>
    <p class="ob-subtitle">${_escape(subtitle)}</p>
    <div class="ob-answer" id="obAnswer"></div>
  `;

  _obRenderAnswer(step);
  // Small stagger so the answer area animates in a beat after the
  // heading, feels less mechanical than one instant swap.
  const answer = document.getElementById('obAnswer');
  if (answer) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { answer.classList.add('ob-answer-in'); });
    });
  }
}

function _obUpdateProgress() {
  const fill = document.getElementById('obProgressFill');
  if (!fill) return;
  const step = _obState.currentStep;
  // While building we want the bar at 100% and pulsing. Otherwise show
  // (currentStepIndex + 1) / TOTAL so answering step 1 immediately
  // fills the first segment.
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
    counter.textContent = 'Building your workspace';
    return;
  }
  const idx = _obStepIndex(step);
  counter.textContent = 'Step ' + (idx + 1) + ' of ' + OB_TOTAL_STEPS;
}

function _obUpdateBackButton() {
  const back = document.getElementById('obBackBtn');
  if (!back) return;
  const step = _obState.currentStep;
  const idx = _obStepIndex(step);
  // Hidden on step 1 (name), during Q1's "Other" follow-up (Back should
  // return to Q1 chips, handled below), during building, or during a
  // transition.
  const hidden = step === 'name' || step === 'building' || step === 'done';
  back.style.visibility = hidden ? 'hidden' : 'visible';
}

// ---------------------------------------------
// Answer renderers per step
// ---------------------------------------------

function _obRenderAnswer(step) {
  const host = document.getElementById('obAnswer');
  if (!host) return;

  switch (step) {
    case 'name':
      _obRenderTextInput({
        host: host,
        placeholder: CL_NAME_PLACEHOLDER,
        minChars: 2,
        initialValue: (getBusiness().name || '').trim(),
        singleLine: true,
        onCommit: _obHandleName
      });
      break;

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
        singleLine: false,
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
        singleLine: false,
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
        singleLine: true,
        onCommit: _obHandleQ6
      });
      break;

    case 'building':
      _obRenderThinking(host);
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

  opts.host.innerHTML = '<div class="ob-chips">' + chipsHtml + '</div>';

  opts.host.querySelectorAll('.ob-chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (_obState.transitioning) return;
      const label = btn.getAttribute('data-label');
      // Visual selection immediately so the tap has feedback while the
      // 300ms auto-advance timer runs.
      opts.host.querySelectorAll('.ob-chip').forEach(function (c) {
        c.classList.remove('ob-chip-selected');
      });
      btn.classList.add('ob-chip-selected');
      _obState.transitioning = true;
      setTimeout(function () {
        _obState.transitioning = false;
        if (typeof opts.onPick === 'function') opts.onPick(label);
      }, 300);
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
      + '<div class="ob-chips">' + chipsHtml + '</div>'
      + '<button type="button" class="ob-continue-btn ' + (canContinue ? 'ob-continue-btn-active' : 'ob-continue-btn-disabled') + '" id="obContinueBtn" ' + (canContinue ? '' : 'disabled') + '>'
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
        // semantic used by the chat flow).
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

// --- Free-text input ---

function _obRenderTextInput(opts) {
  const placeholder = opts.placeholder || '';
  const minChars = opts.minChars || 0;
  const singleLine = !!opts.singleLine;
  const initial = opts.initialValue || '';

  const inputTag = singleLine
    ? '<textarea class="ob-textarea ob-textarea-short" id="obInput" rows="1" placeholder="' + _escape(placeholder) + '">' + _escape(initial) + '</textarea>'
    : '<textarea class="ob-textarea" id="obInput" rows="3" placeholder="' + _escape(placeholder) + '">' + _escape(initial) + '</textarea>';

  opts.host.innerHTML = ''
    + inputTag
    + '<button type="button" class="ob-continue-btn ob-continue-btn-disabled" id="obContinueBtn" disabled>Continue \u2192</button>';

  const input = document.getElementById('obInput');
  const btn = document.getElementById('obContinueBtn');
  if (!input || !btn) return;

  function _syncButton() {
    const ok = input.value.trim().length >= minChars;
    btn.disabled = !ok;
    btn.classList.toggle('ob-continue-btn-active', ok);
    btn.classList.toggle('ob-continue-btn-disabled', !ok);
  }

  input.addEventListener('input', function () {
    _syncButton();
    // Auto-grow the multi-line textarea within a reasonable cap.
    if (!singleLine) {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    }
  });

  input.addEventListener('keydown', function (e) {
    // Enter commits when the min-char threshold is met. Shift+Enter
    // still inserts a newline for multi-line fields.
    if (e.key !== 'Enter') return;
    if (!singleLine && e.shiftKey) return;
    e.preventDefault();
    if (input.value.trim().length < minChars) return;
    btn.click();
  });

  btn.addEventListener('click', function () {
    if (_obState.transitioning) return;
    const value = input.value.trim();
    if (value.length < minChars) return;
    _obState.transitioning = true;
    setTimeout(function () {
      _obState.transitioning = false;
      if (typeof opts.onCommit === 'function') opts.onCommit(value);
    }, 200);
  });

  _syncButton();
  // Focus after mount so keyboard flow feels natural. Small timeout to
  // avoid contention with the fade-in animation.
  setTimeout(function () { input.focus(); }, 320);
}

// --- Thinking state ---

function _obRenderThinking(host) {
  host.innerHTML = ''
    + '<div class="ob-thinking">'
    +   '<div class="ob-thinking-label">Clara is building your workspace.</div>'
    +   '<div class="ob-thinking-dots">'
    +     '<span class="ob-thinking-dot"></span>'
    +     '<span class="ob-thinking-dot"></span>'
    +     '<span class="ob-thinking-dot"></span>'
    +   '</div>'
    + '</div>';
}

// ---------------------------------------------
// Answer handlers \u2014 commit to state, advance step
// ---------------------------------------------

function _obHandleName(name) {
  const b = getBusiness();
  b.name = name;
  _saveState();
  // Live-update the sidebar concept row so existing users mid-flow
  // see their new concept's name populate as it commits. First-time
  // users don't have a sidebar yet \u2014 skip the sync in that case
  // (otherwise _syncSidebar would MOUNT one behind the backdrop).
  if (typeof _syncSidebar === 'function' && document.getElementById('sbSidebar')) {
    _syncSidebar();
  }
  _obGoNext('q1');
}

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
  // Reach inference (local / online / mixed) is kept alongside the raw
  // channels list so the rest of the app can key off business.reach.
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

function _obGoBack() {
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
    case 'q1':       return 'name';
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

// Animated fade between two step contents. The C logo and progress
// bar stay put; only the content div fades.
function _obTransitionTo(nextStep) {
  const content = document.getElementById('obContent');
  if (!content) {
    _obState.currentStep = nextStep;
    _obRenderStep();
    return;
  }
  content.classList.add('ob-content-out');
  _obState.transitioning = true;
  setTimeout(function () {
    _obState.currentStep = nextStep;
    _obRenderStep();
    // Force reflow so the following class add re-triggers the
    // transition rather than being coalesced away.
    void content.offsetWidth;
    content.classList.remove('ob-content-out');
    _obState.transitioning = false;
  }, 200);
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
  // Progress bar to 100% + pulse handled by _obUpdateProgress via the
  // 'building' branch (called from _obRenderStep).
  setTimeout(_obCompleteFlow, 3000);
}

function _obCompleteFlow() {
  const chat = getChat();
  if (!chat) return;
  chat.onboardingComplete = true;
  chat.onboardingStep = 'done';
  // Post-completion: same behavior as the old chat.js completion path
  // \u2014 seed one Clara message into the Chat nav history so the first
  // visit to Chat isn't an empty state.
  chat.messages.push({
    role: 'clara',
    text: "Your workspace is ready. I'll be here in the Chat tab whenever you want to talk."
  });
  // Legacy flag consumed by the old concept header (harmless now).
  window._justUnlockedConcept = true;

  appState.activeView = 'overview';
  appState.onboardingOverlayOpen = false;
  _saveState();

  // Fade the modal out before re-rendering into the dashboard shell.
  const backdrop = document.getElementById('obBackdrop');
  if (backdrop) backdrop.classList.add('ob-backdrop-out');
  setTimeout(function () {
    renderApp();
  }, 220);
}

// ---------------------------------------------
// Backdrop \u2014 clicks do NOTHING (user must complete onboarding).
// The listener is here anyway so we can add subtle visual feedback if
// we ever want to (e.g. a soft shake).
// ---------------------------------------------

function _obBindBackdrop() {
  const backdrop = document.getElementById('obBackdrop');
  if (!backdrop) return;
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) {
      // No-op by spec. If we ever want to nudge, uncomment:
      // backdrop.classList.remove('ob-backdrop-nudge');
      // void backdrop.offsetWidth;
      // backdrop.classList.add('ob-backdrop-nudge');
    }
  });

  const back = document.getElementById('obBackBtn');
  if (back) back.addEventListener('click', _obGoBack);
}

// ---------------------------------------------
// Small helpers (label \u2194 machine-key reverse lookups)
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
