/* 両ページ共通：ヘッダー、ふわっと現れる演出、球体と連動するホバー、撮影モード */
(function () {
  var params = new URLSearchParams(location.search);
  var capture = params.has('capture');

  window.Orb = window.EQOrb || {
    setTarget: function () {}, reset: function () {}, boost: function () {}, restore: function () {},
    setOffsetX: function () {}, bind: function () {}
  };

  var header = document.getElementById('header');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var items = [].slice.call(document.querySelectorAll('.reveal'));
  if (capture || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  [].forEach.call(document.querySelectorAll('[data-orb-hover]'), function (el) {
    window.Orb.bind(el, el.getAttribute('data-orb-hover'), 0.45, 1.4, 1.7);
  });

  /* ?capture=1&sec=#id で、その場所を画面の一番上にして撮影する */
  if (capture) {
    document.documentElement.style.scrollBehavior = 'auto';
    /* ?capture=1&only=#id で、そのセクションだけを表示して撮る（撮影専用） */
    var only = params.get('only');
    if (only) {
      var keep = document.querySelector(only);
      [].forEach.call(document.querySelectorAll('main > section'), function (s) { if (s !== keep) s.style.display = 'none'; });
      var ft = document.querySelector('.site-footer'); if (ft) ft.style.display = 'none';
      if (keep) keep.style.paddingTop = '110px';
    }

    var sel = params.get('sec');
    if (sel) {
      var jump = function () {
        var el = document.querySelector(sel);
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - parseFloat(params.get('off') || '0'));
      };
      [100, 900, 2000, 4000].forEach(function (t) { setTimeout(jump, t); });
    }
  }
})();
