/* The Work · the record shelf. One spine is pulled out at a time; click (or Enter) another to swap. The services in
   the head pull out their spine and bring the shelf into view. */
(function () {
  var sh = document.querySelector('.sh'); if (!sh) return;
  function pull(sp) {
    [].forEach.call(sh.querySelectorAll('.sp'), function (o) {
      var on = o === sp; o.classList.toggle('on', on); o.firstElementChild.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }
  sh.addEventListener('click', function (e) {
    var b = e.target.closest('.sp-b'); if (!b) return;
    if (!b.parentNode.classList.contains('on')) pull(b.parentNode);
  });
  [].forEach.call(document.querySelectorAll('a[data-sp]'), function (a) {
    a.addEventListener('click', function (e) {
      var sp = sh.querySelectorAll('.sp')[+a.getAttribute('data-sp')]; if (!sp) return;
      e.preventDefault(); pull(sp);
      sh.closest('section').scrollIntoView({ block: 'start' });
    });
  });
})();
