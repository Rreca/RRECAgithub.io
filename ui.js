/*************************************************************
 * ui.js – Nudos (Offline) – COMPLETO
 *************************************************************/

let backlogSortMode = 'friction'; // friction | impact | recent

/***********************
 * UI STATE (toggle sliders mini)
 ***********************/
const UI_KEYS = {
  quickEditHidden: 'nudos_ui_quick_edit_hidden_v1'
};

function isQuickEditHidden() {
  return localStorage.getItem(UI_KEYS.quickEditHidden) === '1';
}

function setQuickEditHidden(hidden) {
  localStorage.setItem(UI_KEYS.quickEditHidden, hidden ? '1' : '0');
  document.body.classList.toggle('hide-quick', hidden);
  const btn = document.getElementById('btn-quick-toggle');
  if (btn) btn.textContent = hidden ? 'Edición rápida: OFF' : 'Edición rápida: ON';
}

/***********************
 * Diccionarios
 ***********************/
const STATUS_ES = {
  BLOCKED: 'BLOQUEADO',
  UNLOCKABLE: 'DESBLOQUEABLE',
  DOING: 'EN PROGRESO',
  DONE: 'HECHO',
  SOMEDAY: 'ALGÚN DÍA'
};

const REASON_ES = {
  NO_START: 'No sé por dónde empezar',
  LAZINESS: 'Pereza',
  FEAR: 'Miedo',
  EXTERNAL: 'Depende de un externo',
  NOT_TODAY: 'No hoy'
};

function statusToEs(code) { return STATUS_ES[code] || String(code || ''); }
function reasonToEs(code) { return REASON_ES[code] || String(code || ''); }

/***********************
 * Métricas: Fricción/Impacto/Score
 ***********************/
function getFriction(k) {
  const v = (typeof k.weight === 'number') ? k.weight : parseInt(k.weight, 10);
  return Number.isFinite(v) ? v : 3;
}
function getImpact(k) {
  const v = (typeof k.impact === 'number') ? k.impact : parseInt(k.impact, 10);
  return Number.isFinite(v) ? v : 3;
}
function priorityScore(k) {
  return getImpact(k) - getFriction(k);
}

/***********************
 * Badges
 ***********************/
function statusBadge(statusCode) {
  const mapClass = { UNLOCKABLE:'unlockable', DOING:'doing', BLOCKED:'blocked', SOMEDAY:'someday', DONE:'done' };
  const cls = mapClass[statusCode] || '';
  return '<span class="badge ' + cls + '">' + escapeHTML(statusToEs(statusCode)) + '</span>';
}

function scoreBadge(score) {
  if (score >= 3) return '<span class="badge hot">HACÉLO YA</span>';
  if (score <= -2) return '<span class="badge split">DIVIDIR</span>';
  return '';
}

/***********************
 * Modal
 ***********************/
function showModal(contentHtml, opts) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  const options = opts || {};
  const closeText = options.closeText || 'Cerrar';
  const showClose = options.showClose !== false;

  content.innerHTML = '<div>' + contentHtml + '</div>';

  if (showClose) {
    const row = document.createElement('div');
    row.className = 'row';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = closeText;
    closeBtn.addEventListener('click', () => {
      overlay.style.display = 'none';
      if (typeof options.onClose === 'function') options.onClose();
    });
    row.appendChild(closeBtn);
    content.appendChild(document.createElement('hr'));
    content.appendChild(row);
  }

  overlay.style.display = 'flex';
}

function hideModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

/***********************
 * Timer 5 min + chip + muestra próximo paso
 ***********************/
let __timerState = { running:false, knotId:null, endAt:0, intervalId:null };

function syncTimerChip() {
  const chip = document.getElementById('timer-chip');
  if (!chip) return;

  if (!__timerState.running) {
    chip.style.display = 'none';
    return;
  }

  const left = Math.max(0, __timerState.endAt - Date.now());
  const m = String(Math.floor(left / 60000)).padStart(2, '0');
  const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');

  const knot = getKnotById(__timerState.knotId);
  const title = knot ? knot.title : 'Nudo';
  const step = (knot && knot.nextStep) ? knot.nextStep : null;

  chip.style.display = 'inline-block';
  chip.textContent = `⏱ ${m}:${s} · ${title}${step ? ' · ' + step : ''}`;

  if (left <= 0) {
    clearInterval(__timerState.intervalId);
    __timerState.running = false;
    __timerState.knotId = null;
    __timerState.endAt = 0;
    __timerState.intervalId = null;
    chip.textContent = '⏱ pausa · repetí';
    chip.style.display = 'inline-block';
  }
}

