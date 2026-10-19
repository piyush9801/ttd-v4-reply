/* The Talent Dept. · round 11 hero. Scatter, then waveform.
   The statement is printed on the page behind its Line of Sight: every word under one Ink dash, the full stop under
   the Signal dash, the Draft replies in the pauses between the lines. Each dash is a row of small blocks, the
   conversations. Bring the cursor near and they dart away from it like startled insects, each its own way, further
   for a quicker hand, and the words show where they stood; when the hand rests they creep back and close over the
   words again, all but the ones it still holds open. Scroll, and the blocks lift off the sentence in reading order,
   so it is said, and settle under it as one quiet waveform of what was said: a burst of bars for each word, a pause
   for each space, the Signal bar for the full stop. The replies leave the room. Flat on the page: no blur, no tilt.
   Nothing moves on its own; when everything has come to rest the loop stops. Phones: the scroll tells it, and a
   finger moving across the hero scatters the blocks. */
(function () {
  var H = document.querySelector('.hero4'), root = document.documentElement;
  if (!H || root.classList.contains('still')) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var stage = H.querySelector('.stage'), hb = H.querySelector('.hb'), hl = H.querySelector('.hl');
  if (!stage || !hb || !hl) return;
  var wds = [].slice.call(H.querySelectorAll('.hl .wd'));
  var reps = [].slice.call(H.querySelectorAll('.far i'));
  var sw = document.createElement('div'); sw.className = 'sw'; sw.setAttribute('aria-hidden', 'true'); hb.appendChild(sw);

  var W = 1, SH = 1, top0 = 0, em = 16, R = 200, items = [], words = [];
  var mx = 0, my = 0, pvx = 0, pvy = 0, lastX = null, lastY = null, lastT = 0, inside = false;
  var open = 0, running = false, tPrev = 0;

  function hash(i, s) { var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function mk(el, hx, hy, w, h, i) {
    return { el: el, hx: hx, hy: hy, w: w, h: h, ox: 0, oy: 0, vx: 0, vy: 0, rot: 0, t0: -1e9, tf: '',
      px: hx, py: hy, th: 0, ks: 1,
      ang: (hash(i, 2) - .5) * 1.3,               // each runs its own way, never straight back from the hand
      m: .75 + hash(i, 3) * .6,                   // and some are quicker than others
      back: 650 + hash(i, 4) * 900 };             // how long each waits before it creeps back
  }

  function measure() {
    sw.textContent = '';
    reps.forEach(function (el) { el.style.transform = ''; });
    var b = hb.getBoundingClientRect(), s = stage.getBoundingClientRect();
    W = b.width; top0 = s.top - b.top; SH = s.height;  // the stage, in the frame of the blocks
    em = parseFloat(getComputedStyle(hl).fontSize) || 16;
    R = clamp(W * .15, 140, 260);
    items = []; words = [];
    var gap = Math.max(1, em * .025), tx0 = 1e9, tx1 = -1e9, ty0 = 1e9, ty1 = -1e9;

    // the dashes, each cut into blocks
    wds.forEach(function (el, k) {
      var tx = el.firstElementChild, d = el.lastElementChild.getBoundingClientRect(), t = tx.getBoundingClientRect();
      var sig = el.classList.contains('pd'), wd = { tx: tx, x0: t.left - b.left, ww: t.width || 1, segs: [], clip: null };
      words.push(wd);
      if (!sig) { tx0 = Math.min(tx0, t.left - b.left); tx1 = Math.max(tx1, t.right - b.left); }
      ty0 = Math.min(ty0, t.top - b.top); ty1 = Math.max(ty1, t.bottom - b.top);
      var len = d.width, n = sig ? 1 : Math.max(1, Math.round(len / (em * .46))), wts = [], sum = 0, j;
      for (j = 0; j < n; j++) { var v = .55 + hash(k * 31 + j, 1) * .9; wts.push(v); sum += v; }
      var x = d.left - b.left, y = d.top - b.top, h = d.height;
      for (j = 0; j < n; j++) {
        var sl = len * wts[j] / sum, w2 = j < n - 1 ? sl - gap : sl;
        var bl = document.createElement('i'); if (sig) bl.className = 'c';
        bl.style.cssText = 'left:' + x.toFixed(2) + 'px;top:' + y.toFixed(2) + 'px;width:' + w2.toFixed(2) + 'px;height:' + h.toFixed(2) + 'px';
        sw.appendChild(bl);
        var it = mk(bl, x + w2 / 2, y + h / 2, w2, h, items.length);
        it.sig = sig; it.k = k; it.j = j; it.n = n;
        wd.segs.push(it); items.push(it);
        x += sl;
      }
    });

    // the waveform of what was said, under it: a burst for each word, a pause for each space, the Signal bar last
    var PAUSE = 1.7, units = 0;
    words.forEach(function (wd, k) { units += wd.segs.length + (k < words.length - 1 ? PAUSE : 0); });
    var pitch = (tx1 - tx0) / Math.max(1, units - 1), tb = Math.min(clamp(innerWidth * .0042, 3, 8), pitch * .55);
    var Hm = em * .58, yc = Math.min(ty1 + em * .62, top0 + SH - Hm * .5 - em * .4), u = 0;
    var cx = (tx0 + tx1) / 2, cy = (ty0 + ty1) / 2;
    words.forEach(function (wd, k) {
      wd.segs.forEach(function (it, j) {
        var c = it.n, env = Math.pow(Math.sin(Math.PI * (j + .5) / c), .6), i = items.indexOf(it);
        var hgt = it.sig ? Hm * .5 : Hm * (.2 + .8 * env * (.5 + .5 * hash(k * 17 + j, 7)));
        it.sx = tx0 + u * pitch; it.sy = yc; it.bh = Math.max(hgt, tb * 1.6); it.bt = tb;
        // on the way down, the scatter: out from the middle of the sentence, each its own way, a little up
        var a = Math.atan2(it.hy - cy, it.hx - cx) + (hash(i, 8) - .5) * 1.4, L = em * (1.1 + hash(i, 9) * 1.6);
        it.cx = it.hx + Math.cos(a) * L; it.cy = it.hy + Math.sin(a) * L * .8 - em * .5;
        it.turn = hash(i, 10) < .5 ? -90 : 90;
        it.delay = .03 + k / words.length * .36 + j / Math.max(1, c) * .06 + hash(i, 11) * .05; it.span = .42;
        u += 1;
      });
      u += PAUSE;
    });

    // the replies: Draft dashes in the pauses. They scatter for the hand too, and on scroll they leave the room by the
    // nearer side, in their own time
    reps.forEach(function (el, i) {
      var r = el.getBoundingClientRect(); if (!r.width) return;
      var it = mk(el, r.left - b.left + r.width / 2, r.top - b.top + r.height / 2, r.width, r.height, 500 + i);
      it.rep = true;
      it.ex = it.hx < W * .5 ? -(it.hx + it.w / 2 + 12) : (W - it.hx + it.w / 2 + 12);
      it.ey = (hash(i, 6) - .5) * em * 1.4;
      it.delay = .02 + hash(i, 5) * .3; it.span = .4;
      items.push(it);
    });
    tPrev = 0;
  }

  function progress() {
    var r = H.getBoundingClientRect(), span = H.offsetHeight - innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }

  // a word shows only where none of its own blocks lie over it; a sliver is a piece of a letter, so it stays hidden
  function clipWord(wd) {
    var cov = [], j, s, ww = wd.ww, tiny = em * .1;
    for (j = 0; j < wd.segs.length; j++) {
      s = wd.segs[j];
      if (Math.abs(s.th) < 12 && s.ks < 1.25 && Math.abs(s.py - s.hy) < s.h * .9) {
        var hw = s.w * s.ks * .5 * Math.cos(s.th * Math.PI / 180) + s.h * .5 * Math.abs(Math.sin(s.th * Math.PI / 180));
        cov.push([s.px - hw - wd.x0, s.px + hw - wd.x0]);
      }
    }
    cov.sort(function (p, q) { return p[0] - q[0]; });
    var vis = [], at = 0;
    for (j = 0; j < cov.length; j++) {
      if (cov[j][0] - at >= tiny) vis.push([at, Math.min(cov[j][0], ww)]);
      at = Math.max(at, cov[j][1]);
      if (at >= ww) break;
    }
    if (ww - at >= tiny) vis.push([Math.max(at, 0), ww]);
    vis = vis.filter(function (p) { return p[1] - p[0] >= tiny; });
    var c;
    if (!vis.length) c = 'polygon(0 0,0 0,0 0)';
    else if (vis.length === 1 && vis[0][0] <= 0 && vis[0][1] >= ww) c = 'none';
    else c = 'polygon(' + vis.map(function (p) {
      var A = (clamp(p[0] / ww, 0, 1) * 100).toFixed(2) + '%', B = (clamp(p[1] / ww, 0, 1) * 100).toFixed(2) + '%';
      return A + ' -40%,' + A + ' 140%,' + B + ' 140%,' + B + ' -40%';
    }).join(',') + ')';
    if (c !== wd.clip) { wd.tx.style.clipPath = c; wd.clip = c; }
  }

  function tick(now) {
    var f = tPrev ? clamp((now - tPrev) / 16.67, .5, 2.2) : 1; tPrev = now;
    open = progress();
    H.classList.toggle('open', open > .55);
    var moving = false, spd = Math.sqrt(pvx * pvx + pvy * pvy), damp = Math.pow(.9, f), fade = Math.pow(.8, f);
    pvx *= fade; pvy *= fade; if (spd > .05) moving = true;
    var startle = spd > .6;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], e = ease(clamp((open - it.delay) / it.span, 0, 1)), bx, by, th = 0, ks = 1, kt = 1;
      if (it.rep) { bx = it.hx + it.ex * e; by = it.hy + it.ey * e; }
      else {
        var a1 = 1 - e;
        bx = a1 * a1 * it.hx + 2 * a1 * e * it.cx + e * e * it.sx;
        by = a1 * a1 * it.hy + 2 * a1 * e * it.cy + e * e * it.sy;
        var q = ease(clamp((e - .2) / .65, 0, 1));
        th = it.turn * q; ks = 1 + (it.bh / it.w - 1) * q; kt = 1 + (it.bt / it.h - 1) * q;
      }
      // the hand: they keep away from it, and dart for a quick one
      var ax = 0, ay = 0, held = false;
      if (inside) {
        var dx = bx + it.ox - mx, dy = by + it.oy - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R) {
          var g = 1 - d / R, ux = d ? dx / d : 1, uy = d ? dy / d : 0, ca = Math.cos(it.ang), sa = Math.sin(it.ang);
          var push = (1.4 * g * g + (startle ? g * (.75 + spd * .08) : 0)) / it.m;
          ax += (ux * ca - uy * sa) * push; ay += (ux * sa + uy * ca) * push;
          held = true; if (startle) it.t0 = now;
        }
      }
      // left alone, they creep back
      var quiet = now - it.t0 - it.back;
      if (quiet > 0) { var kr = .0012 * Math.min(1, quiet / 700); ax -= it.ox * kr; ay -= it.oy * kr; }
      it.vx = it.vx * damp + ax * f; it.vy = it.vy * damp + ay * f;
      var v = Math.sqrt(it.vx * it.vx + it.vy * it.vy);
      if (v > 28) { it.vx *= 28 / v; it.vy *= 28 / v; v = 28; }
      it.ox += it.vx * f; it.oy += it.vy * f;
      // the walls of the room, just past its edges, so a block can duck out of sight but never run off for good
      // (only the hand's push is held in; the scroll takes the replies out of the room)
      var px = bx + it.ox, py = by + it.oy, xl = -24, xr = W + 24, yt = top0 - 24, yb = top0 + SH + 24;
      if (bx > xl && bx < xr) {
        if (px < xl) { it.ox += xl - px; it.vx = Math.abs(it.vx) * .3; } else if (px > xr) { it.ox -= px - xr; it.vx = -Math.abs(it.vx) * .3; }
      }
      if (by > yt && by < yb) {
        if (py < yt) { it.oy += yt - py; it.vy = Math.abs(it.vy) * .3; } else if (py > yb) { it.oy -= py - yb; it.vy = -Math.abs(it.vy) * .3; }
      }
      // a running block turns a little towards where it runs
      var hd = 0;
      if (v > .4) {
        hd = Math.atan2(it.vy, it.vx); if (hd > Math.PI / 2) hd -= Math.PI; else if (hd < -Math.PI / 2) hd += Math.PI;
        var cap = 38 * clamp(em * 1.2 / it.w, .25, 1);                 // a long reply turns less than a short block
        hd = clamp(hd * 57.3 * Math.min(1, v / 6) * .7, -cap, cap);
      }
      it.rot += (hd - it.rot) * Math.min(1, .18 * f);
      if (!held && quiet > 0 && v < .05 && Math.abs(it.ox) + Math.abs(it.oy) < .3) { it.ox = it.oy = it.vx = it.vy = 0; }
      if (Math.abs(it.rot) < .02) it.rot = 0;
      if (v > .03 || it.rot || (!held && (it.ox || it.oy))) moving = true;

      var X = bx + it.ox - it.hx, Y = by + it.oy - it.hy, T = th + it.rot;
      var tf = 'translate3d(' + X.toFixed(1) + 'px,' + Y.toFixed(1) + 'px,0)' + (T ? ' rotate(' + T.toFixed(2) + 'deg)' : '') +
        (ks !== 1 || kt !== 1 ? ' scale(' + ks.toFixed(4) + ',' + kt.toFixed(4) + ')' : '');
      if (tf !== it.tf) { it.el.style.transform = tf; it.tf = tf; }
      it.px = bx + it.ox; it.py = by + it.oy; it.th = T; it.ks = ks;
    }
    for (var k = 0; k < words.length; k++) clipWord(words[k]);
    if (moving) requestAnimationFrame(tick); else { running = false; tPrev = 0; }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }

  function point(x, y) {
    var b = hb.getBoundingClientRect(), s = stage.getBoundingClientRect(), nx = x - b.left, ny = y - b.top, now = performance.now();
    if (lastX !== null && now - lastT < 120) { pvx = pvx * .4 + (nx - lastX) * .6; pvy = pvy * .4 + (ny - lastY) * .6; }
    lastX = nx; lastY = ny; lastT = now; mx = nx; my = ny;
    inside = x >= s.left && x <= s.right && y >= s.top && y <= s.bottom; kick();
  }
  function away() { inside = false; lastX = null; kick(); }
  stage.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') point(e.clientX, e.clientY); });
  stage.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') away(); });
  // phones: a finger moving across the hero, even while it scrolls the page
  stage.addEventListener('touchstart', function (e) { lastX = null; var t = e.touches[0]; if (t) point(t.clientX, t.clientY); }, { passive: true });
  stage.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) point(t.clientX, t.clientY); }, { passive: true });
  stage.addEventListener('touchend', away, { passive: true });
  stage.addEventListener('touchcancel', away, { passive: true });
  addEventListener('scroll', kick, { passive: true });
  var rt, w0 = innerWidth;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (innerWidth === w0 && matchMedia('(pointer: coarse)').matches) return; w0 = innerWidth; measure(); kick(); }, 120);
  });

  function start() { measure(); H.classList.add('live', 'sw-on'); kick(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
