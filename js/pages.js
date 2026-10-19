/* The Talent Dept. · round 12 · v4 Reply. The inner pages' one moment each.
   The Work: the services index. The open service carries its rule on the rail beneath its name (the hero's grid);
   choosing another sends the rule along the rails: it draws back to the margin, travels the rail to the new name,
   and runs out under it, a touch past, then home. Talent Booking's rule is the Signal. It is drawn the first time
   the index comes into view.
   The Dept.: How we show up draws its three rules in cadence as it enters, each reply line following its rule.
   Contact: the headline draws its rule from the full stop to the margin.
   All one-shot or on request; nothing idles. Reduced motion: everything in place, no travel. */
(function () {
  'use strict';
  var RM = document.documentElement.classList.contains('still') || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function seen(el, fn, th) {
    if (!el) return;
    if (RM || !('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } }); }, { threshold: th || .35 });
    io.observe(el);
  }

  // ---------------------------------------------------------------- The Work: the services index
  var g = document.querySelector('.sv-g');
  if (g) {
    var rule = g.querySelector('.sv-r'), bs = [].slice.call(g.querySelectorAll('.sv-b')), cur = 0, drawn = false, anim = null;
    function geo(b) {
      var t = b.querySelector('.t'), gr = g.getBoundingClientRect(), r = t.getBoundingClientRect();
      var pr = document.createElement('span'); pr.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      t.appendChild(pr); var base = pr.getBoundingClientRect().top; t.removeChild(pr);
      var em = parseFloat(getComputedStyle(rule).fontSize), h = rule.offsetHeight;
      return { x: r.left - gr.left, y: Math.round(base - gr.top + em * .55 - h / 2), w: r.width };
    }
    function tf(s) { return 'translate(' + s.x.toFixed(1) + 'px,' + s.y + 'px) scaleX(' + (s.w / 100).toFixed(4) + ')'; }
    function place(i) { var s = geo(bs[i]); rule.style.transform = drawn ? tf(s) : tf({ x: s.x, y: s.y, w: 0 }); rule.classList.toggle('sig', bs[i].classList.contains('sig')); }
    function open(i) {
      if (i === cur) return;
      var a = geo(bs[cur]), b = geo(bs[i]), was = cur; cur = i;
      bs.forEach(function (x, k) {
        var on = k === i; x.classList.toggle('on', on); x.setAttribute('aria-expanded', on ? 'true' : 'false');
        var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.classList.toggle('on', on);
      });
      b = geo(bs[i]);                            // the layout may have moved on a phone (accordion)
      var sig = bs[i].classList.contains('sig'), col = getComputedStyle(document.documentElement);
      var ink = col.getPropertyValue('--ink').trim() || '#171614', cor = col.getPropertyValue('--coral').trim() || '#D65A4A';
      if (RM || !rule.animate || !drawn) { if (drawn) { rule.style.transform = tf(b); rule.classList.toggle('sig', sig); } else place(i); return; }
      if (anim) anim.cancel();
      var stub = Math.min(a.w, b.w) * .14, c0 = getComputedStyle(rule).backgroundColor;
      anim = rule.animate([
        { transform: tf(a), backgroundColor: c0, offset: 0, easing: 'cubic-bezier(.6,0,.4,1)' },
        { transform: tf({ x: a.x, y: a.y, w: stub }), backgroundColor: c0, offset: .34, easing: 'cubic-bezier(.65,0,.35,1)' },
        { transform: tf({ x: b.x, y: b.y, w: stub }), backgroundColor: sig ? cor : ink, offset: .62, easing: 'cubic-bezier(.3,1.25,.4,1)' },
        { transform: tf(b), backgroundColor: sig ? cor : ink, offset: 1 }
      ], { duration: 820 + Math.min(260, Math.abs(b.y - a.y) * .5), fill: 'none' });
      rule.style.transform = tf(b); rule.classList.toggle('sig', sig);
      anim.onfinish = function () { anim = null; };
    }
    g.addEventListener('click', function (e) { var b = e.target.closest('.sv-b'); if (b) open(bs.indexOf(b)); });
    place(0);
    seen(g, function () {
      drawn = true; var s = geo(bs[cur]);
      if (RM || !rule.animate) { rule.style.transform = tf(s); return; }
      rule.animate([{ transform: tf({ x: s.x, y: s.y, w: 0 }) }, { transform: tf(s) }], { duration: 1100, easing: 'cubic-bezier(.3,1.16,.4,1)', delay: 150, fill: 'backwards' });
      rule.style.transform = tf(s);
    }, .3);
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (anim) anim.cancel(); place(cur); }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(cur); });
  }

  // ---------------------------------------------------------------- The Dept.: How we show up
  var hs = document.querySelector('.hs');
  if (hs && !RM) { hs.classList.add('pre'); seen(hs, function () { requestAnimationFrame(function () { hs.classList.add('in'); }); }, .3); }

  // ---------------------------------------------------------------- Contact: the headline's pause
  var ct = document.querySelector('.ct-h');
  if (ct) { if (RM) ct.classList.add('in'); else requestAnimationFrame(function () { requestAnimationFrame(function () { ct.classList.add('in'); }); }); }
})();