function startFiveMin(knotId) {
  clearInterval(__timerState.intervalId);
  __timerState.running = true;
  __timerState.knotId = knotId;
  __timerState.endAt = Date.now() + 5 * 60 * 1000;

  __timerState.intervalId = setInterval(syncTimerChip, 300);
  syncTimerChip();
  logEvent('TIMER_5MIN_START', { knotId: knotId });
}

/***********************
 * Helpers de botones
 ***********************/
function makeBtn(text, cls, onClick) {
  const b = document.createElement('button');
  b.className = ('btn ' + (cls || '')).trim();
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

/***********************
 * Tarjeta
 ***********************/
function createKnotCard(knot) {
  const friction = getFriction(knot);
  const impact = getImpact(knot);
  const score = priorityScore(knot);

  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <div class="title">${escapeHTML(knot.title)}</div>
    <div>
      ${statusBadge(knot.status)}
      ${scoreBadge(score)}
      <span class="kbd">${escapeHTML(reasonToEs(knot.blockReason))}</span>
      · fricción ${escapeHTML(String(friction))}
      · impacto ${escapeHTML(String(impact))}
      · sugerencia ${escapeHTML(String(score))}
    </div>
    <div class="hint">Último toque: ${escapeHTML(formatTimeAgo(knot.lastTouchedAt))}</div>

    <div class="quick-edit" data-qe>
      <div class="quick-row">
        <div>Fricción</div>
        <input type="range" min="1" max="5" value="${escapeHTML(String(friction))}" data-fr />
        <span class="pill" data-frv>${escapeHTML(String(friction))}</span>
      </div>

      <div class="quick-row">
        <div>Impacto</div>
        <input type="range" min="1" max="5" value="${escapeHTML(String(impact))}" data-im />
        <span class="pill" data-imv>${escapeHTML(String(impact))}</span>
      </div>

      <div class="hint">Sugerencia: impacto − fricción = <b data-score>${escapeHTML(String(score))}</b></div>
    </div>

    <div class="actions" data-actions></div>
  `;

  card.addEventListener('click', function () { showKnotDetail(knot.id); });

  const frSlider = card.querySelector('[data-fr]');
  const imSlider = card.querySelector('[data-im]');
  const frVal = card.querySelector('[data-frv]');
  const imVal = card.querySelector('[data-imv]');
  const scVal = card.querySelector('[data-score]');

  [frSlider, imSlider].forEach(el => {
    el.addEventListener('click', (e) => e.stopPropagation());
    el.addEventListener('mousedown', (e) => e.stopPropagation());
    el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive:true });
  });

  let __deb = null;

  function refreshNumbers() {
    frVal.textContent = frSlider.value;
    imVal.textContent = imSlider.value;
    scVal.textContent = String((parseInt(imSlider.value,10)||3) - (parseInt(frSlider.value,10)||3));
  }

  function persistQuickEdit() {
    clearTimeout(__deb);
    __deb = setTimeout(() => {
      const newF = parseInt(frSlider.value, 10) || 3;
      const newI = parseInt(imSlider.value, 10) || 3;

      updateKnot({ id: knot.id, weight: newF, impact: newI });
      logEvent('QUICK_EDIT', { knotId: knot.id, friction: newF, impact: newI });

      renderInsights();
      renderToday();
    }, 200);
  }

  frSlider.addEventListener('input', () => { refreshNumbers(); persistQuickEdit(); });
  imSlider.addEventListener('input', () => { refreshNumbers(); persistQuickEdit(); });

  const actions = card.querySelector('[data-actions]');

  if (knot.status === 'DOING') {
    actions.appendChild(
      makeBtn('⏱ Hacer 5 min', 'small btn-primary', (e) => {
        e.stopPropagation();
        startFiveMin(knot.id);
        showFocus5MinModal(knot.id);
      })
    );
    actions.appendChild(makeBtn('Pausar', 'small', (e) => { e.stopPropagation(); handlePauseDoing(knot.id); }));
    actions.appendChild(makeBtn('Marcar HECHO', 'small btn-primary', (e) => { e.stopPropagation(); handleDone(knot.id); }));
  } else if (knot.status === 'UNLOCKABLE') {
    actions.appendChild(makeBtn('Iniciar', 'small', (e) => { e.stopPropagation(); handleStartDoing(knot.id); }));
    actions.appendChild(makeBtn('Mandar a ALGÚN DÍA', 'small', (e) => { e.stopPropagation(); transitionToSomeday(knot.id); renderToday(); }));
    actions.appendChild(makeBtn('🧩 Dividir', 'small', (e) => { e.stopPropagation(); showSplitKnotModal(knot.id); }));
  } else if (knot.status === 'SOMEDAY') {
    actions.appendChild(makeBtn('Editar', 'small btn-primary', (e) => { e.stopPropagation(); showEditSomedayModal(knot.id); }));
    actions.appendChild(makeBtn('🛠 Pasar a DESBLOQUEABLE', 'small', (e) => { e.stopPropagation(); convertSomedayToUnlockable(knot.id); }));
    actions.appendChild(makeBtn('🧩 Dividir', 'small', (e) => { e.stopPropagation(); showSplitKnotModal(knot.id); }));
    actions.appendChild(makeBtn('Eliminar', 'small btn-danger', (e) => {
      e.stopPropagation();
      if (confirm('¿Eliminar este nudo?')) {
        deleteKnot(knot.id);
        renderToday();
        renderInsights();
        const d = document.getElementById('knot-detail');
        if (d) d.style.display = 'none';
      }
    }));
  } else if (knot.status === 'BLOCKED') {
    actions.appendChild(makeBtn('Eliminar', 'small btn-danger', (e) => {
      e.stopPropagation();
      if (confirm('¿Eliminar este nudo?')) {
        deleteKnot(knot.id);
        renderToday();
        renderInsights();
        const d = document.getElementById('knot-detail');
        if (d) d.style.display = 'none';
      }
    }));
  } else if (knot.status === 'DONE') {
    // DONE: sin borrar manual por defecto. (motivación + limpieza automática)
    actions.appendChild(makeBtn('Ver detalle', 'small', (e) => { e.stopPropagation(); showKnotDetail(knot.id); }));
  }

  return card;
}

/***********************
 * HECHOS: agrupar por día (últimos 7 días)
 ***********************/
function dayKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
function dayLabel(key) {
  // key: YYYY-MM-DD
  const parts = key.split('-');
  const d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
  return d.toLocaleDateString('es-AR', { weekday:'long', day:'2-digit', month:'long' });
}

function renderDoneGrouped(doneKnots) {
  const doneContainer = document.getElementById('done-container');
  if (!doneContainer) return;

  if (!doneKnots.length) {
    doneContainer.innerHTML = '<div class="notice">Todavía nada. Con 1 hecho chico ya cambia el día.</div>';
    return;
  }

  // agrupar por día
  const groups = {};
  doneKnots.forEach(k => {
    const ts = k.doneAt || k.updatedAt || k.lastTouchedAt || k.createdAt || Date.now();
    const key = dayKey(ts);
    if (!groups[key]) groups[key] = [];
    groups[key].push(k);
  });

  // ordenar días desc
  const days = Object.keys(groups).sort((a,b) => (a<b?1:-1));

  let html = `<div class="notice"><b>${doneKnots.length}</b> hecho(s) en los últimos 7 días.</div>`;

  days.forEach(key => {
    const items = groups[key]
      .sort((a,b)=> (b.doneAt||0) - (a.doneAt||0));

    html += `
      <div class="done-day">
        <div class="done-day-title">${escapeHTML(dayLabel(key))} · ${items.length}</div>
        <div class="done-mini">
          ${items.map(k => `<span class="kbd">✅ ${escapeHTML(k.title)}</span>`).join(' ')}
        </div>
      </div>
    `;
  });

  doneContainer.innerHTML = html;
}

/***********************
 * Render Hoy
 ***********************/
function renderToday() {
  const knots = getKnots();

  const doing = knots.find(k => k.status === 'DOING');

  const unlockables = knots
    .filter(k => k.status === 'UNLOCKABLE')
    .sort((a,b)=> (a.lastTouchedAt||0) - (b.lastTouchedAt||0));

  // ✅ DONE separado
  const doneKnots = knots
    .filter(k => k.status === 'DONE')
    .sort((a,b)=> (b.doneAt||b.updatedAt||0) - (a.doneAt||a.updatedAt||0));

  // ✅ Backlog: SOLO blocked + someday
  let backlog = knots.filter(k => ['BLOCKED','SOMEDAY'].includes(k.status));

  if (backlogSortMode === 'friction') backlog.sort((a,b)=> getFriction(b) - getFriction(a));
  else if (backlogSortMode === 'impact') backlog.sort((a,b)=> getImpact(b) - getImpact(a));
  else backlog.sort((a,b)=> (b.updatedAt||0) - (a.updatedAt||0));

  const doingContainer = document.getElementById('doing-container');
  doingContainer.innerHTML = '';
  if (doing) doingContainer.appendChild(createKnotCard(doing));
  else doingContainer.innerHTML = '<div class="notice">Nada en progreso. Elegí 1 DESBLOQUEABLE y empezá.</div>';

  const unlockableContainer = document.getElementById('unlockable-container');
  unlockableContainer.innerHTML = '';
  if (!unlockables.length) unlockableContainer.innerHTML = '<div class="notice">No hay DESBLOQUEABLES. Capturá un nudo (si hay cupo).</div>';
  else unlockables.forEach(k => unlockableContainer.appendChild(createKnotCard(k)));

  // ✅ DONE agrupados
  renderDoneGrouped(doneKnots);

  const backlogContainer = document.getElementById('backlog-container');
  backlogContainer.innerHTML = '';
  if (!backlog.length) backlogContainer.innerHTML = '<div class="notice">Backlog vacío.</div>';
  else backlog.forEach(k => backlogContainer.appendChild(createKnotCard(k)));

  // resaltar botón filtro activo
  const fw = document.getElementById('filter-friction');
  const fi = document.getElementById('filter-impact');
  const fr = document.getElementById('filter-recent');
  if (fw && fi && fr) {
    fw.className = ('btn small ' + (backlogSortMode==='friction'?'btn-primary':'' )).trim();
    fi.className = ('btn small ' + (backlogSortMode==='impact'?'btn-primary':'' )).trim();
    fr.className = ('btn small ' + (backlogSortMode==='recent'?'btn-primary':'' )).trim();
  }

  if (typeof updateCaptureButton === 'function') updateCaptureButton();
  syncTimerChip();
}

/***********************
 * Detalle
 ***********************/
function showKnotDetail(id) {
  const knot = getKnotById(id);
  if (!knot) return;

  const friction = getFriction(knot);
  const impact = getImpact(knot);
  const score = priorityScore(knot);

  const detail = document.getElementById('knot-detail');
  const content = document.getElementById('knot-detail-content');

  let html =
    `<h3>${escapeHTML(knot.title)}</h3>` +
    `<div>${statusBadge(knot.status)} ${scoreBadge(score)}</div>` +
    `<div class="notice">
      <b>Motivo:</b> ${escapeHTML(reasonToEs(knot.blockReason))}<br/>
      <b>Fricción:</b> ${escapeHTML(String(friction))} · <b>Impacto:</b> ${escapeHTML(String(impact))}<br/>
      <b>Sugerencia:</b> ${escapeHTML(String(score))}
    </div>`;

  if (knot.nextStep) html += `<div><b>Próximo paso:</b> ${escapeHTML(knot.nextStep)}</div>`;
  if (knot.estMinutes) html += `<div><b>Minutos estimados:</b> ${escapeHTML(String(knot.estMinutes))}</div>`;
  if (knot.externalWait) html += `<div><b>Espera externa:</b> ${escapeHTML(knot.externalWait)}</div>`;
  if (knot.doneAt) html += `<div><b>Hecho:</b> ${escapeHTML(formatTimeAgo(knot.doneAt))}</div>`;

  html +=
    `<hr/>` +
    `<div class="hint"><b>Creado:</b> ${escapeHTML(formatTimeAgo(knot.createdAt))}</div>` +
    `<div class="hint"><b>Actualizado:</b> ${escapeHTML(formatTimeAgo(knot.updatedAt))}</div>` +
    `<div class="hint"><b>Último toque:</b> ${escapeHTML(formatTimeAgo(knot.lastTouchedAt))}</div>`;

  content.innerHTML = html;
  detail.style.display = 'block';
}

/***********************
 * Capturar nudo – MODAL COMPLETO (igual que tuyo)
 ***********************/
function showCaptureModal() {
  const content =
    `<h3>Capturar nudo</h3>
     <div class="notice">
       Regla: si hay <b>EN PROGRESO</b> o ya tenés <b>3 DESBLOQUEABLES</b>, no podés capturar.
     </div>

     <form id="capture-form">
       <div class="field">
         <label for="title">Título</label>
         <input id="title" placeholder="Ej: pagar impuesto, llamar al médico..." required />
       </div>

       <div class="field">
         <label for="blockReason">Motivo del bloqueo</label>
         <select id="blockReason" required>
           <option value="NO_START">No sé por dónde empezar</option>
           <option value="LAZINESS">Pereza</option>
           <option value="FEAR">Miedo</option>
           <option value="EXTERNAL">Depende de un externo</option>
           <option value="NOT_TODAY">No hoy</option>
         </select>
       </div>

       <div id="nextStep-container" class="field">
         <label for="nextStep">Próximo paso (obligatorio en “no sé / pereza / miedo”)</label>
         <input id="nextStep" placeholder="Ej: abrir la web y buscar el trámite" />
       </div>

       <div id="estMinutes-container" class="field">
         <label for="estMinutes">Minutos estimados (máx 5 en “no sé / pereza / miedo”)</label>
         <input id="estMinutes" type="number" min="1" max="60" value="5" />
       </div>

       <div id="externalWait-container" class="field" style="display:none;">
         <label for="externalWait">Espera externa (obligatorio si depende de externo)</label>
         <input id="externalWait" placeholder="Ej: respuesta del banco / turno / aprobación" />
       </div>

       <div class="row">
         <div class="field" style="flex:1;">
           <label for="friction">Fricción (1–5)</label>
           <input id="friction" type="number" min="1" max="5" value="3" />
         </div>

         <div class="field" style="flex:1;">
           <label for="impact">Impacto (1–5)</label>
           <input id="impact" type="number" min="1" max="5" value="3" />
         </div>
       </div>

       <div class="row">
         <button type="submit" class="btn btn-primary">Crear</button>
         <button type="button" id="cancel-capture" class="btn">Cancelar</button>
       </div>
     </form>`;

  showModal(content, { showClose: false });

  document.getElementById('cancel-capture').onclick = () => hideModal();

  const form = document.getElementById('capture-form');
  const reasonSel = document.getElementById('blockReason');

  function refreshFields() {
    const reason = reasonSel.value;
    const needsNext = ['NO_START', 'LAZINESS', 'FEAR'].includes(reason);
    document.getElementById('nextStep-container').style.display = needsNext ? 'grid' : 'none';
    document.getElementById('estMinutes-container').style.display = needsNext ? 'grid' : 'none';
    document.getElementById('externalWait-container').style.display = (reason === 'EXTERNAL') ? 'grid' : 'none';
  }
  reasonSel.addEventListener('change', refreshFields);
  refreshFields();

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    try {
      const knot = {
        id: generateUUID(),
        title: document.getElementById('title').value.trim(),
        blockReason: reasonSel.value,
        nextStep: (document.getElementById('nextStep').value || '').trim() || null,
        estMinutes: parseInt(document.getElementById('estMinutes').value, 10) || 5,
        externalWait: (document.getElementById('externalWait').value || '').trim() || null,
        weight: parseInt(document.getElementById('friction').value, 10) || 3,
        impact: parseInt(document.getElementById('impact').value, 10) || 3,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastTouchedAt: Date.now(),
        status: ''
      };

      const validated = validateNewKnot(knot);
      createKnot(validated);

      hideModal();
      renderToday();
    } catch (err) {
      alert(err.message);
    }
  });
}

/***********************
 * Modal sistema lleno (igual que tuyo)
 ***********************/
function showSystemFullModal(message) {
  const knots = getKnots();
  const unlockables = knots.filter(k => k.status === 'UNLOCKABLE');
  const doing = knots.find(k => k.status === 'DOING');

  let content = `<h3>Sistema lleno</h3><div class="notice">${escapeHTML(message)}</div>`;

  if (unlockables.length > 0) {
    content += `<hr/><div><b>Degradar a ALGÚN DÍA:</b></div><div class="row">`;
    unlockables.forEach(k => {
      content += `<button class="btn small" data-deg="${escapeHTML(k.id)}">${escapeHTML(k.title)}</button>`;
    });
    content += `</div>`;
  }

  if (doing) {
    content += `<hr/><div><b>Pausar EN PROGRESO:</b></div>
      <div class="row">
        <button class="btn small" id="pause-doing">${escapeHTML(doing.title)}</button>
      </div>`;
  }

  showModal(content, { showClose: true });

  unlockables.forEach(k => {
    const b = document.querySelector(`[data-deg="${CSS.escape(k.id)}"]`);
    if (b) {
      b.onclick = () => {
        transitionToSomeday(k.id);
        hideModal();
        renderToday();
      };
    }
  });

  if (doing) {
    const p = document.getElementById('pause-doing');
    if (p) {
      p.onclick = () => {
        handlePauseDoing(doing.id);
        hideModal();
        renderToday();
      };
    }
  }
}

/***********************
 * Handlers transición (igual que tuyo)
 ***********************/
function handleStartDoing(id) {
  try {
    transitionToDoing(id);
    renderToday();
  } catch (err) {
    showModal(
      `<h3>No se puede iniciar</h3>
       <div class="notice">${escapeHTML(err.message)}</div>
       <div class="row">
         <button class="btn btn-primary" id="ask-pause">Pausar el actual</button>
         <button class="btn" id="ask-cancel">Cancelar</button>
       </div>`,
      { showClose:false }
    );

    document.getElementById('ask-cancel').onclick = hideModal;
    document.getElementById('ask-pause').onclick = function () {
      const doing = getKnots().find(k => k.status === 'DOING');
      if (doing) {
        try {
          handlePauseDoing(doing.id);
          transitionToDoing(id);
          hideModal();
          renderToday();
        } catch (e2) {
          hideModal();
          showSystemFullModal(e2.message);
        }
      } else {
        hideModal();
      }
    };
  }
}

function handlePauseDoing(id) {
  try {
    transitionToPauseDoing(id);
    renderToday();
  } catch (err) {
    showModal(
      `<h3>No se puede pausar</h3>
       <div class="notice">${escapeHTML(err.message)}</div>
       <div class="row">
         <button class="btn btn-primary" id="open-system">Resolver ahora</button>
         <button class="btn" id="close-me">Cerrar</button>
       </div>`,
      { showClose:false }
    );
    document.getElementById('close-me').onclick = hideModal;
    document.getElementById('open-system').onclick = function () {
      hideModal();
      showSystemFullModal(err.message);
    };
  }
}

function handleDone(id) {
  const content =
    `<h3>Cierre</h3>
     <div class="notice">¿Bajó la carga mental?</div>
     <div class="row">
       <button class="btn btn-primary" id="felt-yes">Sí</button>
       <button class="btn" id="felt-no">No</button>
     </div>
     <div class="hint">Esto solo entrena el cerebro a asociar “hacer” con alivio.</div>`;

  showModal(content, { showClose:false });

  document.getElementById('felt-yes').onclick = function () {
    transitionToDone(id, true);
    hideModal();
    renderToday();
  };

  document.getElementById('felt-no').onclick = function () {
    transitionToDone(id, false);
    hideModal();
    renderToday();
  };
}

/***********************
 * Convertir / editar / split / modos
 * (dejo tu lógica igual, sin tocar lo que ya funciona)
 ***********************/
function convertSomedayToUnlockable(id) {
  const knot = getKnotById(id);
  if (!knot) return;

  const can = canMoveToUnlockable(id);
  if (!can) {
    showModal(`<h3>No hay cupo</h3><div class="notice">Ya tenés 3 DESBLOQUEABLES.</div>`);
    return;
  }

  showModal(
    `<h3>Pasar a DESBLOQUEABLE</h3>
     <div class="notice">Definí un próximo paso y un límite corto.</div>

     <div class="field">
       <label>Próximo paso</label>
       <input id="c-next" value="${escapeHTML(knot.nextStep || '')}" />
     </div>

     <div class="field">
       <label>Minutos estimados</label>
       <input id="c-min" type="number" min="1" max="60" value="${escapeHTML(String(knot.estMinutes || 5))}" />
     </div>

     <div class="row">
       <button class="btn btn-primary" id="c-ok">Listo</button>
       <button class="btn" id="c-cancel">Cancelar</button>
     </div>`,
    { showClose:false }
  );

  document.getElementById('c-cancel').onclick = hideModal;

  document.getElementById('c-ok').onclick = function () {
    const next = (document.getElementById('c-next').value || '').trim();
    const mins = parseInt(document.getElementById('c-min').value, 10) || 5;

    if (!next) {
      alert('El próximo paso es obligatorio.');
      return;
    }

    updateKnot({
      id: id,
      status: 'UNLOCKABLE',
      nextStep: next,
      estMinutes: mins,
      blockReason: knot.blockReason === 'NOT_TODAY' ? 'NO_START' : knot.blockReason
    });

    hideModal();
    renderToday();
  };
}

function showEditSomedayModal(id) {
  const knot = getKnotById(id);
  if (!knot) return;

  showModal(
    `<h3>Editar ALGÚN DÍA</h3>

     <div class="field">
       <label>Título</label>
       <input id="e-title" value="${escapeHTML(knot.title)}" />
     </div>

     <div class="row">
       <div class="field" style="flex:1;">
         <label>Fricción (1–5)</label>
         <input id="e-friction" type="number" min="1" max="5" value="${escapeHTML(String(getFriction(knot)))}" />
       </div>
       <div class="field" style="flex:1;">
         <label>Impacto (1–5)</label>
         <input id="e-impact" type="number" min="1" max="5" value="${escapeHTML(String(getImpact(knot)))}" />
       </div>
     </div>

     <div class="row">
       <button class="btn btn-primary" id="e-save">Guardar</button>
       <button class="btn" id="e-cancel">Cancelar</button>
     </div>`,
    { showClose:false }
  );

  document.getElementById('e-cancel').onclick = hideModal;
  document.getElementById('e-save').onclick = function () {
    updateKnot({
      id: id,
      title: (document.getElementById('e-title').value || '').trim(),
      weight: parseInt(document.getElementById('e-friction').value, 10) || 3,
      impact: parseInt(document.getElementById('e-impact').value, 10) || 3
    });
    hideModal();
    renderToday();
  };
}

function showSplitKnotModal(id) {
  const knot = getKnotById(id);
  if (!knot) return;

  showModal(
    `<h3>Dividir nudo</h3>
     <div class="notice">Convertimos 1 monstruo en 2 micro-pasos.</div>

     <div class="field">
       <label>Micro paso 1</label>
       <input id="s1" />
     </div>

     <div class="field">
       <label>Micro paso 2</label>
       <input id="s2" />
     </div>

     <div class="row">
       <button class="btn btn-primary" id="split-ok">Crear micro-pasos</button>
       <button class="btn" id="split-cancel">Cancelar</button>
     </div>`,
    { showClose:false }
  );

  document.getElementById('split-cancel').onclick = hideModal;

  document.getElementById('split-ok').onclick = function () {
    const t1 = (document.getElementById('s1').value || '').trim();
    const t2 = (document.getElementById('s2').value || '').trim();

    if (!t1 && !t2) {
      alert('Escribí al menos un micro paso.');
      return;
    }

    [t1, t2].filter(Boolean).forEach(function (t) {
      const nk = {
        id: generateUUID(),
        title: t,
        blockReason: 'NO_START',
        nextStep: t,
        estMinutes: 5,
        externalWait: null,
        weight: 2,
        impact: Math.max(2, getImpact(knot) - 1),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastTouchedAt: Date.now(),
        status: 'UNLOCKABLE'
      };

      const unlockableCount = getKnots().filter(k => k.status === 'UNLOCKABLE').length;
      if (unlockableCount >= 3) nk.status = 'SOMEDAY';

      createKnot(nk);
    });

    transitionToSomeday(id);

    hideModal();
    renderToday();
  };
}

function pickSoftTask() {
  const cands = getKnots()
    .filter(k => k.status === 'UNLOCKABLE')
    .filter(k => getFriction(k) <= 2)
    .sort((a,b)=> getImpact(b)-getImpact(a));

  if (!cands.length) {
    showModal(`<h3>Avanzar sin sufrir</h3><div class="notice">No hay desbloqueables de fricción baja. Dividí uno pesado.</div>`);
    return;
  }

  const k = cands[0];

  showModal(
    `<h3>Avanzar sin sufrir</h3>
     <div class="notice">
       Elegido: <b>${escapeHTML(k.title)}</b><br/>
       Próximo paso: <b>${escapeHTML(k.nextStep || 'Hacer 5 minutos')}</b>
     </div>

     <div class="row">
       <button class="btn btn-primary" id="soft-go">Iniciar + 5 min</button>
       <button class="btn" id="soft-cancel">Cancelar</button>
     </div>`,
    { showClose:false }
  );

  document.getElementById('soft-cancel').onclick = hideModal;
  document.getElementById('soft-go').onclick = function () {
    hideModal();
    try { transitionToDoing(k.id); } catch (_) {}
    renderToday();
    startFiveMin(k.id);
    showFocus5MinModal(k.id);
  };
}

function panicNoThink() {
  const doing = getKnots().find(k => k.status === 'DOING');
  if (doing) {
    startFiveMin(doing.id);
    showFocus5MinModal(doing.id);
    return;
  }
  pickSoftTask();
}

/***********************
 * Insights (igual que tuyo, sin tocar)
 ***********************/
function renderInsights() {
  const knots = getKnots();
  const events = getEvents();

  const counts = {};
  ['BLOCKED', 'UNLOCKABLE', 'DOING', 'DONE', 'SOMEDAY'].forEach(function (status) {
    counts[status] = knots.filter(function (k) { return k.status === status; }).length;
  });

  const container = document.getElementById('insights-container');
  if (!container) return;

  const countsHtml = Object.keys(counts).map(function (k) {
    return `<div>${escapeHTML(statusToEs(k))}: <b>${escapeHTML(String(counts[k]))}</b></div>`;
  }).join('');

  container.innerHTML =
    `<div class="panel">
      <h3>Conteos por estado</h3>
      ${countsHtml}
    </div>`;
}

/***********************
 * 5 minutos (tu versión, intacta)
 ***********************/
function showFocus5MinModal(knotId) {
  const knot = getKnotById(knotId);
  if (!knot) return;

  const step = knot.nextStep || 'Hacé cualquier avance mínimo';

  const content = `
    <h3>⏱ 5 minutos</h3>

    <div class="notice">
      <b>${escapeHTML(knot.title)}</b>
    </div>

    <div class="notice">
      Próximo paso:
      <br>
      <b>${escapeHTML(step)}</b>
    </div>

    <div id="focus-timer" class="focus-timer">05:00</div>

    <div class="hint">
      No pienses. No optimices. <br>
      Solo hacé este paso hasta que termine el tiempo.
    </div>

    <div class="row">
      <button id="focus-done" class="btn btn-primary">Terminé</button>
      <button id="focus-pause" class="btn">Pausar</button>
    </div>
  `;

  showModal(content, { showClose: false });

  document.getElementById('focus-done').onclick = () => {
    hideModal();
    showAfter5MinModal(knotId);
  };

  document.getElementById('focus-pause').onclick = () => {
    hideModal();
    handlePauseDoing(knotId);
  };

  const timerEl = document.getElementById('focus-timer');
  timerEl.className = 'focus-timer timer-green';

  const interval = setInterval(() => {
    if (!__timerState.running || __timerState.knotId !== knotId) {
      clearInterval(interval);
      return;
    }

    const left = Math.max(0, __timerState.endAt - Date.now());
    const totalSeconds = Math.ceil(left / 1000);

    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;

    if (totalSeconds <= 60) {
      timerEl.className = 'focus-timer timer-red';
    } else if (totalSeconds <= 120) {
      timerEl.className = 'focus-timer timer-yellow';
    } else {
      timerEl.className = 'focus-timer timer-green';
    }

    if (totalSeconds <= 0) {
      clearInterval(interval);
      timerEl.textContent = '00:00';
      setTimeout(() => {
        hideModal();
        showAfter5MinModal(knotId);
      }, 300);
    }
  }, 300);
}

function showAfter5MinModal(knotId) {
  const knot = getKnotById(knotId);
  if (!knot) return;

  const content = `
    <h3>5 minutos listos</h3>
    <div class="notice">
      Bien. ¿Qué hacemos con <b>${escapeHTML(knot.title)}</b>?
    </div>

    <div class="row">
      <button id="a-repeat" class="btn btn-primary">Repetir 5 min</button>
      <button id="a-pause" class="btn">Pausar</button>
      <button id="a-done" class="btn">Marcar HECHO</button>
    </div>

    <div class="hint">
      Tip: si no terminó, lo normal es <b>pausar</b> o <b>repetir</b>.
    </div>
  `;

  showModal(content, { showClose: false });

  document.getElementById('a-repeat').onclick = () => {
    hideModal();
    startFiveMin(knotId);
    showFocus5MinModal(knotId);
  };

  document.getElementById('a-pause').onclick = () => {
    hideModal();
    handlePauseDoing(knotId);
  };

  document.getElementById('a-done').onclick = () => {
    hideModal();
    handleDone(knotId);
  };
}

// Init UI
document.addEventListener('DOMContentLoaded', function () {
  setQuickEditHidden(isQuickEditHidden());
});
