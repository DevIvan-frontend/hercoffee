/* =====================================================================
   Her Coffee · interacciones
   - Idioma automático (es / en) + selector manual
   - Menú por categorías con caliente/frío y "Sorpréndeme"
   - Galería con lightbox y zoom (rueda, doble clic/tap, pellizco, arrastre)
   - Reserva por WhatsApp con mensaje prellenado
   - Estado abierto/cerrado con la hora de La Paz y mapa interactivo
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var WA_URL = 'https://wa.me/526121313403';
  var GMAPS_URL = 'https://www.google.com/maps/place/Her+Coffee+La+Paz/@24.1448295,-110.3193137,17z/data=!4m6!3m5!1s0x86afd3a137245aef:0xd234e349f4f9a125!8m2!3d24.1449727!4d-110.3166223!16s%2Fg%2F11yydyd4v0';
  var COORDS = [24.1449727, -110.3166223];
  var OPEN_HOUR = 7, CLOSE_HOUR = 22;          // 7:00 am – 10:00 pm, todos los días
  var TIMEZONE = 'America/Mazatlan';           // Baja California Sur (UTC-7)

  var I18N = window.HC_I18N, MENU = window.HC_MENU, GALLERY = window.HC_GALLERY;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =================================================================
     Idioma
     ================================================================= */
  function detectLang() {
    try {
      var saved = localStorage.getItem('hc-lang');
      if (saved === 'es' || saved === 'en') return saved;
    } catch (e) { /* almacenamiento no disponible */ }
    var device = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    return device.indexOf('es') === 0 ? 'es' : 'en';   // español → es, cualquier otro → en
  }
  var lang = detectLang();

  function t(key) {
    var d = I18N[lang] || {};
    if (d[key] != null) return d[key];
    return I18N.en[key] != null ? I18N.en[key] : key;
  }
  function fmt(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
  }

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (typeof v === 'string') el.innerHTML = v;
    });
    $$('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var i = pair.indexOf(':');
        if (i < 0) return;
        el.setAttribute(pair.slice(0, i).trim(), t(pair.slice(i + 1).trim()));
      });
    });
    $$('.lang button').forEach(function (b) {
      var on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var badge = $('#badgeText');
    if (badge) badge.textContent = t('hero.badge');

    renderMarquee();
    renderTabs();
    renderPanel();
    renderGallery();
    updateOpenStatus();
    updateMapPopup();
  }

  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = b.getAttribute('data-lang');
      if (next === lang) return;
      lang = next;
      try { localStorage.setItem('hc-lang', lang); } catch (e) { /* ignorar */ }
      applyLang();
    });
  });

  /* =================================================================
     Cinta de madera (marquee)
     ================================================================= */
  function renderMarquee() {
    var track = $('#marqueeTrack');
    var items = t('marquee');
    if (!track || !Array.isArray(items)) return;
    var html = items.map(function (txt) {
      return '<span class="marquee__item"><svg class="ic"><use href="#i-sparkle"/></svg>' + txt + '</span>';
    }).join('');
    track.innerHTML = html + html + html + html;   // 4 copias → loop continuo en pantallas anchas
  }

  /* =================================================================
     Menú
     ================================================================= */
  var activeCat = MENU[0].id;
  var temp = 'hot';
  var tabsEl = $('#menuTabs'), panelEl = $('#menuPanel'), segEl = $('#tempSeg'), noteEl = $('#menuHiddenNote');

  function money(n) { return '$' + n; }
  function priceCell(v) {
    return v == null ? '<span class="mi__price is-na">—</span>' : '<span class="mi__price">' + money(v) + '</span>';
  }
  function starIcon(it) { return it.star ? '<svg class="ic ic--sp" aria-hidden="true"><use href="#i-sparkle"/></svg>' : ''; }

  function renderTabs() {
    tabsEl.innerHTML = MENU.map(function (c) {
      var on = c.id === activeCat;
      return '<button type="button" role="tab" class="tab' + (on ? ' is-active' : '') + '" data-cat="' + c.id + '" aria-selected="' + on + '">' + c.label[lang] + '</button>';
    }).join('');
  }

  function centerTab(btn) {
    var r = btn.getBoundingClientRect(), cr = tabsEl.getBoundingClientRect();
    var left = tabsEl.scrollLeft + (r.left + r.width / 2) - (cr.left + cr.width / 2);
    if (tabsEl.scrollTo) tabsEl.scrollTo({ left: left, behavior: reduceMotion ? 'auto' : 'smooth' });
    else tabsEl.scrollLeft = left;
  }

  function setCat(id) {
    var exists = MENU.some(function (c) { return c.id === id; });
    if (!exists) return;
    activeCat = id;
    $$('.tab', tabsEl).forEach(function (b) {
      var on = b.getAttribute('data-cat') === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) centerTab(b);
    });
    renderPanel();
  }

  function setTemp(v) {
    temp = v;
    $$('button', segEl).forEach(function (b) {
      var on = b.getAttribute('data-temp') === v;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    renderPanel();
  }

  function renderPanel() {
    var cat = MENU.filter(function (c) { return c.id === activeCat; })[0];
    if (!cat) return;
    segEl.hidden = !cat.temp;
    var html = '', i = 0, hidden = 0;

    if (cat.temp) {
      html += '<div class="mi-head"><span></span><span>' + t('menu.oz12') + '</span><span>' + t('menu.oz16') + '</span></div>';
      cat.items.forEach(function (it, idx) {
        var key = cat.id + ':' + idx;
        var desc = it.d && it.d[lang] ? '<span class="mi__desc">' + it.d[lang] + '</span>' : '';
        if (it.single) {
          html += '<div class="mi mi--sizes" data-key="' + key + '" style="--i:' + (i++) + '"><span class="mi__name">' + it.n[lang] + starIcon(it) + '<span class="size">' + it.single.size + '</span></span><span></span>' + priceCell(it.single.price) + '</div>';
          return;
        }
        if (it.price !== undefined) {   // precio único dentro de una categoría con temperaturas
          var p = it.price == null ? '<span class="mi__price is-ask">' + t('menu.askPrice') + '</span>' : priceCell(it.price);
          html += '<div class="mi mi--sizes" data-key="' + key + '" style="--i:' + (i++) + '"><span class="mi__name">' + it.n[lang] + starIcon(it) + '</span><span></span>' + p + desc + '</div>';
          return;
        }
        var prices = it[temp];
        if (!prices) { hidden++; return; }
        html += '<div class="mi mi--sizes" data-key="' + key + '" style="--i:' + (i++) + '"><span class="mi__name">' + it.n[lang] + starIcon(it) + '</span>' + priceCell(prices[0]) + priceCell(prices[1]) + desc + '</div>';
      });
    } else {
      cat.items.forEach(function (it, idx) {
        var key = cat.id + ':' + idx;
        var desc = it.d && it.d[lang] ? '<span class="mi__desc">' + it.d[lang] + '</span>' : '';
        var chips = it.v ? '<span class="mi__chips">' + it.v[lang].map(function (x) { return '<span class="chip">' + x + '</span>'; }).join('') + '</span>' : '';
        var p = it.price == null ? '<span class="mi__price is-ask">' + t('menu.askPrice') + '</span>' : priceCell(it.price);
        html += '<div class="mi" data-key="' + key + '" style="--i:' + (i++) + '"><span class="mi__name">' + it.n[lang] + starIcon(it) + '</span>' + p + desc + chips + '</div>';
      });
    }
    panelEl.innerHTML = html;

    if (cat.temp && hidden) {
      noteEl.innerHTML = fmt(t(temp === 'hot' ? 'menu.hiddenHot' : 'menu.hiddenIced'), { n: hidden });
      noteEl.hidden = false;
    } else {
      noteEl.hidden = true;
      noteEl.innerHTML = '';
    }
  }

  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]');
    if (b) setCat(b.getAttribute('data-cat'));
  });
  segEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-temp]');
    if (b) setTemp(b.getAttribute('data-temp'));
  });
  noteEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-switch-temp]');
    if (b) setTemp(b.getAttribute('data-switch-temp'));
  });
  $$('[data-cat-link]').forEach(function (a) {
    a.addEventListener('click', function () { setCat(a.getAttribute('data-cat-link')); });
  });

  /* ---- Sorpréndeme ---- */
  var toastTimer;
  function showToast(html) {
    var el = $('#toast');
    if (!el) return;
    el.innerHTML = html;
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('is-on');
      setTimeout(function () { el.hidden = true; }, 500);
    }, 4500);
  }

  $('#surpriseBtn').addEventListener('click', function () {
    var pool = [];
    MENU.forEach(function (c) {
      if (c.id === 'otras' || c.id === 'extras') return;
      c.items.forEach(function (it, idx) { if (it.price !== null) pool.push({ c: c, it: it, idx: idx }); });
    });
    var pick = pool[Math.floor(Math.random() * pool.length)];
    var it = pick.it, priceLabel;

    if (pick.c.temp && !it.single && it.price === undefined && !it[temp]) setTemp(it.hot ? 'hot' : 'iced');
    setCat(pick.c.id);

    if (it.single) priceLabel = money(it.single.price) + ' · ' + it.single.size;
    else if (it.price !== undefined) priceLabel = money(it.price);
    else {
      var pr = it[temp], val = pr[0] != null ? pr[0] : pr[1];
      priceLabel = money(val) + ' · ' + (pr[0] != null ? t('menu.oz12') : t('menu.oz16')) + ' · ' + t(temp === 'hot' ? 'menu.hot' : 'menu.iced').toLowerCase();
    }

    var row = panelEl.querySelector('[data-key="' + pick.c.id + ':' + pick.idx + '"]');
    $$('.mi.is-picked', panelEl).forEach(function (r) { r.classList.remove('is-picked'); });
    if (row) {
      row.classList.add('is-picked');
      var r = row.getBoundingClientRect();   // solo scroll vertical de la ventana
      window.scrollTo({ top: window.scrollY + r.top - (window.innerHeight - r.height) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    showToast('<svg class="ic ic--sp"><use href="#i-sparkle"/></svg><div><small>' + t('menu.surpriseMsg') + '</small><strong>' + it.n[lang] + '</strong> · ' + priceLabel + '</div>');
  });

  /* ---- Ver menú original (fotos del menú) ---- */
  $('#viewOriginalBtn').addEventListener('click', function () {
    openLightbox([
      { src: 'assets/img/menu/menu-1.webp', title: t('menu.originalTitle') + ' · 1/2', sub: MENU[0].label[lang] + ' · ' + MENU[1].label[lang] + ' · ' + MENU[2].label[lang] },
      { src: 'assets/img/menu/menu-2.webp', title: t('menu.originalTitle') + ' · 2/2', sub: MENU[3].label[lang] + ' · ' + MENU[4].label[lang] + ' · ' + MENU[5].label[lang] }
    ], 0);
  });

  /* =================================================================
     Galería
     ================================================================= */
  function galleryItems() {
    return GALLERY.map(function (g) {
      return { src: 'assets/img/gallery/' + g.id + '.webp', thumb: 'assets/img/thumbs/' + g.id + '.webp', title: g.t[lang], sub: g.s[lang], size: g.size };
    });
  }
  function renderGallery() {
    var grid = $('#galleryGrid');
    if (!grid) return;
    grid.innerHTML = galleryItems().map(function (it, i) {
      return '<button type="button" class="g-item' + (it.size ? ' g-item--' + it.size : '') + ' reveal" style="--delay:' + ((i % 6) * 0.06) + 's" data-index="' + i + '" aria-label="' + it.title + ' — ' + t('gallery.open') + '">' +
        '<img src="' + it.thumb + '" alt="' + it.title + '" loading="lazy" decoding="async">' +
        '<span class="g-item__cap">' + it.title + '<small>' + it.sub + '</small></span>' +
        '<svg class="sparkle" aria-hidden="true"><use href="#i-sparkle"/></svg></button>';
    }).join('');
    observeReveals(grid);
  }
  $('#galleryGrid').addEventListener('click', function (e) {
    var b = e.target.closest('.g-item');
    if (b) openLightbox(galleryItems(), +b.getAttribute('data-index'));
  });

  /* =================================================================
     Lightbox con zoom
     ================================================================= */
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbStage = $('#lbStage');
  var lbTitle = $('#lbTitle'), lbSub = $('#lbSub'), lbCount = $('#lbCount'), lbZoomVal = $('#lbZoomVal');
  var lbItems = [], lbIndex = 0, scale = 1, tx = 0, ty = 0, lastFocus = null;
  var MIN_SCALE = 1, MAX_SCALE = 4;

  function openLightbox(items, index) {
    lbItems = items;
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    showAt(index);
    $('.lb__close').focus();
  }
  function closeLightbox() {
    lb.hidden = true;
    document.body.style.overflow = '';
    lbImg.removeAttribute('src');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function showAt(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    var it = lbItems[lbIndex];
    lbImg.classList.add('is-switching');
    var pre = new Image();
    pre.onload = pre.onerror = function () {
      lbImg.src = it.src;
      lbImg.alt = it.title;
      resetZoom();
      lbImg.classList.remove('is-switching');
    };
    pre.src = it.src;
    lbTitle.textContent = it.title;
    lbSub.textContent = it.sub || '';
    lbCount.textContent = (lbIndex + 1) + ' ' + t('lb.of') + ' ' + lbItems.length;
    var single = lbItems.length < 2;
    $('[data-lb-prev]').hidden = single;
    $('[data-lb-next]').hidden = single;
  }

  function applyTransform() {
    lbImg.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
    lbZoomVal.textContent = Math.round(scale * 100) + '%';
    lbStage.classList.toggle('is-zoomed', scale > 1);
  }
  function resetZoom() { scale = 1; tx = 0; ty = 0; applyTransform(); }
  function clampPan() {
    var s = lbStage.getBoundingClientRect();
    var w = lbImg.offsetWidth * scale, h = lbImg.offsetHeight * scale;
    var maxX = Math.max(0, (w - s.width) / 2 + 40), maxY = Math.max(0, (h - s.height) / 2 + 40);
    tx = Math.min(maxX, Math.max(-maxX, tx));
    ty = Math.min(maxY, Math.max(-maxY, ty));
  }
  /* Acerca/aleja manteniendo fijo el punto (px, py) de la pantalla */
  function zoomTo(next, px, py) {
    next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    var st = lbStage.getBoundingClientRect();
    var cx = st.left + st.width / 2 + tx, cy = st.top + st.height / 2 + ty;
    if (px == null) { px = st.left + st.width / 2; py = st.top + st.height / 2; }
    var k = next / scale;
    tx += (px - cx) * (1 - k);
    ty += (py - cy) * (1 - k);
    scale = next;
    if (scale === 1) { tx = 0; ty = 0; }
    clampPan();
    applyTransform();
  }

  lbStage.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomTo(scale * Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY);
  }, { passive: false });

  lbStage.addEventListener('dblclick', function (e) {
    zoomTo(scale > 1 ? 1 : 2.5, e.clientX, e.clientY);
  });

  /* Arrastre (paneo), deslizar para cambiar de foto y pellizco para zoom */
  var pointers = {}, pointerCount = 0, pinch = null, drag = null, moved = false, lastTap = 0;
  function pointerList() { return Object.keys(pointers).map(function (k) { return pointers[k]; }); }

  lbStage.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button')) return;
    lbStage.setPointerCapture(e.pointerId);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    pointerCount = Object.keys(pointers).length;
    if (pointerCount === 1) {
      drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, time: Date.now(), target: e.target };
      moved = false;
      lbStage.classList.add('is-dragging');
    } else if (pointerCount === 2) {
      var p = pointerList();
      pinch = { dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), scale: scale };
      drag = null;
    }
  });
  lbStage.addEventListener('pointermove', function (e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pointerCount === 2 && pinch) {
      var p = pointerList();
      var dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      zoomTo(pinch.scale * (dist / pinch.dist), (p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2);
      moved = true;
      return;
    }
    if (pointerCount === 1 && drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      if (scale > 1) {
        tx = drag.tx + dx; ty = drag.ty + dy;
        clampPan(); applyTransform();
      } else {
        lbImg.style.transform = 'translate(' + (dx * 0.6) + 'px, 0)';   // gesto de deslizar
      }
    }
  });
  function endPointer(e) {
    if (!pointers[e.pointerId]) return;
    delete pointers[e.pointerId];
    pointerCount = Object.keys(pointers).length;
    if (pointerCount < 2) pinch = null;
    if (pointerCount === 0) {
      lbStage.classList.remove('is-dragging');
      if (drag) {
        var dx = e.clientX - drag.x, dt = Date.now() - drag.time;
        if (!moved) {
          if (drag.target === lbStage) { closeLightbox(); drag = null; return; }   // clic fuera de la foto
          var now = Date.now();
          if (now - lastTap < 320 && e.pointerType !== 'mouse') zoomTo(scale > 1 ? 1 : 2.5, e.clientX, e.clientY);   // doble tap
          lastTap = now;
          applyTransform();
        } else if (scale === 1 && Math.abs(dx) > 60 && dt < 600) {
          showAt(lbIndex + (dx < 0 ? 1 : -1));
        } else {
          applyTransform();
        }
      }
      drag = null;
    }
  }
  lbStage.addEventListener('pointerup', endPointer);
  lbStage.addEventListener('pointercancel', endPointer);

  $$('[data-lb-close]').forEach(function (el) { el.addEventListener('click', closeLightbox); });
  $('[data-lb-prev]').addEventListener('click', function () { showAt(lbIndex - 1); });
  $('[data-lb-next]').addEventListener('click', function () { showAt(lbIndex + 1); });
  $$('.lb__tools [data-zoom]').forEach(function (b) {
    b.addEventListener('click', function () {
      var z = b.getAttribute('data-zoom');
      if (z === 'in') zoomTo(scale * 1.35);
      else if (z === 'out') zoomTo(scale / 1.35);
      else resetZoom();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (!lb.hidden) {
      switch (e.key) {
        case 'Escape': closeLightbox(); break;
        case 'ArrowRight': showAt(lbIndex + 1); break;
        case 'ArrowLeft': showAt(lbIndex - 1); break;
        case '+': case '=': zoomTo(scale * 1.35); break;
        case '-': case '_': zoomTo(scale / 1.35); break;
        case '0': resetZoom(); break;
        case 'Tab': trapFocus(e); break;
      }
      return;
    }
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) closeNav();
  });
  function trapFocus(e) {
    var f = $$('button:not([hidden])', lb);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* =================================================================
     Animaciones al hacer scroll
     ================================================================= */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;

  function observeReveals(root) {
    $$('.reveal', root || document).forEach(function (el) {
      if (el.classList.contains('in')) return;
      if (io) io.observe(el); else el.classList.add('in');
    });
  }

  /* =================================================================
     Navegación
     ================================================================= */
  var nav = $('.nav'), burger = $('.burger'), waFloat = $('.wa-float'), hero = $('#hero');
  function closeNav() { document.body.classList.remove('nav-open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', function () {
    var open = document.body.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $$('#navLinks a').forEach(function (a) { a.addEventListener('click', closeNav); });

  var ticking = false;
  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 10);
    waFloat.classList.toggle('is-visible', window.scrollY > hero.offsetHeight * 0.55);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        $$('#navLinks a').forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['about', 'menu', 'gallery', 'book', 'visit'].forEach(function (id) {
      var s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  /* =================================================================
     Reserva por WhatsApp
     ================================================================= */
  var form = $('#bookForm'), dateEl = $('#bkDate'), timeEl = $('#bkTime'), errEl = $('#bookError');
  function pad(n) { return String(n).padStart(2, '0'); }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function initBookingDefaults() {
    var now = new Date();
    dateEl.min = isoDate(now);
    var h = now.getHours() + 1, d = new Date(now);
    if (h < OPEN_HOUR) h = OPEN_HOUR + 2;
    if (h >= CLOSE_HOUR - 1) { d.setDate(d.getDate() + 1); h = 9; }   // muy tarde → mañana
    dateEl.value = isoDate(d);
    timeEl.value = pad(h) + ':00';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#bkName').value.trim(), people = $('#bkPeople').value, date = dateEl.value, time = timeEl.value, note = $('#bkNote').value.trim();
    if (!name || !date || !time) {
      errEl.hidden = false;
      (!name ? $('#bkName') : !date ? dateEl : timeEl).focus();
      return;
    }
    errEl.hidden = true;
    var d = new Date(date + 'T' + time);
    var locale = lang === 'es' ? 'es-MX' : 'en-US';
    var dateStr = isNaN(d) ? date : d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    var timeStr = isNaN(d) ? time : d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
    var msg = fmt(t('book.msg'), {
      name: name, people: people, date: dateStr, time: timeStr,
      note: note ? fmt(t('book.msgNote'), { note: note }) : ''
    });
    window.open(WA_URL + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });

  /* =================================================================
     Abierto / cerrado (hora local de La Paz)
     ================================================================= */
  function laPazHour() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var h = 0, m = 0;
      parts.forEach(function (p) { if (p.type === 'hour') h = +p.value % 24; if (p.type === 'minute') m = +p.value; });
      return h + m / 60;
    } catch (e) {
      var d = new Date();
      return d.getHours() + d.getMinutes() / 60;
    }
  }
  function updateOpenStatus() {
    var el = $('#openStatus'), txt = $('#openStatusText');
    if (!el) return;
    var h = laPazHour(), open = h >= OPEN_HOUR && h < CLOSE_HOUR;
    el.classList.toggle('is-open', open);
    el.classList.toggle('is-closed', !open);
    txt.textContent = t(open ? 'visit.open' : 'visit.closed');
  }
  setInterval(updateOpenStatus, 60000);

  /* =================================================================
     Mapa (Leaflet + OpenStreetMap)
     ================================================================= */
  var map = null, marker = null;
  function initMap() {
    var el = $('#map');
    if (!el || !window.L) return;   // sin Leaflet → queda el enlace a Google Maps
    map = L.map(el, { scrollWheelZoom: false, zoomControl: true }).setView(COORDS, 17);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(map);
    var icon = L.divIcon({
      className: 'hc-pin',
      html: '<span class="hc-pin__ring"></span><img src="assets/img/logo.png" alt="">',
      iconSize: [52, 52], iconAnchor: [26, 26], popupAnchor: [0, -30]
    });
    marker = L.marker(COORDS, { icon: icon, title: 'Her Coffee' }).addTo(map);
    updateMapPopup();
    map.on('click focus', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout blur', function () { map.scrollWheelZoom.disable(); });
    el.classList.add('is-ready');
    setTimeout(function () { map.invalidateSize(); marker.openPopup(); }, 400);
    window.addEventListener('resize', function () { map.invalidateSize(); });
  }
  function updateMapPopup() {
    if (!marker) return;
    var wasOpen = marker.isPopupOpen && marker.isPopupOpen();
    marker.unbindPopup();
    marker.bindPopup(fmt(t('visit.popup'), { gmaps: GMAPS_URL }), { closeButton: false, autoPan: false });
    if (wasOpen) marker.openPopup();
  }

  /* =================================================================
     Arranque
     ================================================================= */
  applyLang();
  observeReveals();
  initBookingDefaults();
  initMap();
})();
