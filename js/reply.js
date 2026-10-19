/* The Talent Dept. · round 12 · v4 Reply. The hero.
   "Every good conversation leaves room for a reply."
   At rest the statement is a centred Line of Sight: every word behind one Ink dash made of small blocks, the full stop
   one Signal block, the Draft replies on the rails between the lines. Bring the cursor near and the blocks scatter
   like startled insects: a flinch toward the hand, then a dart, each a beat later the further it sits (a ripple of
   alarm), along a curve, stretching as they run and squashing as they stop. They land on the rails above and below
   the line, so the scattered state is still rows, and the words show where they stood. Left alone they creep home.
   Scroll, and the blocks travel on rails only: the replies leave the room along their rows; each word's dash wipes
   through its word to the rail beside the line, so the statement is said in reading order and never crossed; on each
   rail the dashes slide together like beads, contact by contact; the rules extend to long, short, short, long
   (Brand Standards 32); last, the Signal block leaves the full stop and opens the room for a reply. At the end the
   rules are strings: they bow a few px toward a nearby pointer and ring down when it leaves.
   Pure functions of the scroll position, one rAF loop that stops when everything is at rest. Flat: no blur, no tilt.
   Reduced motion and ?still draw the end pose once. */
(function () {
  'use strict';
  var H = document.querySelector('.hero4'), root = document.documentElement;
  if (!H) return;
  var stage = H.querySelector('.stage'), hb = H.querySelector('.hb'), hl = H.querySelector('.hl'), stick = H.querySelector('.stick');
  if (!stage || !hb || !hl || !stick) return;
  var STILL = root.classList.contains('still') || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var wdEls = [].slice.call(hl.querySelectorAll('.wd'));
  var roomEl = hl.querySelector('.room');
  var sw = document.createElement('div'); sw.className = 'sw'; sw.setAttribute('aria-hidden', 'true'); hb.appendChild(sw);

  // ------------------------------------------------------------------ helpers
  function hash(i, s) { var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(t) { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); }
  function io3(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function in2(t) { return t * t; }
  function in3(t) { return t * t * t; }
  function oSine(t) { return Math.sin(t * Math.PI / 2); }
  function bez(x1, y1, x2, y2) {           // CSS cubic-bezier as a function of x
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x, i, cx, dx;
      for (i = 0; i < 8; i++) {
        cx = 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t - x;
        dx = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
        if (Math.abs(cx) < 1e-5 || !dx) break; t = clamp(t - cx / dx, 0, 1);
      }
      return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
    };
  }
  var DRAW = bez(.3, 1.16, .4, 1);          // drawn lines: a little past, then home
  var HOUSE = bez(.22, 1, .36, 1);
  function seg(p, a, d) { return clamp((p - a) / d, 0, 1); }

  // ------------------------------------------------------------------ the timeline (fractions of the pinned scroll)
  var T = {
    rep: [.04, .028, .075],      // replies leave: start, per-row stagger, duration
    s1: [.19, .43], d1: .072,    // the statement said: span of word starts, duration per word
    s2: .462, d2: .05, st2: .0042,   // beads: start, duration per block, stagger per rank
    dB: .05,                         // the fused rule slides along its rail to the centre
    s3: .585, d3: .07, st3: .01,     // rules extend
    c: [.655, .125],             // the Signal opens the room
    end: .79
  };
  var TM = { rep: [.04, .03, .075], s1: [.19, .41], d1: .075, s2: .452, d2: .05, st2: .006, dB: .05, s3: .575, d3: .075, st3: .01,
    c: [.635, .165], end: .81 };

  // ------------------------------------------------------------------ state
  var yf = 0, W = 1, SH = 1, top0 = 0, em = 16, mob = false, P = 30, R = 160, cx = 0, M = 0, tl = T;
  var items = [], words = [], rails = [], rules = [], lines = [], coral = null, replyRows = [];
  var pS = 0, pRaw = 0, running = false, tPrev = 0, built = false;
  var mx = -1e4, my = -1e4, pvx = 0, pvy = 0, lastX = null, lastY = null, lastT = 0, inside = false;

  function el(cls, x, y, w, h) {
    var e = document.createElement('i'); if (cls) e.className = cls;
    e.style.cssText = 'left:' + (x - w / 2).toFixed(2) + 'px;top:' + (y - h / 2).toFixed(2) + 'px;width:' + w.toFixed(2) + 'px;height:' + h.toFixed(2) + 'px;z-index:' + (cls === 'r' ? 0 : cls === 'c' ? 2 : 1);
    sw.appendChild(e); return e;
  }
  function item(kind, e, x, y, w, h, i) {
    return { kind: kind, el: e, rx: x, ry: y, rw: w, rh: h, i: i, tf: '',
      ox: 0, oy: 0, vx: 0, vy: 0, tx: 0, ty: 0, wake: 0, side: 0, hold: 0, flinch: false, vmax: 0, sq: -1e9, sqAx: 0,
      px: x, py: y, sx: 1, sy: 1, // last rendered centre (for velocity stretch)
      jit: hash(i, 3) * 40, back: 380 + hash(i, 4) * 320, mode: 0, py0: y };
  }

  // ------------------------------------------------------------------ measure and plan
  function baselineOf(tx) {
    var pr = document.createElement('span');
    pr.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    tx.appendChild(pr); var y = pr.getBoundingClientRect().top; tx.removeChild(pr); return y;
  }
  function readWords() {
    var b = hb.getBoundingClientRect();
    return wdEls.map(function (w, k) {
      var tx = w.firstElementChild, r = tx.getBoundingClientRect();
      return { el: w, tx: tx, k: k, sig: w.classList.contains('pd'), l: r.left - b.left, r: r.right - b.left, t: r.top - b.top, b: r.bottom - b.top, base: baselineOf(tx) - b.top, len: r.width };
    });
  }
  function groupLines(ws) {
    var out = [];
    ws.forEach(function (w) {
      var L = out.length ? out[out.length - 1] : null;
      if (!L || Math.abs(w.base - L.base) > em * .4) { L = { base: w.base, words: [] }; out.push(L); }
      L.words.push(w);
    });
    out.forEach(function (L) { L.l = Math.min.apply(null, L.words.map(function (w) { return w.l; })); L.r = Math.max.apply(null, L.words.map(function (w) { return w.r; })); });
    return out;
  }

  function measure() {
    sw.textContent = ''; items = []; words = []; rails = []; rules = []; coral = null; replyRows = [];
    wdEls.forEach(function (w) { w.firstElementChild.style.clipPath = ''; });
    mob = innerWidth <= 760; tl = mob ? TM : T;
    em = parseFloat(getComputedStyle(hl).fontSize) || 16;
    hb.style.marginTop = '0px';                   // put the box on a whole pixel so every rule and block is crisp
    var b0 = hb.getBoundingClientRect(); hb.style.marginTop = (Math.round(b0.top) - b0.top).toFixed(3) + 'px';
    var b = hb.getBoundingClientRect(), s = stage.getBoundingClientRect();
    W = b.width; top0 = s.top - b.top; SH = s.height;
    yf = 0;
    R = clamp(W * .13, 120, 210);

    // the room after the full stop (desktop): the last line fills the measure of the longest other line
    var gap = em * .26, ws, ls;
    if (roomEl && !mob) {
      roomEl.style.width = '0px';
      ws = readWords(); ls = groupLines(ws);
      var Mo = 0; ls.slice(0, -1).forEach(function (L) { Mo = Math.max(Mo, L.r - L.l); });
      var last = ls[ls.length - 1], wl = last.r - last.l, room = Math.max(em * 1.6, Mo - wl - gap);
      hl.style.setProperty('--room', room.toFixed(1) + 'px'); roomEl.style.width = '';
    }
    ws = readWords(); ls = groupLines(ws); lines = ls;
    var N = ls.length, rr = roomEl && !mob ? roomEl.getBoundingClientRect() : null;
    M = 0; ls.forEach(function (L, k) { var r = (k === N - 1 && rr && rr.width) ? Math.max(L.r, rr.right - b.left) : L.r; M = Math.max(M, r - L.l); });
    cx = (ls[0].l + ls[0].r) / 2;
    P = N > 1 ? (ls[N - 1].base - ls[0].base) / (N - 1) : em * 1.64;
    var h = Math.round(em * .19), half = P / 2, bgap = Math.max(1, em * .025), pitch = em * .46 + bgap;
    ls.forEach(function (L) { L.dy = Math.round(L.base - em * .27 - h / 2) + h / 2; L.gt = L.base - em * .8; L.gb = L.base + em * .24; });
    for (var r = 0; r <= N; r++) rails.push({ y: r === 0 ? ls[0].dy - half : ls[r - 1].dy + half, blocks: [], mass: 0, idx: r });

    // the Ink blocks, word by word
    var wordIdx = 0;
    ls.forEach(function (L, li) {
      L.words.forEach(function (w) {
        var wd = { w: w, tx: w.tx, line: li, sig: w.sig, x0: w.l, ww: w.len || 1, t: w.t, hgt: w.b - w.t, segs: [], clip: null, k: wordIdx++, gt: L.gt, gb: L.gb };
        words.push(wd);
        if (w.sig) {
          var cw = w.len, e = el('c', w.l + cw / 2, L.dy, cw, h);
          coral = item('coral', e, w.l + cw / 2, L.dy, cw, h, 900);
          coral.word = wd; wd.segs.push(coral); items.push(coral);
          return;
        }
        var len = w.len, n = Math.max(1, Math.round(len / (em * .46))), wts = [], sum = 0, j;
        for (j = 0; j < n; j++) { var v = .55 + hash(wd.k * 31 + j, 1) * .9; wts.push(v); sum += v; }
        var x = w.l;
        for (j = 0; j < n; j++) {
          var sl = len * wts[j] / sum, w2 = j < n - 1 ? sl - bgap : sl;
          var it = item('ink', el('', x + w2 / 2, L.dy, w2, h), x + w2 / 2, L.dy, w2, h, items.length);
          it.word = wd; it.line = li; wd.segs.push(it); items.push(it);
          x += sl;
        }
      });
    });

    // act I: which rail each word's dash goes to. Even line counts split in half (the middle rail is the Signal's);
    // odd counts send the first line up, the last down, and split the middle line where the masses balance
    var mid = N % 2 === 0 ? N / 2 : -1;
    function massOf(ws2) { return ws2.reduce(function (a, wd) { return a + wd.segs.reduce(function (s2, it) { return s2 + it.rw; }, 0); }, 0); }
    var inkWords = words.filter(function (wd) { return !wd.sig; });
    ls.forEach(function (L, li) {
      var lw = inkWords.filter(function (wd) { return wd.line === li; });
      if (mid >= 0) { lw.forEach(function (wd) { wd.dir = li < mid ? -1 : 1; }); return; }
      if (li === 0) { lw.forEach(function (wd) { wd.dir = -1; }); return; }
      if (li === N - 1) { lw.forEach(function (wd) { wd.dir = 1; }); return; }
      var best = 0, bd = 1e9;
      for (var sp = 0; sp <= lw.length; sp++) {
        var up = massOf(lw.slice(0, sp)), dn = massOf(lw.slice(sp)), d = Math.abs(up - dn);
        if (d < bd) { bd = d; best = sp; }
      }
      lw.forEach(function (wd, i) { wd.dir = i < best ? -1 : 1; });
    });
    // speaking cadence: letters, words, and a longer breath at each line break
    var cad = [], acc = 0;
    inkWords.forEach(function (wd, i) {
      if (i) acc += .08 + .02 * (inkWords[i - 1].w.len / em) + (inkWords[i - 1].line !== wd.line ? .14 : 0) + (inkWords[i - 1].dir !== wd.dir ? .1 : 0);
      cad.push(acc);
    });
    var cmax = cad[cad.length - 1] || 1;
    inkWords.forEach(function (wd, i) {
      var L = ls[wd.line];
      wd.s = tl.s1[0] + cad[i] / cmax * (tl.s1[1] - tl.d1 - tl.s1[0]);
      wd.rail = wd.dir < 0 ? wd.line : wd.line + 1;
      wd.y0 = L.dy; wd.y1 = rails[wd.rail].y;
      wd.k0 = wd.dir < 0 ? L.gb - (L.dy + h / 2) : (L.dy - h / 2) - L.gt;   // how far the reveal edge trails the dash at first
      wd.segs.forEach(function (it) { rails[wd.rail].blocks.push(it); it.rail = wd.rail; });
    });

    // act II and III: beads, then the rules extend. Long outside, short inside, Brand Standards 32
    var outer = [], inner = [];
    rails.forEach(function (rl) {
      if (!rl.blocks.length) return;
      rl.blocks.sort(function (a, c) { return a.rx - c.rx; });
      rl.mass = rl.blocks.reduce(function (a, it) { return a + it.rw; }, 0);
      (rl.idx === 0 || rl.idx === N ? outer : inner).push(rl);
    });
    var mo = Math.max.apply(null, outer.map(function (r2) { return r2.mass; }).concat([0])), mi = Math.max.apply(null, inner.map(function (r2) { return r2.mass; }).concat([0]));
    var pad = parseFloat(getComputedStyle(hl).paddingLeft) || 20;
    var LL = Math.max(mob ? W - 2 * pad : M, mo), SS = Math.max(LL * .637, mi);
    LL = Math.max(LL, SS / .88);
    var ri = 0;
    rails.forEach(function (rl) {
      if (!rl.blocks.length) return;
      var g0 = rl.blocks[0].rx - rl.blocks[0].rw / 2, g1 = rl.blocks[rl.blocks.length - 1].rx + rl.blocks[rl.blocks.length - 1].rw / 2;
      rl.gc = (g0 + g1) / 2;                      // the group's own centre: the beads close on it
      var x = rl.gc - rl.mass / 2;
      rl.blocks.forEach(function (it) { it.x2 = x + it.rw / 2; it.D = it.x2 - it.rx; x += it.rw; });
      var ranks = rl.blocks.slice().sort(function (a, c) { return Math.abs(a.D) - Math.abs(c.D); });
      ranks.forEach(function (it, k) { it.s2 = tl.s2 + ri * .004 + k * tl.st2; });
      rl.sB = Math.max.apply(null, rl.blocks.map(function (it) { return it.s2; })) + tl.d2 + .004;   // then the slide
      rl.fuse = rl.sB - .003;                     // from here the beads are one rule
      rl.len = (rl.idx === 0 || rl.idx === N) ? LL : SS;
      rl.f = rl.len / rl.mass; rl.s3 = Math.max(tl.s3 + ri * tl.st3, rl.sB + (Math.abs(cx - rl.gc) > 2 ? tl.dB * .8 : 0));
      rl.x0 = cx - rl.len / 2; rl.x1 = cx + rl.len / 2;
      rules.push({ blocks: rl.blocks, x0: rl.x0, x1: rl.x1, y: rl.y, a: 0, va: 0, xa: cx, eng: false });
      ri++;
    });

    // the Signal: desktop, the room after the full stop; phone, the middle rail (page 32), reached on rails
    if (coral) {
      var cw2 = coral.rw, last2 = ls[N - 1];
      if (!mob && rr && rr.width) {
        coral.path = 'room'; coral.a0 = coral.rx - cw2 / 2; coral.b0 = coral.rx + cw2 / 2;
        coral.a1 = rr.left - b.left; coral.b1 = rr.right - b.left;
        rules.push({ blocks: [coral], x0: coral.a1, x1: coral.b1, y: coral.ry, a: 0, va: 0, xa: (coral.a1 + coral.b1) / 2, eng: false, sig: true });
      } else {
        var y2 = rails[mid >= 0 ? mid : N].y, Lc = LL * .454;
        coral.path = 'rails';
        coral.xm = Math.min(W - cw2 / 2 - 2, Math.max(coral.rx + cw2 + em * .3, cx + M / 2 + em * .22 + cw2 / 2));
        coral.y2 = y2; coral.a1 = cx - Lc / 2; coral.b1 = cx + Lc / 2;
        rules.push({ blocks: [coral], x0: coral.a1, x1: coral.b1, y: y2, a: 0, va: 0, xa: cx, eng: false, sig: true });
      }
    }

    // the replies, in Draft, on the rails after the lines, set further right (Line of Sight)
    var RA = [[620, 104], [752, 35], [872, 52], [956, 148], [1276, 31]], RB = [[620, 67], [716, 18], [870, 112], [1014, 63], [1106, 60], [1257, 19]];
    var cfg = mob ? [[1, RB, .16], [3, RA, .02]] : [[1, RA, .3], [2, RB, .1], [3, RA, .44]];
    var left = cx - M / 2, ku = em / 96 * (mob ? 1.02 : 1.08);
    cfg.forEach(function (c, ci) {
      var rl = rails[c[0]]; if (!rl) return;
      var x0 = left + c[2] * M, row = { items: [], s: tl.rep[0] + ci * tl.rep[1] };
      c[1].forEach(function (d) {
        var x = x0 + (d[0] - 620) * ku, w3 = d[1] * ku;
        if (x + w3 > W - pad * .5) return;
        var it2 = item('rep', el('r', x + w3 / 2, rl.y, w3, h), x + w3 / 2, rl.y, w3, h, 500 + items.length);
        row.items.push(it2); items.push(it2);
      });
      if (!row.items.length) return;
      var minX = Math.min.apply(null, row.items.map(function (q) { return q.rx - q.rw / 2; }));
      row.exit = W - minX + em * .4;
      row.items.forEach(function (q) { q.row = row; });
      replyRows.push(row);
    });
    built = true;
  }

  // ------------------------------------------------------------------ the pose at scroll position p (pure)
  var OV = 1.5;                                  // fused blocks overlap by a pixel so no seam shows between them
  var AN = .16;                                // the first part of each word's beat is the anticipation squash
  function wordE(u) {
    if (u <= AN) return 0;
    var v = (u - AN) / (1 - AN);
    return io3(v) + .06 * Math.sin(Math.PI * clamp((v - .72) / .28, 0, 1));
  }
  function wordY(wd, u) { return lerp(wd.y0, wd.y1, wordE(u)); }
  function wordSquash(u) {                     // crouch in place (no step out of the row), release into the move
    if (u <= 0 || u >= .36) return 1;
    if (u < AN) return 1 - .15 * oSine(u / AN);
    return lerp(.85, 1, io3((u - AN) / (.36 - AN)));
  }
  function pose(it, p, o) {
    var x = it.rx, y = it.ry, w = it.rw, hh = it.rh, sx = 1, sy = 1, sh = 0;
    if (it.kind === 'rep') {
      var u = seg(p, it.row.s, tl.rep[2]), dx = 0;
      if (u > 0) dx = u < .22 ? -em * .2 * oSine(u / .22) : lerp(-em * .2, it.row.exit, in3((u - .22) / .78));
      x += dx;
    } else if (it.kind === 'ink') {
      var wd = it.word, u1 = seg(p, wd.s, tl.d1);
      y = wordY(wd, u1); sy = wordSquash(u1); sx = 1 + (1 - sy) * .25;
      var u2 = seg(p, it.s2, tl.d2);
      if (u2 > 0) {
        var tr = clamp(u2 / .8, 0, 1);
        x = lerp(it.rx, it.x2, in2(tr));
        w = it.rw + OV * clamp((u2 - .75) / .25, 0, 1);
        if (u2 > .8 && u2 < 1) {             // contact: a short squash from the trailing side
          var q = 1 - .16 * Math.sin(Math.PI * (u2 - .8) / .2);
          sx = q; sh = (it.D > 0 ? 1 : -1) * (1 - q) * w / 2;
        }
      }
      var rl = rails[it.rail], uB = seg(p, rl.sB, tl.dB);
      if (uB > 0) x += (cx - rl.gc) * io3(uB);
      var u3 = seg(p, rl.s3, tl.d3);
      if (u3 > 0) { var f = 1 + (rl.f - 1) * DRAW(u3); x = cx + (x - cx) * f; w = w * f; sh *= f; }
    } else if (it.kind === 'coral') {
      var uc = seg(p, tl.c[0], tl.c[1]), a = it.rx - it.rw / 2, bb = it.rx + it.rw / 2;
      if (it.path === 'room') {
        if (uc > 0) {
          var st1 = io3(clamp(uc / .3, 0, 1)), op = DRAW(clamp((uc - .36) / .64, 0, 1));
          a = lerp(it.a0, it.a1, st1); bb = a + it.rw + (it.b1 - it.a1 - it.rw) * op;
        }
      } else if (uc > 0) {
        var c1 = clamp(uc / .22, 0, 1), c2 = clamp((uc - .24) / .26, 0, 1), c3 = clamp((uc - .52) / .2, 0, 1), c4 = clamp((uc - .7) / .3, 0, 1);
        var dx1 = (it.xm - it.rx) * io3(c1), xx = it.rx + dx1;
        y = lerp(it.ry, it.y2, io3(c2) + .06 * Math.sin(Math.PI * clamp((c2 - .7) / .3, 0, 1)));
        xx = lerp(xx, it.b1 - it.rw / 2, io3(c3));
        a = xx - it.rw / 2; bb = xx + it.rw / 2;
        if (c4 > 0) a = lerp(a, it.a1, DRAW(c4));
      }
      x = (a + bb) / 2; w = bb - a;
    }
    o.x = x; o.y = y; o.w = w; o.h = hh; o.sx = sx; o.sy = sy; o.sh = sh;
    return o;
  }

  // ------------------------------------------------------------------ the scroll
  function progress() {
    var r = H.getBoundingClientRect(), span = H.offsetHeight - stick.offsetHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }

  // ------------------------------------------------------------------ the scatter (pointer, at rest only)
  // A hand near a word startles the whole word (so it is revealed whole, never in slices); each of its blocks still
  // reacts on its own beat, later the further it sits. Ink blocks zip apart to the rails above and below the line and
  // step sideways away from the hand; on each rail the landed blocks space themselves like beads and push the Draft
  // replies aside. Replies near the hand part along their own rail. Left alone, they wait, then creep home.
  var DART = { kx: 230, cx: 24, ky: 400, cy: 35 }, HOME = { kx: 120, cx: 17, ky: 110, cy: 18 };
  function targets(now, calm, spd) {
    var Rw = R * (.62 + .38 * Math.tanh(spd / 700)), i, j, it;
    // which words the hand startles
    words.forEach(function (wd) {
      var dmin = 1e9;
      wd.segs.forEach(function (q) { var dx = q.rx - mx, dy = (q.ry - my) * 1.6; dmin = Math.min(dmin, Math.sqrt(dx * dx + dy * dy)); });
      wd.near = !calm && inside && (dmin < Rw || (wd.near && dmin < R * 1.05));   // a little hysteresis: no flicker at the edge
      if (wd.near && !wd.side) {                 // the whole word leaves to one side: away from the hand, or by turns
        var wy = wd.segs[0].ry - my;
        wd.side = wy > em * .3 ? 1 : wy < -em * .3 ? -1 : (wd.k % 2 ? 1 : -1);
      }
      if (wd.near) wd.held = now + 520 + hash(wd.k, 8) * 640;
      wd.open = wd.near || (now < (wd.held || 0) && !calm);
    });
    for (i = 0; i < items.length; i++) {
      it = items[i];
      var dx = it.rx - mx, dy = it.ry - my, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (it.kind === 'rep') {
        if (!calm && inside && d < R * 1.25) {
          var sr = sstep(1 - d / (R * 1.25)) * (.5 + .5 * Math.tanh(spd / 700));
          it.tx = (dx >= 0 ? 1 : -1) * em * 2.4 * sr; it.ty = 0; it.mode = 1;
          it.hold = now + it.back;
        } else if (now > it.hold || calm) { it.tx = 0; it.ty = 0; it.mode = 0; }
        continue;
      }
      var wd = it.word;
      if (wd.open) wd.closeT = 0; else if (!wd.closeT && wd.segs.some(function (q) { return q.tx || q.ty; })) wd.closeT = now;
      if (!wd.open && !wd.near && wd.side && wd.segs.every(function (q) { return !q.tx && !q.ty && Math.abs(q.oy) < 1; })) wd.side = 0;
      var due = wd.closeT ? wd.closeT + (wd.segs.length - 1 - wd.segs.indexOf(it)) * 24 : 0;
      if (!wd.open && due && now < due) { it.mode = 1; continue; }
      if (wd.open) {
        if (!it.wake) { it.wake = now + d / 1400 * 1000 + it.jit; it.side = 0; }
        if (now < it.wake) { it.flinch = now > it.wake - 70; if (it.flinch) { it.tx = -dx / d * em * .05; it.ty = -dy / d * em * .03; it.mode = 1; } continue; }
        it.flinch = false;
        if (!it.side) it.side = wd.side || 1;
        var str = sstep(1 - d / (R * 1.7));
        it.ty = it.side * P / 2;
        it.tx = (dx >= 0 ? 1 : -1) * em * (.25 + .9 * str);
        it.mode = 1;
      } else {
        it.flinch = false; it.wake = 0; it.side = 0; it.mode = 0;
        it.tx = 0; if (Math.abs(it.ox) < em * .04) it.ty = 0;
      }
    }
    // beads on each rail: landed blocks and the replies keep their distance; Ink has the right of way
    var byRail = {};
    for (i = 0; i < items.length; i++) {
      it = items[i];
      var onRail = it.kind === 'rep' || Math.abs(it.ty) > P * .3;
      if (!onRail) continue;
      var key = Math.round((it.ry + it.ty) / (P / 4));
      (byRail[key] = byRail[key] || []).push(it);
    }
    Object.keys(byRail).forEach(function (k) {
      var g = byRail[k]; if (g.length < 2) return;
      var gap = em * .06;
      for (var pass = 0; pass < 4; pass++) {
        g.sort(function (a, b) { return (a.rx + a.tx) - (b.rx + b.tx); });
        for (j = 1; j < g.length; j++) {
          var a = g[j - 1], b = g[j], ov = (a.rx + a.tx + a.rw / 2 + gap) - (b.rx + b.tx - b.rw / 2);
          if (ov <= 0) continue;
          var wa = a.kind === 'rep' ? 1 : (b.kind === 'rep' ? 0 : .5);
          a.tx -= ov * wa; b.tx += ov * (1 - wa);
          if (a.kind === 'rep') a.tx = clamp(a.tx, -em * 2.8, em * 2.8); if (b.kind === 'rep') b.tx = clamp(b.tx, -em * 2.8, em * 2.8);
          if (a.kind === 'rep') { a.mode = 1; a.hold = now + a.back; } if (b.kind === 'rep') { b.mode = 1; b.hold = now + b.back; }
        }
      }
    });
  }
  function spring(it, h) {
    var s = it.mode ? DART : HOME;
    it.vx += (-s.kx * (it.ox - it.tx) - s.cx * it.vx) * h;
    it.vy += (-s.ky * (it.oy - it.ty) - s.cy * it.vy) * h;
    it.ox += it.vx * h; it.oy += it.vy * h;
  }

  // ------------------------------------------------------------------ the strings (end pose)
  function strings(now, h, active) {
    var band = P * .5, A = em * (mob ? .1 : .085), moving = false;
    rules.forEach(function (ru) {
      var tgt = 0, eng = false;
      if (active && inside && mx > ru.x0 - em * .4 && mx < ru.x1 + em * .4) {
        var dy = my - ru.y, ad = Math.abs(dy);
        if (ad < band) { eng = true; tgt = Math.sign(dy) * Math.min(ad * .5, A) * (1 - sstep(ad / band)); var L2 = ru.x1 - ru.x0; ru.xa += (clamp(mx, ru.x0 + L2 * .12, ru.x1 - L2 * .12) - ru.xa) * Math.min(1, h * 14); }
      }
      ru.eng = eng;
      var k = eng ? 180 : 320, c = eng ? 20 : 5.5;
      ru.va += (-k * (ru.a - tgt) - c * ru.va) * h; ru.a += ru.va * h;
      if (Math.abs(ru.a) < .02 && Math.abs(ru.va) < .05 && !eng) { ru.a = 0; ru.va = 0; }
      if (ru.a || ru.va || eng) moving = true;
    });
    return moving;
  }
  function bowAt(ru, x) {
    if (!ru.a) return 0;
    var t = x < ru.xa ? (x - ru.x0) / Math.max(1, ru.xa - ru.x0) : (ru.x1 - x) / Math.max(1, ru.x1 - ru.xa);
    return ru.a * Math.sin(Math.PI / 2 * clamp(t, 0, 1));
  }

  // ------------------------------------------------------------------ the words: shown only where nothing hides them
  function clipScatter(wd) {
    var segs = wd.segs, n = segs.length, j, rects = [], full = 0, ov = em * .12, H2 = wd.hgt;
    for (j = 0; j < n; j++) {
      var it = segs[j], a = j ? (segs[j - 1].rx + segs[j - 1].rw / 2 + it.rx - it.rw / 2) / 2 - wd.x0 : -ov,
        b = j < n - 1 ? (it.rx + it.rw / 2 + segs[j + 1].rx - segs[j + 1].rw / 2) / 2 - wd.x0 : wd.ww + ov;
      var oy = it.oy, e = clamp(Math.abs(oy) / (P / 2), 0, 1), lag = (1 - e) * (1 - e), t0, t1;
      if (Math.abs(oy) < .5) continue;
      if (oy < 0) { t0 = it.ry + oy + it.rh / 2 + (wd.gb - (it.ry + it.rh / 2)) * lag - wd.t; t1 = H2 + ov; if (t0 >= wd.gb - wd.t) continue; if (t0 <= wd.gt - wd.t) full++; }
      else { t1 = it.ry + oy - it.rh / 2 - ((it.ry - it.rh / 2) - wd.gt) * lag - wd.t; t0 = -ov; if (t1 <= wd.gt - wd.t) continue; if (t1 >= wd.gb - wd.t) full++; }
      rects.push('M' + a.toFixed(1) + ',' + t0.toFixed(1) + 'H' + b.toFixed(1) + 'V' + t1.toFixed(1) + 'H' + a.toFixed(1) + 'Z');
    }
    if (!rects.length) return 'polygon(0 0,0 0,0 0)';
    if (full === n) return 'none';
    return 'path("' + rects.join('') + '")';
  }
  var tmp = {};
  function clipWord(wd, p) {
    var c;
    if (wd.sig) {
      var it = coral, uc = seg(p, tl.c[0], tl.c[1]);
      if (uc <= 0) c = clipScatter(wd);
      else {
        pose(it, p, tmp); var lx = tmp.x - tmp.w / 2 - wd.x0;
        if (Math.abs(tmp.y - it.ry) > it.rh || uc > .5) lx = wd.ww;
        c = lx >= wd.ww ? 'none' : 'polygon(-20% -40%,' + (lx / wd.ww * 100).toFixed(2) + '% -40%,' + (lx / wd.ww * 100).toFixed(2) + '% 140%,-20% 140%)';
      }
    } else {
      var u = seg(p, wd.s, tl.d1);
      if (u <= 0) c = clipScatter(wd);
      else if (u <= AN) c = 'polygon(0 0,0 0,0 0)';
      else {
        var e = clamp(wordE(u), 0, 1), y = lerp(wd.y0, wd.y1, e), hh = wd.segs[0].rh, lag = wd.k0 * (1 - e) * (1 - e), edge, pc;
        if (wd.dir < 0) { edge = y + hh / 2 + lag - wd.t; pc = (edge / wd.hgt * 100).toFixed(2); c = edge <= 0 ? 'none' : 'polygon(-10% ' + pc + '%,110% ' + pc + '%,110% 140%,-10% 140%)'; }
        else { edge = y - hh / 2 - lag - wd.t; pc = (edge / wd.hgt * 100).toFixed(2); c = edge >= wd.hgt ? 'none' : 'polygon(-10% -40%,110% -40%,110% ' + pc + '%,-10% ' + pc + '%)'; }
      }
    }
    if (c !== wd.clip) { wd.tx.style.clipPath = c; wd.clip = c; }
  }

  // ------------------------------------------------------------------ render
  var o = {}, oA = {}, oB = {};
  function render(p, dt, now) {
    var endOn = p >= tl.end - .001;
    var bow = {};
    if (endOn) rules.forEach(function (ru) { if (ru.a) ru.blocks.forEach(function (it) { bow[it.i] = ru; }); });
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      pose(it, p, o);
      if (it.kind === 'ink') {
        var rl0 = rails[it.rail], one = p >= rl0.fuse && !bow[it.i];
        if (one && it !== rl0.blocks[0]) { if (!it.hid) { it.el.style.visibility = 'hidden'; it.hid = true; } continue; }
        if (!one && it.hid) { it.el.style.visibility = ''; it.hid = false; }
        if (one) {                                // the lead block covers the whole rule
          pose(rl0.blocks[0], p, oA); pose(rl0.blocks[rl0.blocks.length - 1], p, oB);
          var l0 = oA.x - oA.w / 2, r0 = oB.x + oB.w / 2; o.x = (l0 + r0) / 2; o.w = r0 - l0; o.sx = 1; o.sh = 0;
        }
      }
      var X = o.x + it.ox + o.sh, Y = o.y + it.oy, sk = 0, sx = o.w / it.rw * o.sx, sy = o.h / it.rh * o.sy;
      // squash and stretch from the real on-screen velocity, along the dominant axis
      var travel = it.kind === 'rep' || it.kind === 'ink' && p < it.s2 || it.kind === 'coral' && p < tl.c[0];
      if (dt > 0) {
        var vx = (X - it.px) / dt, vy = (Y - it.py) / dt, v = travel ? Math.sqrt(vx * vx + vy * vy) : Math.sqrt(it.vx * it.vx + it.vy * it.vy);
        if (!travel) { vx = it.vx; vy = it.vy; }
        var st = 1 + Math.min(v / 1900, .4), kx = Math.abs(vx) >= Math.abs(vy);
        if (v > 40) { if (kx) { sx *= st; sy /= Math.sqrt(st); } else sy *= st; }
        if (v > it.vmax) { it.vmax = v; it.sqAx = kx ? 0 : 1; }
        if (v < 30 && it.vmax > 650 && pRaw < .015) { it.sq = now; it.vmax = 0; }
        if (v < 30 && it.vmax <= 650) it.vmax *= .9;
      }
      var sa = now - it.sq;
      if (sa >= 0 && sa < 110) { var qq = 1 - .14 * Math.sin(Math.PI * sa / 110); if (it.sqAx === 0) { sx *= qq; sy /= qq; } else { sy *= qq; sx /= qq; } }
      if (it.flinch) { if (Math.abs(it.ry - my) > Math.abs(it.rx - mx) * .4) sy *= .88; else sx *= .88; }
      it.px = X; it.py = Y;
      var ru = bow[it.i];
      if (ru) {
        var l = X - o.w / 2, r = X + o.w / 2, yl = bowAt(ru, l), yr = bowAt(ru, r);
        Y += (yl + yr) / 2; sk = Math.atan2(yr - yl, r - l);
      }
      var ty2 = Y - it.ry; if (!sk && (dt === 0 || Math.abs(Y - it.py0) < .05) && sy === 1) ty2 = Math.round(Y - it.rh / 2 + yf) - yf - (it.ry - it.rh / 2);
      it.py0 = Y;
      var tf = 'translate(' + (X - it.rx).toFixed(2) + 'px,' + ty2.toFixed(2) + 'px)' + (sk ? ' skewY(' + sk.toFixed(4) + 'rad)' : '') +
        ((sx !== 1 || sy !== 1) ? ' scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')' : '');
      if (tf !== it.tf) { it.el.style.transform = tf; it.tf = tf; }
    }
    if (p >= tl.end - .001) { words.forEach(function (wd) { if (wd.clip !== 'none') { wd.tx.style.clipPath = 'none'; wd.clip = 'none'; } }); }
    else words.forEach(function (wd) { clipWord(wd, p); });
  }

  // ------------------------------------------------------------------ the loop
  function tick(now) {
    var dt = tPrev ? Math.min(.05, (now - tPrev) / 1000) : 1 / 60; tPrev = now;
    pRaw = progress();
    var k = 1 - Math.exp(-dt / .17);
    pS += (pRaw - pS) * k; if (Math.abs(pRaw - pS) < .0003) pS = pRaw;
    var calm = pRaw > .015 || pS > .015, moving = pS !== pRaw;
    var spd = Math.sqrt(pvx * pvx + pvy * pvy); pvx *= Math.pow(.02, dt); pvy *= Math.pow(.02, dt);
    if (spd > 5) moving = true;
    var n = Math.max(1, Math.ceil(dt * 120)), h = dt / n, i, s;
    targets(now, calm, spd);
    for (s = 0; s < n; s++) for (i = 0; i < items.length; i++) spring(items[i], h);
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (Math.abs(it.vx) > .4 || Math.abs(it.vy) > .4 || Math.abs(it.ox - it.tx) > .08 || Math.abs(it.oy - it.ty) > .08) moving = true;
      else if (it.wake && now < it.wake) moving = true;                        // a reaction still to come
      else if (it.word && it.word.open && !it.word.near) moving = true;        // waiting to creep home
      else if (it.word && !it.word.open && (it.tx || it.ty)) moving = true;   // its turn to close is coming
      else if (it.kind === 'rep' && it.mode && now <= it.hold + 30) moving = true;
      else if (!it.tx && !it.ty) { it.ox = 0; it.oy = 0; it.vx = 0; it.vy = 0; }
    }
    var endOn = pS >= tl.end && Math.abs(pRaw - pS) < .002;
    for (s = 0; s < n; s++) if (strings(now, h, endOn)) moving = true;
    render(pS, dt, now);
    if (now - lastT < 200) moving = true;
    for (i = 0; i < items.length; i++) if (now - items[i].sq < 120) { moving = true; break; }
    if (moving) requestAnimationFrame(tick); else { render(pS, 0, now); running = false; tPrev = 0; }
  }
  function kick() { if (!running && built) { running = true; requestAnimationFrame(tick); } }

  // ------------------------------------------------------------------ input
  function point(x, y) {
    var b = hb.getBoundingClientRect(), s = stage.getBoundingClientRect(), nx = x - b.left, ny = y - b.top, now = performance.now();
    if (lastX !== null && now - lastT < 120 && now > lastT) {
      var dt = (now - lastT) / 1000; pvx = pvx * .5 + (nx - lastX) / dt * .5; pvy = pvy * .5 + (ny - lastY) / dt * .5;
    }
    lastX = nx; lastY = ny; lastT = now; mx = nx; my = ny;
    inside = x >= s.left && x <= s.right && y >= s.top && y <= s.bottom; kick();
  }
  function away() {
    inside = false; lastX = null; mx = my = -1e4;
    var now = performance.now();
    words.forEach(function (wd) { if (wd.open) wd.held = now + 520 + hash(wd.k, 8) * 640; });   // they wait, then creep home
    items.forEach(function (it) { if (it.mode) it.hold = now + it.back; });
    kick();
  }

  function start() {
    measure(); H.classList.add('live', 'sw-on');
    if (STILL) { pS = pRaw = 1; render(1, 0, 0); return; }
    pS = pRaw = progress(); render(pS, 0, performance.now()); kick();
    stage.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') point(e.clientX, e.clientY); });
    stage.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') away(); });
    stage.addEventListener('touchstart', function (e) { lastX = null; var t = e.touches[0]; if (t) point(t.clientX, t.clientY); }, { passive: true });
    stage.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) point(t.clientX, t.clientY); }, { passive: true });
    stage.addEventListener('touchend', away, { passive: true });
    stage.addEventListener('touchcancel', away, { passive: true });
    addEventListener('scroll', kick, { passive: true });
  }
  var rt, w0 = innerWidth;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (innerWidth === w0 && matchMedia('(pointer: coarse)').matches) return;
      w0 = innerWidth; measure();
      if (STILL) render(1, 0, 0); else { tPrev = 0; render(pS, 0, performance.now()); kick(); }
    }, 120);
  });
  window.__reply = { pose: function () { return pS; }, items: function () { return items; }, rules: function () { return rules; } };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
