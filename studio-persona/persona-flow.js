/* ============================================================
   PERSONA FLOW  —  IIFE module
   Steps: 1=Who  2=Cares About  3=Trigger  4=Summary
   ============================================================ */
var PersonaFlow = (function () {
  var state;

  var PF_STEPS = ['Who', 'Cares About', 'Trigger', 'Summary'];

  var PF_CARES = [
    'Quality', 'Convenience', 'Price', 'Community',
    'Sustainability', 'Trust', 'Speed', 'Personal Service'
  ];

  /* ---- init ---- */
  function init(s) {
    state = s;
    if (!state.personaFlow) {
      state.personaFlow = { step: 1 };
    }
    if (!state.persona) {
      state.persona = { name: '', ageRange: '', description: '', caresAbout: [], otherTraits: '', trigger: '' };
    }
  }

  function pfFlow() {
    if (!state.personaFlow) state.personaFlow = { step: 1 };
    return state.personaFlow;
  }

  /* ---- Stepper ---- */
  function pfStepper() {
    var step = pfFlow().step;
    var html = '<div class="cf-stepper-wrap"><div class="wizard-steps">';
    PF_STEPS.forEach(function (label, i) {
      var n = i + 1;
      var cls = n < step ? 'done' : (n === step ? 'active' : 'pending');
      html += '<div class="wizard-step" style="flex-direction:column;align-items:center;">'
        + '<div class="wiz-dot ' + cls + '">' + (n < step ? '&#10003;' : n) + '</div>'
        + '<div class="wiz-label">' + label + '</div>'
        + '</div>';
      if (i < PF_STEPS.length - 1) {
        html += '<div class="wiz-line' + (n < step ? ' done' : '') + '"></div>';
      }
    });
    return html + '</div></div>';
  }

  /* ---- Validation ---- */
  function pfCanContinue() {
    var f = pfFlow();
    var p = state.persona;
    if (f.step === 1) return !!(p.name && p.name.trim()) && !!(p.ageRange && p.ageRange.trim()) && !!(p.description && p.description.trim());
    if (f.step === 2) return !!(p.caresAbout && p.caresAbout.length > 0);
    if (f.step === 3) return !!(p.trigger && p.trigger.trim());
    return false;
  }

  /* ---- Initials from name ---- */
  function pfInitials(name) {
    var parts = (name || '').trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    }
    if (parts[0] && parts[0].length >= 2) return parts[0].substring(0, 2).toUpperCase();
    if (parts[0]) return parts[0][0].toUpperCase();
    return '?';
  }

  /* ============================================================
     Step 1 — Who is your customer?
     ============================================================ */
  function pfStepWho() {
    var strat = state.strategy || {};
    var biz   = state.business || {};
    var p     = state.persona;

    var goalText = (strat.goal && strat.goal.trim())
      ? strat.goal.trim()
      : null;
    var bizText  = (biz.description && biz.description.trim())
      ? biz.description.trim()
      : (biz.name && biz.name.trim()) ? biz.name.trim() : null;

    /* Truncate long goal for the ref card */
    var goalDisplay = goalText && goalText.length > 90
      ? goalText.substring(0, 87) + '\u2026'
      : goalText;

    /* Build reference card only if at least one field exists */
    var refCard = '';
    if (goalText || bizText) {
      var rows = '';
      if (goalText) {
        rows += '<div class="pf-ref-row">'
          + '<div class="pf-ref-label">Your goal</div>'
          + '<div class="pf-ref-value">' + goalDisplay + '</div>'
          + '</div>';
      }
      if (goalText && bizText) rows += '<div class="pf-ref-sep"></div>';
      if (bizText) {
        rows += '<div class="pf-ref-row">'
          + '<div class="pf-ref-label">Your business</div>'
          + '<div class="pf-ref-value">' + bizText + '</div>'
          + '</div>';
      }
      refCard = '<div class="pf-ref-card">' + rows + '</div>';
    }

    var nameVal = (p.name || '').replace(/"/g, '&quot;');
    var ageVal  = (p.ageRange || '').replace(/"/g, '&quot;');
    var descVal = p.description || '';

    return '<div class="pf-step-wrap">'
      + '<div class="cf-step-title">Who is your ideal customer?</div>'
      + '<div class="cf-step-sub">Give them a name and a face — this persona will anchor every piece of content Clarity creates.</div>'
      + refCard
      + '<div class="pf-field"><label>Persona name</label>'
      + '<input type="text" id="pf-name" value="' + nameVal + '" placeholder="e.g. Loyal Layla" oninput="pfWhoInput()" /></div>'
      + '<div class="pf-field"><label>Age range</label>'
      + '<input type="text" id="pf-age" value="' + ageVal + '" placeholder="e.g. 28\u201345" oninput="pfWhoInput()" /></div>'
      + '<div class="pf-field"><label>Short description</label>'
      + '<textarea id="pf-desc" rows="3" placeholder="e.g. Local foodie who values quality and shops small" oninput="pfWhoInput()">' + descVal + '</textarea></div>'
      + '</div>';
  }

  /* ============================================================
     Step 2 — What do they care about?
     ============================================================ */
  function pfStepCares() {
    var p        = state.persona;
    var selected = p.caresAbout || [];
    var otherVal = (p.otherTraits || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    var chipsHtml = PF_CARES.map(function (c, i) {
      var sel = selected.indexOf(c) !== -1;
      return '<div id="pf-chip-' + i + '" class="pf-care-chip' + (sel ? ' selected' : '') + '"'
        + ' onclick="pfToggleCare(this, \'' + c + '\')">' + c + '</div>';
    }).join('');

    return '<div class="pf-step-wrap">'
      + '<div class="cf-step-title">What do they care about?</div>'
      + '<div class="cf-step-sub">Select the values and motivations that drive your customer\'s decisions. Pick everything that fits.</div>'
      + '<div class="pf-care-grid">' + chipsHtml + '</div>'
      + '<div class="pf-field">'
      + '<label>Anything else? <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:10px;">(optional)</span></label>'
      + '<textarea id="pf-other" rows="2"'
      + ' placeholder="e.g. Values local sourcing and behind-the-scenes transparency"'
      + ' oninput="pfOtherInput(this.value)">' + otherVal + '</textarea>'
      + '</div>'
      + '</div>';
  }

  /* ============================================================
     Step 3 — What triggers them to buy?
     ============================================================ */
  function pfStepTrigger() {
    var p          = state.persona;
    var triggerVal = (p.trigger || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return '<div class="pf-step-wrap">'
      + '<div class="cf-step-title">What triggers them to buy?</div>'
      + '<div class="cf-step-sub">What\'s the specific moment, feeling, or signal that makes them decide to act?</div>'
      + '<div class="pf-field">'
      + '<label>What moment or feeling makes them decide to buy?</label>'
      + '<textarea id="pf-trigger" rows="5"'
      + ' placeholder="e.g. Seeing a limited batch they don\'t want to miss out on \u2014 scarcity and craft create urgency."'
      + ' oninput="pfTriggerInput(this.value)">' + triggerVal + '</textarea>'
      + '</div>'
      + '<div class="pf-field-hint">The more specific the trigger, the better Clarity can time and frame your content.</div>'
      + '</div>';
  }

  /* ============================================================
     Step 4 — Persona Profile Summary
     ============================================================ */
  function pfStepSummary() {
    var p        = state.persona;
    var name     = (p.name && p.name.trim()) ? p.name.trim() : 'Your Persona';
    var initials = pfInitials(p.name);

    /* Cares-about chips */
    var chipsHtml = (p.caresAbout && p.caresAbout.length > 0)
      ? p.caresAbout.map(function (c) {
          return '<span class="pf-profile-chip">' + c + '</span>';
        }).join('')
      : '<span style="font-size:13px;color:var(--muted);font-style:italic;">None selected</span>';

    /* Trigger quote */
    var triggerHtml = (p.trigger && p.trigger.trim())
      ? '<div class="pf-trigger-quote">' + p.trigger.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>'
      : '<div style="font-size:13px;color:var(--muted);font-style:italic;">Not specified</div>';

    return '<div class="pf-step-wrap">'
      + '<div class="cf-step-title">Your customer persona</div>'
      + '<div class="cf-step-sub">Review your persona before confirming. Each section can be edited below.</div>'
      + '<div class="pf-profile-card">'

      /* ---- Header: avatar + name / age / bio ---- */
      + '<div class="pf-profile-header">'
      + '<div class="pf-avatar">' + initials + '</div>'
      + '<div class="pf-profile-header-meta">'
      + '<div class="pf-profile-name">' + name + '</div>'
      + (p.ageRange ? '<div class="pf-profile-age">' + p.ageRange + '</div>' : '')
      + (p.description ? '<div class="pf-profile-bio">' + p.description.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' : '')
      + '</div>'
      + '<button class="pf-profile-edit" onclick="pfGoStep(1)">Edit</button>'
      + '</div>'

      /* ---- Cares about ---- */
      + '<div class="pf-profile-section">'
      + '<div class="pf-profile-section-body">'
      + '<div class="pf-profile-section-label">Cares about</div>'
      + '<div class="pf-profile-chips">' + chipsHtml + '</div>'
      + '</div>'
      + '<button class="pf-profile-edit" onclick="pfGoStep(2)">Edit</button>'
      + '</div>'

      /* ---- Buying trigger ---- */
      + '<div class="pf-profile-section">'
      + '<div class="pf-profile-section-body">'
      + '<div class="pf-profile-section-label">Buying trigger</div>'
      + triggerHtml
      + '</div>'
      + '<button class="pf-profile-edit" onclick="pfGoStep(3)">Edit</button>'
      + '</div>'

      + '</div>'
      + '</div>';
  }

  /* ============================================================
     Main screen renderer
     ============================================================ */
  function screenPersonaFlow() {
    var f    = pfFlow();
    var step = f.step;

    var content = step === 1 ? pfStepWho()
      : step === 2 ? pfStepCares()
      : step === 3 ? pfStepTrigger()
      : pfStepSummary();

    var topbar = '<div class="cf-topbar">'
      + '<div class="cf-brand">Clarity <span>Persona Studio</span></div>'
      + '<button class="app-topbar-back" onclick="setMode(\'home\')">&#8592; Back to home</button>'
      + '</div>';

    var backDisabled = step <= 1 ? ' disabled' : '';
    var footerRight = step < 4
      ? '<button class="btn btn-primary"' + (pfCanContinue() ? '' : ' disabled') + ' onclick="pfContinue()">Continue &#8594;</button>'
      : '<button class="btn btn-primary" onclick="pfConfirmPersona()">Confirm persona</button>';

    var footer = '<div class="cf-footer">'
      + '<button class="btn btn-outline"' + backDisabled + ' onclick="pfBack()">&#8592; Back</button>'
      + '<div class="cf-footer-mid"><span class="cf-eta">Persona &middot; ' + PF_STEPS.length + ' steps</span></div>'
      + footerRight
      + '</div>';

    return '<div class="cf-screen">'
      + topbar
      + '<div class="pf-body"><div class="cp-main" style="max-width:none;margin:0;padding:0;">'
      + pfStepper()
      + content
      + '</div></div>'
      + footer
      + '</div>';
  }

  return { init: init, screenPersonaFlow: screenPersonaFlow };
})();

/* ---- Expose screen renderer for renderApp() ---- */
window.screenPersonaFlow = function () { return PersonaFlow.screenPersonaFlow(); };

/* ============================================================
   GLOBAL EVENT HANDLERS
   ============================================================ */

/* Step navigation */
window.pfGoStep = function (step) {
  pfFlushLiveInputs();
  appState.personaFlow.step = step;
  renderContent();
};

window.pfBack = function () {
  var current = appState.personaFlow.step;
  if (current > 1) {
    pfFlushLiveInputs();
    appState.personaFlow.step = current - 1;
    renderContent();
  }
};

window.pfContinue = function () {
  pfFlushLiveInputs();
  var step = appState.personaFlow.step;
  if (step < 4) {
    appState.personaFlow.step = step + 1;
    renderContent();
  }
};

window.pfConfirmPersona = function () {
  pfFlushLiveInputs();
  var name = (appState.persona.name || '').trim();
  var summary = name
    ? '\u201c' + name + '\u201d is your customer lens from here on.'
    : 'Your persona is confirmed.';
  setTransition({
    title:    'Persona confirmed',
    summary:  summary,
    nextBadge: 'Next: GTM Strategy',
    nextMode: 'gtm-strategy'
  });
};

/* Step 1 — all three inputs share one handler; persist + update button */
window.pfWhoInput = function () {
  var nameEl = document.getElementById('pf-name');
  var ageEl  = document.getElementById('pf-age');
  var descEl = document.getElementById('pf-desc');
  if (nameEl) appState.persona.name        = nameEl.value;
  if (ageEl)  appState.persona.ageRange    = ageEl.value;
  if (descEl) appState.persona.description = descEl.value;
  var btn = document.querySelector('.cf-footer .btn-primary');
  if (btn) {
    btn.disabled = !(
      appState.persona.name.trim() &&
      appState.persona.ageRange.trim() &&
      appState.persona.description.trim()
    );
  }
};

/* Step 2 — chip toggle; DOM-only, no re-render */
window.pfToggleCare = function (el, val) {
  var arr = appState.persona.caresAbout;
  var idx = arr.indexOf(val);
  if (idx === -1) arr.push(val);
  else arr.splice(idx, 1);
  el.classList.toggle('selected', arr.indexOf(val) !== -1);
  var btn = document.querySelector('.cf-footer .btn-primary');
  if (btn) btn.disabled = arr.length === 0;
};

/* Step 2 — optional other traits */
window.pfOtherInput = function (val) {
  appState.persona.otherTraits = val;
};

/* Step 3 — trigger, persist + update button */
window.pfTriggerInput = function (val) {
  appState.persona.trigger = val;
  var btn = document.querySelector('.cf-footer .btn-primary');
  if (btn) btn.disabled = !val.trim();
};

/* Flush all live inputs to state before any navigation */
function pfFlushLiveInputs() {
  var nameEl    = document.getElementById('pf-name');
  var ageEl     = document.getElementById('pf-age');
  var descEl    = document.getElementById('pf-desc');
  var otherEl   = document.getElementById('pf-other');
  var triggerEl = document.getElementById('pf-trigger');
  if (nameEl)    appState.persona.name        = nameEl.value;
  if (ageEl)     appState.persona.ageRange    = ageEl.value;
  if (descEl)    appState.persona.description = descEl.value;
  if (otherEl)   appState.persona.otherTraits = otherEl.value;
  if (triggerEl) appState.persona.trigger     = triggerEl.value;
}
