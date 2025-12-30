// file: app.js
// Bootstrap + navegación + wiring de botones globales

document.addEventListener('DOMContentLoaded', function () {
  initStore();

  try {
    if (typeof setQuickEditHidden === 'function' && typeof isQuickEditHidden === 'function') {
      setQuickEditHidden(isQuickEditHidden());
    }
  } catch (_) {}

  checkNudgeOnLoad();

  renderToday();
  updateCaptureButton();

  var btnToday = document.getElementById('nav-today');
  var btnInsights = document.getElementById('nav-insights');

  if (btnToday) {
    btnToday.addEventListener('click', function () {
      showSection('section-today');
      renderToday();
    });
  }

  if (btnInsights) {
    btnInsights.addEventListener('click', function () {
      showSection('section-insights');
      renderInsights();
    });
  }

  var btnCapture = document.getElementById('btn-capture');
  if (btnCapture) btnCapture.addEventListener('click', handleCaptureClick);

  var btnExport = document.getElementById('btn-export');
  if (btnExport) btnExport.addEventListener('click', exportData);

  var btnImport = document.getElementById('btn-import');
  if (btnImport) {
    btnImport.addEventListener('click', function () {
      document.getElementById('input-import').click();
    });
  }

  var inputImport = document.getElementById('input-import');
  if (inputImport) inputImport.addEventListener('change', importData);

  var btnSoft = document.getElementById('btn-soft');
  var btnPanic = document.getElementById('btn-panic');

  if (btnSoft && typeof pickSoftTask === 'function') btnSoft.addEventListener('click', pickSoftTask);
  if (btnPanic && typeof panicNoThink === 'function') btnPanic.addEventListener('click', panicNoThink);

  // ✅ Toggle sliders mini
  var btnQuickToggle = document.getElementById('btn-quick-toggle');
  if (btnQuickToggle && typeof setQuickEditHidden === 'function' && typeof isQuickEditHidden === 'function') {
    btnQuickToggle.addEventListener('click', function () {
      setQuickEditHidden(!isQuickEditHidden());
      renderToday();
    });
  }

  // filtros backlog
  var fFriction = document.getElementById('filter-friction');
  var fImpact = document.getElementById('filter-impact');
  var fRecent = document.getElementById('filter-recent');

  if (fFriction) fFriction.addEventListener('click', function () { backlogSortMode = 'friction'; renderToday(); });
  if (fImpact) fImpact.addEventListener('click', function () { backlogSortMode = 'impact'; renderToday(); });
  if (fRecent) fRecent.addEventListener('click', function () { backlogSortMode = 'recent'; renderToday(); });

  // ✅ Cerrar panel detalle
  var closeBtn = document.getElementById('knot-detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      var detail = document.getElementById('knot-detail');
      if (detail) detail.style.display = 'none';
    });
  }
});

function showSection(sectionId) {
  document.querySelectorAll('main > section').forEach(function (sec) {
    sec.style.display = (sec.id === sectionId) ? 'block' : 'none';
  });
  var detail = document.getElementById('knot-detail');
  if (detail) detail.style.display = 'none';
}

function checkNudgeOnLoad() {
  var knots = getKnots();
  var now = Date.now();
  var staleUnlockables = knots.filter(function (k) {
    return k.status === 'UNLOCKABLE' && (now - (k.lastTouchedAt || k.createdAt || now)) > (48 * 60 * 60 * 1000);
  });

  if (staleUnlockables.length > 0) {
    var knotId = staleUnlockables[0].id;
    var days = Math.floor((now - staleUnlockables[0].lastTouchedAt) / (24 * 60 * 60 * 1000));
    showModal(
      '<h3>Recordatorio</h3>' +
      '<div class="notice">Evitado hace <b>' + days + '</b> día(s). Hacelo 5 min, dividilo, o mandalo a ALGÚN DÍA.</div>',
      { showClose: true }
    );
    logEvent('NUDGE_SHOWN', { reason: 'UNLOCKABLE_STALE_48H', knotId: knotId });
  }
}

function handleCaptureClick() {
  var result = canCaptureNewKnot();
  if (!result.canCapture) {
    if (typeof showSystemFullModal === 'function') showSystemFullModal(result.message);
    else showModal('<div class="notice">' + escapeHTML(result.message) + '</div>');
    logEvent('NUDGE_SHOWN', { reason: 'CAPTURE_BLOCKED_SYSTEM_FULL' });
    return;
  }

  if (typeof showCaptureModal === 'function') {
    showCaptureModal();
  } else {
    showModal('<div class="notice">Falta showCaptureModal() en ui.js</div>');
  }
}

function updateCaptureButton() {
  var result = canCaptureNewKnot();
  var btn = document.getElementById('btn-capture');
  if (btn) btn.disabled = !result.canCapture;
}
