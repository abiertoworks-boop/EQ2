/* ==========================================================================
   eq-layer-carousel.js — 重なるカードのカルーセル（依存なし・どのサイトでもそのまま使える）
   HTML に data-lcar を付けた要素を、読み込み時に自動で動かす。
     <div class="lcar" data-lcar data-autoplay="4600"> … </div>   ← 使い方は README.md
   ・左右の矢印／ドラッグ／スワイプ／キーボード（←→）／ドット／横のカードをクリック で切り替え
   ・data-autoplay（ミリ秒）で自動送り。ふれている間・画面外では止まる
   ・画面に入ると、カードが中央から扇のように広がる
   ・撮影・確認用：URL に ?lcar=番号 で、その番号のカードを正面にして固定する
   ========================================================================== */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fixed = new URLSearchParams(location.search).get('lcar');

  function init(root) {
    var stage = root.querySelector('.lcar__stage');
    var cards = [].slice.call(stage.querySelectorAll('.lcar__card'));
    var n = cards.length;
    if (!n) return;
    var dotsBox = root.querySelector('.lcar__dots');
    var dots = [];
    var cur = fixed !== null ? (parseInt(fixed, 10) || 0) : 0;
    var autoMs = parseInt(root.getAttribute('data-autoplay') || '0', 10);
    var timer = null, hover = false, shown = false, drag = false, sx = 0, moved = 0;
    var VIS = Math.min(3, Math.floor(n / 2));      // 正面から左右に何枚まで見せるか

    if (dotsBox) {
      cards.forEach(function (c, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.setAttribute('aria-label', (i + 1) + '枚目を見る');
        b.addEventListener('click', function () { go(i, true); });
        dotsBox.appendChild(b); dots.push(b);
      });
    }

    function rel(i) {            // 正面からの位置（-n/2 〜 n/2）
      var d = ((i - cur) % n + n) % n;
      return d > n / 2 ? d - n : d;
    }
    function layout() {
      var w = cards[0].offsetWidth || 280;
      cards.forEach(function (c, i) {
        var r = rel(i), a = Math.abs(r), vis = a <= VIS && shown;
        var s = Math.max(0.55, 1 - 0.13 * a);
        /* 横のカードは、正面のカードの陰から少しだけのぞく（1枚目 35%・2枚目 28%・3枚目 20% ずつ外へ） */
        var peek = [0, 0.35, 0.63, 0.83][Math.min(a, 3)];
        var x = Math.sign(r) * (a === 0 ? 0 : w * (0.5 + peek - 0.5 * s));
        c.style.transform = vis ? 'translateX(' + x.toFixed(1) + 'px) translateZ(' + (-a * 70) + 'px) rotateY(' + (-Math.sign(r) * Math.min(a, 2) * 7) + 'deg) scale(' + s.toFixed(3) + ')' : 'translateX(0) scale(.7)';
        c.style.opacity = vis ? String(Math.max(0, 1 - 0.07 * a)) : '0';
        c.style.zIndex = String(100 - a * 10 - (r > 0 ? 1 : 0));
        c.classList.toggle('is-front', r === 0);
        c.classList.toggle('is-vis', vis);
        c.setAttribute('aria-hidden', r === 0 ? 'false' : 'true');
      });
      dots.forEach(function (d, i) { d.classList.toggle('is-on', i === cur); });
    }
    function go(i, user) {
      cur = ((i % n) + n) % n;
      layout();
      if (user) restart();
    }
    function next(d) { go(cur + d, true); }

    root.querySelectorAll('.lcar__nav--prev').forEach(function (b) { b.addEventListener('click', function () { next(-1); }); });
    root.querySelectorAll('.lcar__nav--next').forEach(function (b) { b.addEventListener('click', function () { next(1); }); });
    cards.forEach(function (c, i) {
      c.addEventListener('click', function () { if (moved < 6 && i !== cur) go(i, true); });
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { next(-1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { next(1); e.preventDefault(); }
    });
    root.setAttribute('tabindex', '0');

    /* ドラッグ／スワイプ */
    root.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.lcar__nav,.lcar__dots')) return;
      drag = true; sx = e.clientX; moved = 0; root.classList.add('is-drag');
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (Math.abs(dx) > 60) { next(dx < 0 ? 1 : -1); sx = e.clientX; }
    });
    function up() { drag = false; root.classList.remove('is-drag'); setTimeout(function () { moved = 0; }, 0); }
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    root.addEventListener('dragstart', function (e) { e.preventDefault(); });

    /* 自動送り */
    function restart() { stop(); if (autoMs > 0 && !reduce && fixed === null && !hover && shown) timer = setInterval(function () { go(cur + 1, false); }, autoMs); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    root.addEventListener('mouseenter', function () { hover = true; stop(); });
    root.addEventListener('mouseleave', function () { hover = false; restart(); });
    window.addEventListener('resize', layout);

    /* 画面に入ったら、中央から広がる */
    layout();
    function reveal() { shown = true; requestAnimationFrame(function () { layout(); restart(); }); }
    if (fixed !== null || document.documentElement.classList.contains('capture') || !('IntersectionObserver' in window)) { reveal(); }
    else {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { if (!shown) reveal(); else restart(); } else stop();
      }, { threshold: 0.25 }).observe(root);
    }
    root.eqLayerCarousel = { go: go, next: next };
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-lcar]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
