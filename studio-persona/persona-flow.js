/* ============================================================
   PERSONA FLOW  —  IIFE module
   Screens: entry → steps (1 Who, 2 Cares About, 3 Trigger, 4 Summary)
   Step 1 uses 3 conversational sub-steps (a name, b age, c description)
   ============================================================ */
var PersonaFlow = (function () {
  var state;

  var PF_STEPS = ['Who', 'Cares About', 'Trigger', 'Summary'];

  var PF_CARES = [
    'Quality', 'Convenience', 'Price', 'Community',
    'Sustainability', 'Trust', 'Speed', 'Personal Service',
    'Status', 'Security'
  ];

  /* ---- init ---- */
  function init(s) {
    state = s;
    if (!state.personaFlow) {
      state.personaFlow = { step: 1, subStep: 1, screen: 'entry' };
    }
    if (!state.personaFlow.subStep) state.personaFlow.subStep = 1;
    if (!state.personaFlow.screen) state.personaFlow.screen = 'entry';
    if (!state.persona) {
      state.persona = { name: '', ageRange: '', description: '', caresAbout: [], otherTraits: '', trigger: '' };
    }
  }

  function pfFlow() {
    if (!state.personaFlow) state.personaFlow = { step: 1, subStep: 1, screen: 'entry' };
    return state.personaFlow;
  }

  /* ---- CI data helper ---- */
  function getCIData() {
    return (state.strategy && state.strategy.customerIntelligence) || null;
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

  /* ---- Avatar HTML ---- */
  function pfAvatar(name, size) {
    var sz = size || 64;
    return '<div class="pf-avatar" style="width:' + sz + 'px;height:' + sz + 'px;font-size:' + Math.round(sz * 0.34) + 'px">'
      + pfInitials(name) + '</div>';
  }

  /* ---- Stepper (steps 1-4 only) ---- */
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

  /* ---- CI callout card ---- */
  function pfCICard(body, soft) {
    return '<div class="pf-ci-card' + (soft ? ' pf-ci-card--soft' : '') + '">'
      + (soft ? '' : '<div class="pf-ci-card-eyebrow">From your research</div>')
      + '<div class="pf-ci-card-body">' + body + '</div>'
      + '</div>';
  }

  /* ============================================================
     ENTRY SCREEN
     ============================================================ */
  function screenEntry() {
    var ci  = getCIData();
    var biz = state.business || {};
    var bizName = (biz.name && biz.name.trim()) ? biz.name.trim() : 'Your Business';
    var locParts = (biz.locations && biz.locations.length > 0)
      ? (biz.locations[0] === 'Global' ? 'globally' : biz.locations.join(', '))
      : null;

    var ciCard;
    if (ci && ci.topTrigger) {
      ciCard = pfCICard('Your customers are motivated by: <strong>' + ci.topTrigger + '</strong>');
    } else {
      ciCard = pfCICard(
        'Run Customer Intelligence first for the best results \u2014 but you can still build a persona now.',
        true
      );
    }

    return '<div class="pf-wrap">'
      + '<div class="pf-topbar">'
      + '<button class="app-topbar-back" onclick="setMode(\'home\')">&#8592; Back to home</button>'
      + '<div class="pf-topbar-brand">Clarity <span>Persona Studio</span></div>'
      + '<div style="width:130px"></div>'
      + '</div>'
      + '<div class="pf-entry-body">'
      + '<div class="pf-entry-inner">'
      + '<div class="pf-entry-heading">Now let\u2019s define who<br>you\u2019re building for</div>'
      + '<div class="pf-entry-ref">' + bizName + (locParts ? ' \u00b7 ' + locParts : '') + '</div>'
      + ciCard
      + '<button class="pf-entry-btn" onclick="pfEnterFlow()">Build my persona &#8594;</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  /* ============================================================
     STEP 1 — WHO? (sub-steps a/b/c)
     ============================================================ */
  function pfStep1() {
    var f = pfFlow();
    var sub = f.subStep || 1;
    var p   = state.persona;
    var ci  = getCIData();

    /* Demo reference card — shown on sub-step 1a only */
    var demoCard = '';
    if (sub === 1 && ci && ci.demographicChips && ci.demographicChips.length) {
      var chips = ci.demographicChips.slice(0, 4).map(function (c) {
        return '<span class="pf-demo-chip">' + c + '</span>';
      }).join('');
      demoCard = pfCICard('Your research suggests: ' + chips);
    }

    var nameVal = (p.name || '').replace(/"/g, '&quot;');
    var ageVal  = (p.ageRange || '').replace(/"/g, '&quot;');
    var descVal = (p.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    /* Amber breadcrumb — shows previous answers at top */
    var crumb = '';
    if (sub === 2 && nameVal) {
      crumb = '<div class="pf-breadcrumb"><span class="pf-bc-gold">' + nameVal + '</span></div>';
    } else if (sub === 3) {
      var bc = [nameVal, ageVal].filter(Boolean).join(' \u00b7 ');
      if (bc) crumb = '<div class="pf-breadcrumb"><span class="pf-bc-gold">' + bc + '</span></div>';
    }

    var innerContent;
    if (sub === 1) {
      innerContent = demoCard
        + '<div class="pf-conv-question">What\u2019s your customer\u2019s name?</div>'
        + '<input class="pf-conv-input" id="pf-name" type="text" autocomplete="off" value="' + nameVal + '"'
        + ' placeholder="e.g. Maya Holloway"'
        + ' oninput="pfNameInput(this.value)"'
        + ' onkeydown="if(event.key===\'Enter\'){event.preventDefault();pfStep1Advance()}" />'
        + '<button class="pf-conv-btn" id="pf-step1-btn"' + (nameVal.trim() ? '' : ' disabled') + ' onclick="pfStep1Advance()">Continue &#8594;</button>';
    } else if (sub === 2) {
      innerContent = '<div class="pf-conv-question">How old are they?</div>'
        + '<input class="pf-conv-input" id="pf-age" type="text" autocomplete="off" value="' + ageVal + '"'
        + ' placeholder="e.g. 28\u201345"'
        + ' oninput="pfAgeInput(this.value)"'
        + ' onkeydown="if(event.key===\'Enter\'){event.preventDefault();pfStep1Advance()}" />'
        + '<button class="pf-conv-btn" id="pf-step1-btn"' + (ageVal.trim() ? '' : ' disabled') + ' onclick="pfStep1Advance()">Continue &#8594;</button>';
    } else {
      innerContent = '<div class="pf-conv-question">Describe them in one line</div>'
        + '<textarea class="pf-conv-textarea" id="pf-desc"'
        + ' placeholder="e.g. Local foodie who values quality and shops small"'
        + ' oninput="pfDescInput(this.value)">' + descVal + '</textarea>'
        + '<button class="pf-conv-btn" id="pf-step1-btn"' + (descVal.trim() ? '' : ' disabled') + ' onclick="pfStep1Advance()">Continue &#8594;</button>';
    }

    return '<div class="pf-conv-wrap">' + crumb + innerContent + '</div>';
  }

  /* ============================================================
     STEP 2 — CARES ABOUT
     ============================================================ */
  function pfStep2() {
    var p    = state.persona;
    var ci   = getCIData();
    var selected = p.caresAbout || [];
    var otherVal = (p.otherTraits || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    var ciCard = (ci && ci.topTrigger)
      ? pfCICard('Your customers are emotionally driven by: <strong>' + ci.topTrigger + '</strong>')
      : '';

    var chipsHtml = PF_CARES.map(function (c) {
      var sel = selected.indexOf(c) !== -1;
      return '<div class="pf-care-chip' + (sel ? ' selected' : '') + '"'
        + ' onclick="pfToggleCare(this,\'' + c + '\')">' + c + '</div>';
    }).join('');

    return '<div class="pf-step-wrap">'
      + '<div class="pf-step-question">What matters most to them?</div>'
      + ciCard
      + '<div class="pf-care-grid">' + chipsHtml + '</div>'
      + '<div class="pf-field">'
      + '<div class="pf-field-label">Anything else? <span class="pf-field-optional">(optional)</span></div>'
      + '<textarea class="pf-field-ta" id="pf-other" rows="2"'
      + ' placeholder="e.g. They love supporting local businesses"'
      + ' oninput="pfOtherInput(this.value)">' + otherVal + '</textarea>'
      + '</div>'
      + '</div>';
  }

  /* ============================================================
     STEP 3 — TRIGGER
     ============================================================ */
  function pfStep3() {
    var p  = state.persona;
    var ci = getCIData();
    var trigVal = (p.trigger || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    var ciCard = (ci && ci.topTrigger)
      ? pfCICard('Buyers in this category are triggered by: <strong>' + ci.topTrigger + '</strong>')
      : '';

    return '<div class="pf-step-wrap">'
      + '<div class="pf-step-question">What makes them decide to buy?</div>'
      + ciCard
      + '<textarea class="pf-trigger-ta" id="pf-trigger" rows="6"'
      + ' placeholder="e.g. Seeing a limited batch they don\u2019t want to miss out on \u2014 scarcity and craft create urgency."'
      + ' oninput="pfTriggerInput(this.value)">' + trigVal + '</textarea>'
      + '</div>';
  }

  /* ============================================================
     STEP 4 — PERSONA SUMMARY
     ============================================================ */
  function pfStep4() {
    var p   = state.persona;
    var biz = state.business || {};
    var name = (p.name && p.name.trim()) ? p.name.trim() : 'Your Persona';

    /* Location line */
    var locLine = '';
    if (biz.locations && biz.locations.length > 0) {
      var loc = biz.locations[0] === 'Global' ? 'Globally' : biz.locations.join(', ');
      locLine = '<div class="pf-profile-footer"><div class="pf-summary-loc">Operating in: ' + loc + '</div></div>';
    }

    /* Cares-about chips */
    var chipsHtml = (p.caresAbout && p.caresAbout.length > 0)
      ? p.caresAbout.map(function (c) {
          return '<span class="pf-profile-chip">' + c + '</span>';
        }).join('')
      : '<span class="pf-summary-empty">None selected</span>';

    /* Trigger quote */
    var triggerHtml = (p.trigger && p.trigger.trim())
      ? '<div class="pf-trigger-quote">\u201c' + p.trigger.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\u201d</div>'
      : '<span class="pf-summary-empty">Not specified</span>';

    return '<div class="pf-step-wrap">'
      + '<div class="pf-summary-heading">Your customer persona</div>'
      + '<div class="pf-summary-sub">Review before confirming. Edit anything that needs adjusting.</div>'
      + '<div class="pf-profile-card">'

      /* Header: avatar + name / age / bio */
      + '<div class="pf-profile-header">'
      + pfAvatar(p.name, 64)
      + '<div class="pf-profile-header-meta">'
      + '<div class="pf-profile-name">' + name + '</div>'
      + (p.ageRange ? '<div class="pf-profile-age">' + p.ageRange + '</div>' : '')
      + (p.description ? '<div class="pf-profile-bio">' + p.description.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' : '')
      + '</div>'
      + '<button class="pf-profile-edit" onclick="pfGoStep(1)">Edit</button>'
      + '</div>'

      /* Cares about */
      + '<div class="pf-profile-section">'
      + '<div class="pf-profile-section-body">'
      + '<div class="pf-profile-section-label">Cares about</div>'
      + '<div class="pf-profile-chips">' + chipsHtml + '</div>'
      + '</div>'
      + '<button class="pf-profile-edit" onclick="pfGoStep(2)">Edit</button>'
      + '</div>'

      /* Buying trigger */
      + '<div class="pf-profile-section">'
      + '<div class="pf-profile-section-body">'
      + '<div class="pf-profile-section-label">Buying trigger</div>'
      + triggerHtml
      + '</div>'
      + '<button class="pf-profile-edit" onclick="pfGoStep(3)">Edit</button>'
      + '</div>'

      /* Location footer */
      + locLine

      + '</div>'
      + '</div>';
  }

  /* ============================================================
     VALIDATION
     ============================================================ */
  function pfCanContinue() {
    var f = pfFlow();
    var p = state.persona;
    var sub = f.subStep || 1;
    if (f.step === 1) {
      if (sub === 1) return !!(p.name && p.name.trim());
      if (sub === 2) return !!(p.ageRange && p.ageRange.trim());
      return !!(p.description && p.description.trim());
    }
    if (f.step === 2) return !!(p.caresAbout && p.caresAbout.length > 0);
    if (f.step === 3) return !!(p.trigger && p.trigger.trim());
    return false;
  }

  /* ============================================================
     MAIN RENDERER
     ============================================================ */
  function screenPersonaFlow() {
    var f = pfFlow();

    /* Entry screen has its own shell */
    if (f.screen === 'entry') return screenEntry();

    var step = f.step;
    var content = step === 1 ? pfStep1()
      : step === 2 ? pfStep2()
      : step === 3 ? pfStep3()
      : pfStep4();

    var topbar = '<div class="cf-topbar">'
      + '<div class="cf-brand">Clarity <span>Persona Studio</span></div>'
      + '<button class="app-topbar-back" onclick="setMode(\'home\')">&#8592; Back to home</button>'
      + '</div>';

    /* For step 1, Continue lives inline — footer only shows Back */
    var isStep1 = (step === 1);
    var isStep4 = (step === 4);
    var backDisabled = (isStep1 && (f.subStep || 1) === 1) ? ' disabled' : '';

    var footerRight;
    if (isStep1) {
      footerRight = ''; /* Continue button is inside the content */
    } else if (isStep4) {
      footerRight = '<div class="pf-summary-actions">'
        + '<button class="btn btn-outline" onclick="pfStartOver()">Start over</button>'
        + '<button class="btn btn-primary" onclick="pfConfirmPersona()">Confirm persona</button>'
        + '</div>';
    } else {
      footerRight = '<button class="btn btn-primary" id="pf-continue-btn"'
        + (pfCanContinue() ? '' : ' disabled')
        + ' onclick="pfContinue()">Continue &#8594;</button>';
    }

    var footer = '<div class="cf-footer">'
      + '<button class="btn btn-outline"' + backDisabled + ' onclick="pfBack()">&#8592; Back</button>'
      + '<div class="cf-footer-mid">'
      + (isStep1 ? '' : '<span class="cf-eta">Persona \u00b7 ' + PF_STEPS.length + ' steps</span>')
      + '</div>'
      + footerRight
      + '</div>';

    return '<div class="cf-screen">'
      + topbar
      + '<div class="pf-body">'
      + pfStepper()
      + content
      + '</div>'
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

/* Enter the step flow from the entry screen */
window.pfEnterFlow = function () {
  appState.personaFlow.screen = 'steps';
  appState.personaFlow.step   = 1;
  appState.personaFlow.subStep = 1;
  renderContent();
  setTimeout(function () {
    var el = document.getElementById('pf-name');
    if (el) el.focus();
  }, 80);
};

/* Jump to a specific step (from Edit links in summary) */
window.pfGoStep = function (step) {
  pfFlushLiveInputs();
  appState.personaFlow.step    = step;
  appState.personaFlow.subStep = (step === 1) ? 3 : 1;
  appState.personaFlow.screen  = 'steps';
  renderContent();
  if (step === 1) {
    setTimeout(function () {
      var el = document.getElementById('pf-desc');
      if (el) el.focus();
    }, 80);
  }
};

/* Back navigation */
window.pfBack = function () {
  pfFlushLiveInputs();
  var f = appState.personaFlow;
  if (f.step === 1) {
    var sub = f.subStep || 1;
    if (sub > 1) {
      f.subStep = sub - 1;
      renderContent();
      setTimeout(function () {
        var el = document.getElementById(sub === 2 ? 'pf-name' : 'pf-age');
        if (el) el.focus();
      }, 80);
    } else {
      f.screen = 'entry';
      renderContent();
    }
  } else {
    f.step--;
    if (f.step === 1) f.subStep = 3; /* return to last sub-step of step 1 */
    renderContent();
    if (f.step === 1) {
      setTimeout(function () {
        var el = document.getElementById('pf-desc');
        if (el) el.focus();
      }, 80);
    }
  }
};

/* Continue — used by steps 2 and 3 footer button */
window.pfContinue = function () {
  pfFlushLiveInputs();
  var f = appState.personaFlow;
  if (f.step < 4) {
    f.step++;
    renderContent();
    if (f.step === 3) {
      setTimeout(function () {
        var el = document.getElementById('pf-trigger');
        if (el) el.focus();
      }, 80);
    }
  }
};

/* Step 1 sub-step advance (called by inline Continue and Enter key) */
window.pfStep1Advance = function () {
  pfFlushLiveInputs();
  var f = appState.personaFlow;
  var sub = f.subStep || 1;
  if (sub < 3) {
    f.subStep = sub + 1;
    renderContent();
    setTimeout(function () {
      var nextId = sub === 1 ? 'pf-age' : 'pf-desc';
      var el = document.getElementById(nextId);
      if (el) el.focus();
    }, 80);
  } else {
    /* Sub-step 3 done → advance to step 2 */
    f.step = 2;
    f.subStep = 1;
    renderContent();
  }
};

/* Confirm persona → transition */
window.pfConfirmPersona = function () {
  pfFlushLiveInputs();
  var name = (appState.persona.name || '').trim();
  setTransition({
    title:    'Persona locked in',
    summary:  name
      ? '\u201c' + name + '\u201d is your customer lens from here on.'
      : 'Your persona is confirmed.',
    nextBadge: 'Next: GTM Strategy',
    nextMode: 'gtm-strategy'
  });
};

/* Start over — reset persona and return to entry */
window.pfStartOver = function () {
  appState.persona = {
    name: '', ageRange: '', description: '',
    caresAbout: [], otherTraits: '', trigger: ''
  };
  appState.personaFlow = { step: 1, subStep: 1, screen: 'entry' };
  renderContent();
};

/* ---- Input handlers ---- */
window.pfNameInput = function (val) {
  appState.persona.name = val;
  var btn = document.getElementById('pf-step1-btn');
  if (btn) btn.disabled = !val.trim();
};

window.pfAgeInput = function (val) {
  appState.persona.ageRange = val;
  var btn = document.getElementById('pf-step1-btn');
  if (btn) btn.disabled = !val.trim();
};

window.pfDescInput = function (val) {
  appState.persona.description = val;
  var btn = document.getElementById('pf-step1-btn');
  if (btn) btn.disabled = !val.trim();
};

window.pfToggleCare = function (el, val) {
  var arr = appState.persona.caresAbout;
  var idx = arr.indexOf(val);
  if (idx === -1) arr.push(val);
  else arr.splice(idx, 1);
  el.classList.toggle('selected', arr.indexOf(val) !== -1);
  var btn = document.getElementById('pf-continue-btn');
  if (btn) btn.disabled = arr.length === 0;
};

window.pfOtherInput = function (val) {
  appState.persona.otherTraits = val;
};

window.pfTriggerInput = function (val) {
  appState.persona.trigger = val;
  var btn = document.getElementById('pf-continue-btn');
  if (btn) btn.disabled = !val.trim();
};

/* Flush all live inputs before any navigation */
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
