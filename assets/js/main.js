/* ============================================================
   Hertz Sync Sound Design — interactions
   ============================================================ */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toast ---------- */
  var toast = $('#toast');
  var toastMsg = $('#toastMsg');
  var toastTimer;
  function showToast(message) {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 3200);
  }

  /* ---------- Header / scroll progress ---------- */
  var header = $('#siteHeader');
  var progress = $('#scrollProgress');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 12);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var navToggle = $('#navToggle');
  var mobileNav = $('#mobileNav');
  function closeNav() {
    if (!mobileNav || !navToggle) return;
    mobileNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('a', mobileNav).forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* ---------- App workspace tabs ---------- */
  var navButtons = $$('.app-nav');
  var panels = $$('.app-view');
  function setView(view) {
    navButtons.forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === view);
    });
    panels.forEach(function (p) {
      p.classList.toggle('is-active', p.getAttribute('data-panel') === view);
    });
  }
  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setView(btn.getAttribute('data-view'));
    });
  });

  /* ---------- Search filtering ---------- */
  var searchInput = $('#demoSearch');
  var filterChips = $$('.filter-chip');
  var resultRows = $$('#searchList .result-row');
  var searchEmpty = $('#searchEmpty');
  var activeCat = 'all';

  function applyFilter() {
    var q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var visible = 0;
    resultRows.forEach(function (row) {
      var catOK = activeCat === 'all' || row.getAttribute('data-cat') === activeCat;
      var text = row.getAttribute('data-search') || '';
      var queryOK = !q || text.toLowerCase().indexOf(q) !== -1;
      var show = catOK && queryOK;
      row.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });
    if (searchEmpty) searchEmpty.hidden = visible > 0;
  }

  filterChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      activeCat = chip.getAttribute('data-filter') || 'all';
      filterChips.forEach(function (c) { c.classList.toggle('is-active', c === chip); });
      applyFilter();
    });
  });
  if (searchInput) searchInput.addEventListener('input', applyFilter);

  /* ---------- Favorites ---------- */
  $$('.row-fav').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var on = btn.classList.toggle('is-fav');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Remove from favorites' : 'Add to favorites');
    });
  });

  /* ---------- Waveform bars ---------- */
  var seed = 20261115;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  $$('.row-wave').forEach(function (wave) {
    for (var i = 0; i < 18; i++) {
      var bar = document.createElement('i');
      var h = 24 + Math.round(rand() * 76);
      bar.style.height = h + '%';
      wave.appendChild(bar);
    }
  });

  var demoWave = $('#demoWave');
  if (demoWave) {
    var playhead = $('#demoPlayhead');
    for (var j = 0; j < 62; j++) {
      var barEl = document.createElement('i');
      var t = j / 62;
      var envelope = 0.4 + 0.6 * Math.sin(Math.PI * t);
      var h2 = Math.round((16 + rand() * 78) * envelope);
      barEl.style.height = Math.max(6, h2) + '%';
      demoWave.appendChild(barEl);
    }
    if (playhead) demoWave.appendChild(playhead);
  }

  /* ---------- Simulated transport ---------- */
  var appWindow = $('#appWindow');
  var masterPlay = $('#masterPlay');
  var playerTitle = $('#playerTitle');
  var playerHint = $('#playerHint');
  var playerProgress = $('#playerProgress');
  var playerTime = $('#playerTime');
  var player = { name: null, playing: false, elapsed: 0, duration: 4.4, raf: null, last: 0 };
  var defaultHint = 'Press <span class="mono">▶</span> on any sound to audition';

  function fmt(sec) {
    var s = Math.floor(sec);
    return '0:' + (s < 10 ? '0' + s : s);
  }

  function resetRows() {
    $$('.sound-row').forEach(function (row) { row.classList.remove('is-playing'); });
    $$('.demo-result').forEach(function (row) { row.classList.remove('is-playing'); });
  }

  function activePanelSound() {
    var panel = $('.app-view.is-active');
    var btn = panel ? $('.row-play', panel) : null;
    return btn ? btn.getAttribute('data-sound') : null;
  }

  function findRow(name) {
    var matches = $$('.sound-row').filter(function (row) {
      var btn = $('.row-play', row);
      return btn && btn.getAttribute('data-sound') === name;
    });
    var visible = matches.filter(function (row) {
      var panel = row.closest('.app-view');
      return panel && panel.classList.contains('is-active');
    });
    return visible[0] || matches[0] || null;
  }

  function paintPlayer() {
    if (appWindow) appWindow.classList.toggle('is-playing', player.playing);
    if (masterPlay) masterPlay.setAttribute('aria-label', player.playing ? 'Pause audition' : 'Play audition');
    if (playerTitle) playerTitle.textContent = player.name || 'Nothing playing';
    if (playerHint) {
      playerHint.innerHTML = player.playing
        ? 'Simulated local audition · no audio uploaded'
        : defaultHint;
    }
    if (playerTime) playerTime.textContent = fmt(player.elapsed);
    if (playerProgress) {
      var pct = player.duration ? (player.elapsed / player.duration) * 100 : 0;
      playerProgress.style.width = Math.min(100, pct) + '%';
    }
  }

  function stopPlayer() {
    player.playing = false;
    if (player.raf) cancelAnimationFrame(player.raf);
    player.raf = null;
    resetRows();
    paintPlayer();
  }

  function tick(ts) {
    if (!player.playing) return;
    if (!player.last) player.last = ts;
    player.elapsed += (ts - player.last) / 1000;
    player.last = ts;
    if (player.elapsed >= player.duration) {
      player.elapsed = 0;
      player.playing = false;
      resetRows();
      paintPlayer();
      player.raf = null;
      return;
    }
    paintPlayer();
    player.raf = requestAnimationFrame(tick);
  }

  function playSound(name, duration, rowEl) {
    if (player.playing && player.name === name && (!rowEl || rowEl.classList.contains('is-playing'))) {
      stopPlayer();
      return;
    }
    stopPlayer();
    player.name = name;
    player.duration = duration || 4.4;
    player.elapsed = 0;
    player.last = 0;
    player.playing = true;
    var row = rowEl || findRow(name);
    if (row) row.classList.add('is-playing');
    paintPlayer();
    player.raf = requestAnimationFrame(tick);
  }

  function parseLen(text) {
    var parts = text.split(':').map(Number);
    var sec = 0;
    for (var i = 0; i < parts.length; i++) sec = sec * 60 + (parts[i] || 0);
    return Math.min(8, Math.max(3, sec || 4.4));
  }

  $$('.sound-row .row-play').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('.sound-row');
      var len = $('.row-len', row);
      playSound(btn.getAttribute('data-sound'), len ? parseLen(len.textContent.trim()) : 4.4, row);
    });
  });

  if (masterPlay) {
    masterPlay.addEventListener('click', function () {
      if (player.playing) {
        stopPlayer();
      } else {
        playSound(player.name || activePanelSound() || 'AMBWeather_Rain_Roof_Heavy_03.wav', 4.4);
      }
    });
  }

  /* ---------- Demo player in feature 01 ---------- */
  var demoPlayer = $('#searchDemo .demo-player');
  var demoPlayBtn = $('#demoPlay');
  var demoTimeout;
  function stopDemo() {
    if (!demoPlayer) return;
    demoPlayer.classList.remove('is-demo-playing');
    $$('.demo-result').forEach(function (r) { r.classList.remove('is-playing'); });
  }
  function playDemo(rowEl) {
    if (!demoPlayer) return;
    demoPlayer.classList.remove('is-demo-playing');
    void demoPlayer.offsetWidth;
    demoPlayer.classList.add('is-demo-playing');
    $$('.demo-result').forEach(function (r) { r.classList.remove('is-playing'); });
    if (rowEl) rowEl.classList.add('is-playing');
    clearTimeout(demoTimeout);
    demoTimeout = setTimeout(stopDemo, reduceMotion ? 800 : 6000);
  }
  if (demoPlayBtn) {
    demoPlayBtn.addEventListener('click', function () {
      if (demoPlayer && demoPlayer.classList.contains('is-demo-playing')) {
        stopDemo();
      } else {
        playDemo(null);
      }
    });
  }
  $$('[data-demo-play]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('.demo-result');
      if (row && row.classList.contains('is-playing')) {
        stopDemo();
      } else {
        playDemo(row);
      }
    });
  });

  /* ---------- Accept UCS flow ---------- */
  var suggestionCount = 188;
  function maybeReviewEmpty() {
    var list = $('#reviewList');
    if (!list || $('.review-row', list) || $('.review-empty', list)) return;
    suggestionCount = 0;
    syncSuggestions();
    list.insertAdjacentHTML('beforeend',
      '<div class="review-empty">' +
        '<svg class="icon"><use href="#i-check-circle"/></svg>' +
        '<strong>Review queue cleared</strong>' +
        '<span>Suggestions processed. All changes can be undone.</span>' +
      '</div>');
  }
  function syncSuggestions() {
    $$('[data-suggestion-count]').forEach(function (el) { el.textContent = suggestionCount; });
    $$('[data-suggestion-badge]').forEach(function (el) { el.textContent = suggestionCount; });
    var acceptAll = $('#acceptAll');
    if (acceptAll && suggestionCount <= 0) {
      acceptAll.innerHTML = '<svg class="icon"><use href="#i-check"/></svg> All done';
      acceptAll.disabled = true;
      acceptAll.style.opacity = '0.6';
      acceptAll.style.cursor = 'default';
    }
  }

  $$('[data-accept]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('.review-row');
      if (!row || row.classList.contains('is-accepted')) return;
      row.classList.add('is-accepted');
      suggestionCount = Math.max(0, suggestionCount - 1);
      syncSuggestions();
      setTimeout(function () { row.remove(); maybeReviewEmpty(); }, 340);
      showToast('Suggestion accepted. The category is saved in the local index.');
    });
  });

  var acceptAll = $('#acceptAll');
  if (acceptAll) {
    acceptAll.addEventListener('click', function () {
      var rows = $$('.review-row');
      if (!rows.length) return;
      var total = suggestionCount || 188;
      rows.forEach(function (row, i) {
        setTimeout(function () {
          row.classList.add('is-accepted');
          setTimeout(function () { row.remove(); maybeReviewEmpty(); }, 320);
        }, i * 80);
      });
      suggestionCount = 0;
      syncSuggestions();
      showToast('Accepted all ' + total + ' suggestions. Categories are saved in the local index.');
    });
  }

  /* ---------- UCS section demo ---------- */
  $$('[data-ucs-accept]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var box = btn.closest('.ucs-suggest');
      if (box) box.classList.add('is-accepted');
      btn.innerHTML = '<svg class="icon"><use href="#i-check"/></svg> Suggestion accepted';
      btn.disabled = true;
      showToast('Suggestion accepted. You can still edit or batch-rename.');
    });
  });

  /* ---------- Metadata actions ---------- */
  $$('[data-meta-save]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showToast('Metadata saved to the local index.');
    });
  });
  $$('[data-csv]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showToast('CSV list written. Review it in batch management.');
    });
  });

  /* ---------- Send to Reaper ---------- */
  var reaperDemo = $('#reaperDemo');
  var reaperTimer;
  function sendToReaper(mode) {
    if (reaperDemo) {
      reaperDemo.classList.remove('is-sent');
      void reaperDemo.offsetWidth;
      reaperDemo.classList.add('is-sent');
      clearTimeout(reaperTimer);
      reaperTimer = setTimeout(function () { reaperDemo.classList.remove('is-sent'); }, 1200);
    }
    showToast(mode === 'tracks'
      ? 'Created a track-per-category project.'
      : 'Sent to the Reaper edit cursor.');
  }
  $$('[data-send]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sendToReaper(btn.getAttribute('data-send'));
    });
  });

  /* ---------- Generic toast triggers ---------- */
  $$('[data-toast]').forEach(function (el) {
    el.addEventListener('click', function () { showToast(el.getAttribute('data-toast')); });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Footer year ---------- */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
