// ---------------------------------------------
// Clarity 2.0 — Today View
// ---------------------------------------------

function renderToday(container) {
  const tasks = _todayTasks();

  container.innerHTML = `
    <section class="td-wrap">
      <div class="td-greeting">${_greeting()}</div>
      <h1 class="td-heading">Here\u2019s what Clara thinks you should focus on today.</h1>
      <div class="td-cards" id="tdCards"></div>
      <div class="td-footer-note">Clara updates these every day based on what\u2019s working.</div>
    </section>
  `;

  const cardsWrap = document.getElementById('tdCards');
  tasks.forEach(function (task) {
    const card = document.createElement('div');
    card.className = 'td-card';
    card.setAttribute('data-task-id', task.id);
    card.innerHTML = `
      <div class="td-card-type" data-type="${task.type}">${task.type}</div>
      <div class="td-card-desc">${_escape(task.description)}</div>
      <div class="td-card-bottom">
        <span class="td-card-time">${task.time}</span>
        <span class="td-card-why" data-why="${task.id}">Why this?</span>
      </div>
      <div class="td-card-reason" data-reason="${task.id}">
        <div class="td-card-reason-inner">${_escape(task.reason)}</div>
      </div>
    `;

    const why = card.querySelector('.td-card-why');
    const reason = card.querySelector('.td-card-reason');

    why.addEventListener('click', function (e) {
      e.stopPropagation();
      reason.classList.toggle('td-card-reason-open');
    });

    card.addEventListener('click', function () {
      const create = getCreate();
      _resetCreate();
      create.fromTask = task;
      create.type = 'post';
      create.platform = getBusiness().reach === 'local' ? 'instagram' : 'linkedin';
      appState.activeView = 'create';
      _saveState();
      renderApp();
    });

    cardsWrap.appendChild(card);
  });
}

window.renderToday = renderToday;
