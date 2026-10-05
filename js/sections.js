/* ==========================================================================
   EQ Gate — セクションの動き
   ・「EQとは」：〇△□を浮き彫りにする（影・ハイライト・本体を重ね、光が斜めに走る）
   ・「EQを学べばどうなるか」：5枚のカードを円状に配置し、ゆっくり回す
     （ドラッグで回せる／ドットで選べる／手前のカードは大きく、奥は傾いてぼける）
   ========================================================================== */
(function () {
  var params = new URLSearchParams(location.search);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 〇△□の浮き彫り ---------- */
  [].slice.call(document.querySelectorAll('.eqtri__art')).forEach(function (svg) {
    [].slice.call(svg.querySelectorAll('.emb')).forEach(function (g) {
      var sh = g.cloneNode(true), hi = g.cloneNode(true);
      sh.classList.add('emb--sh'); hi.classList.add('emb--hi');
      sh.removeAttribute('style'); hi.removeAttribute('style');
      g.parentNode.insertBefore(sh, g);
      g.parentNode.insertBefore(hi, g);
    });
    if (reduce && svg.pauseAnimations) svg.pauseAnimations();
  });

  /* ---------- 円状に回るカード ---------- */
  var stage = document.getElementById('orbit-stage');
  var ring = document.getElementById('orbit-ring');
  var dotsBox = document.getElementById('orbit-dots');
  if (!stage || !ring) return;

  var cards = [].slice.call(ring.children);
  var n = cards.length, step = 360 / n;
  var dots = [];
  cards.forEach(function (li, i) {
    li.style.setProperty('--i', i);
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', (i + 1) + '番目の変化を見る');
    b.addEventListener('click', function () { goTo(i); });
    dotsBox.appendChild(b); dots.push(b);
  });

  var fixed = params.get('orbit');           // 撮影用：角度を固定
  var ang = fixed !== null ? parseFloat(fixed) : 0, goal = ang;
  var drag = false, startX = 0, startAng = 0, moved = 0;
  var hover = false, idle = 0, running = false, last = 0, active = -1;
  var AUTO = 3.6;

  function norm(a) { a = ((a + 180) % 360 + 360) % 360 - 180; return a; }
  function goTo(i) {
    var want = -i * step;
    goal += norm(want - goal);
    idle = 0;
  }

  function paint() {
    ring.style.transform = 'translateZ(calc(var(--R) * -1)) rotateY(' + ang.toFixed(2) + 'deg)';
    var front = 0, best = 999;
    cards.forEach(function (li, i) {
      var rel = Math.abs(norm(i * step + ang));      // 正面からの角度（0〜180）
      if (rel < best) { best = rel; front = i; }
      var behind = Math.max(0, Math.min(1, (rel - 36) / 90));   // 奥ほど1に近づく
      li.style.opacity = (1 - behind * 0.78).toFixed(2);
      li.style.filter = behind > 0.02 ? 'blur(' + (behind * 6).toFixed(1) + 'px)' : 'none';
      li.classList.toggle('is-front', rel < 18);
    });
    if (front !== active) {
      active = front;
      dots.forEach(function (d, k) { d.classList.toggle('is-on', k === front); });
    }
  }

  function tick(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!drag && fixed === null) {
      if (!hover && !reduce) {
        idle += dt;
        if (idle >= AUTO) { idle = 0; goal -= step; }
      }
      ang += (goal - ang) * Math.min(1, dt * 3.2);
    }
    paint();
    requestAnimationFrame(tick);
  }

  stage.addEventListener('pointerdown', function (e) {
    drag = true; moved = 0; startX = e.clientX; startAng = ang; stage.classList.add('is-drag');
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 古いブラウザは無視 */ }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - startX; moved = Math.max(moved, Math.abs(dx));
    ang = startAng + dx * 0.32; goal = ang;
  });
  function release() {
    if (!drag) return;
    drag = false; stage.classList.remove('is-drag');
    goal = Math.round(ang / step) * step; idle = -1.5;
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('mouseenter', function () { hover = true; });
  stage.addEventListener('mouseleave', function () { hover = false; });
  stage.addEventListener('dragstart', function (e) { e.preventDefault(); });

  paint();
  if (fixed !== null) return;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
      else if (!en[0].isIntersecting) running = false;
    }, { threshold: 0 }).observe(stage);
  } else { running = true; last = performance.now(); requestAnimationFrame(tick); }
})();
