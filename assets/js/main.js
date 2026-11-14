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

  /* ---------- Cursor spotlight ---------- */
  $$('.card-spotlight').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

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

  /* ---------- Simulated transport ---------- */
  var appWindow = $('#appWindow');
  var masterPlay = $('#masterPlay');
  var playerTitle = $('#playerTitle');
  var playerHint = $('#playerHint');
  var playerProgress = $('#playerProgress');
  var playerTime = $('#playerTime');
  var player = { name: null, playing: false, elapsed: 0, duration: 4.4, raf: null, last: 0 };
  var defaultHint = 'Press <span class="mono">▶</span> on any sound to preview';

  function fmt(sec) {
    var s = Math.floor(sec);
    return '0:' + (s < 10 ? '0' + s : s);
  }

  function resetRows() {
    $$('.sound-row').forEach(function (row) { row.classList.remove('is-playing'); });
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
    if (masterPlay) masterPlay.setAttribute('aria-label', player.playing ? 'Pause preview' : 'Play preview');
    if (playerTitle) playerTitle.textContent = player.name || 'Nothing playing';
    if (playerHint) {
      playerHint.innerHTML = player.playing
        ? 'Simulated local preview · no audio uploaded'
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

  $$('.row-play').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('.sound-row');
      var len = $('.row-len', row);
      var parsed = 4.4;
      if (len) {
        var raw = len.textContent.trim();
        var parts = raw.split(':').map(Number);
        if (parts.length === 3) parsed = Math.min(9, Math.max(3, parts[2] || 4));
      }
      playSound(btn.getAttribute('data-sound'), parsed, row);
    });
  });

  if (masterPlay) {
    masterPlay.addEventListener('click', function () {
      if (player.playing) {
        stopPlayer();
      } else {
        playSound(player.name || 'UI Click 06.wav', 4.4);
      }
    });
  }

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
        '<span>1,231 files tagged · every change reversible</span>' +
      '</div>');
  }
  function syncSuggestions() {
    $$('[data-suggestion-count]').forEach(function (el) { el.textContent = suggestionCount; });
    $$('[data-suggestion-badge]').forEach(function (el) { el.textContent = suggestionCount; });
    var acceptAll = $('#acceptAll');
    if (acceptAll) {
      if (suggestionCount <= 0) {
        acceptAll.innerHTML = '<svg class="icon"><use href="#i-check"/></svg> Queue cleared';
        acceptAll.disabled = true;
        acceptAll.style.opacity = '0.6';
        acceptAll.style.cursor = 'default';
      }
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
      showToast('UCS category accepted — tag saved to local index.');
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
      showToast('All ' + total + ' suggestions accepted — tags written locally.');
    });
  }

  /* ---------- Slicer ---------- */
  var wave = $('#slicerWave');
  var slicerDisplay = $('.slicer-display');
  var slicerPlay = $('#slicerPlay');
  var sliceToggle = $('#sliceToggle');
  var sliceExport = $('#sliceExport');
  var slicerPlayhead = $('#slicerPlayhead');
  var slicerTimeout;

  if (wave) {
    var TOTAL_BARS = 112;
    var seed = 20261115;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    for (var i = 0; i < TOTAL_BARS; i++) {
      var t = i / TOTAL_BARS;
      var envelope = 0.42 + 0.58 * Math.sin(Math.PI * t);
      var cluster = 0.45 + 0.55 * Math.abs(Math.sin(t * Math.PI * 9));
      var h = Math.round((10 + rand() * 58) * envelope * cluster);
      if (rand() < 0.07) h = 3;
      var bar = document.createElement('i');
      bar.style.height = Math.max(3, Math.min(96, h)) + '%';
      bar.style.opacity = (0.35 + rand() * 0.6).toFixed(2);
      wave.appendChild(bar);
    }

    var markerPositions = [7, 14, 22, 31, 37, 45, 53, 61, 68, 76, 84, 91, 96];
    markerPositions.forEach(function (p) {
      var m = document.createElement('span');
      m.className = 'slice-marker';
      m.style.left = p + '%';
      if (slicerDisplay) slicerDisplay.appendChild(m);
    });
  }

  function playSlicer() {
    if (!slicerDisplay) return;
    slicerDisplay.classList.remove('is-playing');
    if (slicerPlayhead) slicerPlayhead.style.animation = 'none';
    void slicerDisplay.offsetWidth;
    if (slicerPlayhead) slicerPlayhead.style.animation = '';
    slicerDisplay.classList.add('is-playing');
    clearTimeout(slicerTimeout);
    slicerTimeout = setTimeout(function () {
      slicerDisplay.classList.remove('is-playing');
    }, reduceMotion ? 600 : 6600);
    showToast('Previewing 214 sliced one-shots from the local engine.');
  }

  if (slicerPlay) slicerPlay.addEventListener('click', playSlicer);

  if (sliceToggle) {
    sliceToggle.addEventListener('click', function () {
      if (!slicerDisplay) return;
      var on = slicerDisplay.classList.toggle('show-slices');
      sliceToggle.innerHTML = '<svg class="icon"><use href="#i-scissors"/></svg> ' + (on ? 'Hide markers' : 'Show markers');
    });
  }

  if (sliceExport) {
    sliceExport.addEventListener('click', function () {
      showToast('Exporting 214 slices with UCS names — all cores engaged.');
    });
  }

  /* ---------- Generic toast triggers ---------- */
  $$('[data-toast]').forEach(function (el) {
    el.addEventListener('click', function () { showToast(el.getAttribute('data-toast')); });
  });
  $$('[data-checkout]').forEach(function (el) {
    el.addEventListener('click', function () {
      showToast('Opening secure offline checkout — Pro Lifetime $59.90.');
    });
  });
  $$('[data-download]').forEach(function (el) {
    el.addEventListener('click', function () {
      showToast('Preparing macOS & Windows build v1.1.0 — no account needed.');
    });
  });

  /* ---------- FAQ accordion ---------- */
  $$('.faq-item').forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      $$('.faq-item').forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ---------- Newsletter ---------- */
  var newsletter = $('#newsletterForm');
  if (newsletter) {
    newsletter.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('#newsletterEmail');
      if (input && input.value) {
        showToast('Subscribed — field notes arrive once a month.');
        newsletter.reset();
      }
    });
  }

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
