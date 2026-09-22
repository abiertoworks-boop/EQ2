/* ==========================================================================
   EQコアカード®体験（旧 EQ Gate のカード体験をそのまま移植）
   ・53枚のカードデータと、引いたカードの見た目は実物と同じ
   ・引いたカードの色で、球体の色と動きが変わる
   ========================================================================== */
(function () {
  var Orb = window.Orb;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var EQCC_CARDS = [
  { action:'試す', value:'実践・探究', hex:'#E8832A' },
  { action:'視点を<br>変える', value:'柔軟性・多角的', hex:'#E8832A' },
  { action:'挑戦する', value:'勇気・主体性', hex:'#E8832A' },
  { action:'適応する', value:'柔軟性・バランス', hex:'#E8832A' },
  { action:'克服する', value:'成長・レジリエンス', hex:'#E8832A' },
  { action:'学ぶ', value:'再構築・アップデート', hex:'#E8832A' },
  { action:'改善する', value:'工夫・問題解決', hex:'#E8832A' },
  { action:'尊重する', value:'信頼・対等性', hex:'#4CAF50' },
  { action:'理解する', value:'考え・気持ち', hex:'#4CAF50' },
  { action:'受け入れる', value:'寛容・非判断性', hex:'#4CAF50' },
  { action:'傾聴する', value:'関心・受容', hex:'#4CAF50' },
  { action:'認める', value:'受容・素直さ', hex:'#4CAF50' },
  { action:'共感する', value:'思いやり・つながり', hex:'#4CAF50' },
  { action:'伝え合う', value:'対話・相互理解', hex:'#4CAF50' },
  { action:'リードする', value:'主体性・ビジョン', hex:'#7B5EA7' },
  { action:'競争する', value:'成長・健全な野心', hex:'#7B5EA7' },
  { action:'指示する', value:'明確さ・方向性', hex:'#7B5EA7' },
  { action:'主張する', value:'自信・自己信頼', hex:'#7B5EA7' },
  { action:'比較する', value:'客観性・向上心', hex:'#7B5EA7' },
  { action:'支配する', value:'自己制御・エゴの手放し', hex:'#7B5EA7' },
  { action:'勝つ', value:'責任感・自己効力感', hex:'#7B5EA7' },
  { action:'確かめる', value:'真実・事実', hex:'#E8C530' },
  { action:'振り返る', value:'客観的・学び', hex:'#E8C530' },
  { action:'整理する', value:'区別化・明確化', hex:'#E8C530' },
  { action:'疑う', value:'枠を外す・自己更新', hex:'#E8C530' },
  { action:'知る', value:'情報・状況把握', hex:'#E8C530' },
  { action:'考える', value:'整理・洞察力', hex:'#E8C530' },
  { action:'気づく', value:'自覚・感受性', hex:'#E8C530' },
  { action:'観察する', value:'客観性・注意力', hex:'#E8C530' },
  { action:'伝える', value:'明確さ・誠実さ', hex:'#7BBCD5' },
  { action:'表現する', value:'創造力・自己開示', hex:'#7BBCD5' },
  { action:'話す', value:'対話・関係構築', hex:'#7BBCD5' },
  { action:'言葉に<br>する', value:'整理・自己理解', hex:'#7BBCD5' },
  { action:'説明する', value:'構造化・分かりやすさ', hex:'#7BBCD5' },
  { action:'書く', value:'整理・丁寧さ', hex:'#7BBCD5' },
  { action:'自分を<br>選ぶ', value:'自己確立・選択', hex:'#A8A8A8' },
  { action:'影響を<br>与える', value:'主体性・影響力', hex:'#A8A8A8' },
  { action:'自分を<br>信じる', value:'客観性・自尊心', hex:'#A8A8A8' },
  { action:'決める', value:'自己決定・判断力', hex:'#A8A8A8' },
  { action:'断る', value:'自己信頼・勇気', hex:'#A8A8A8' },
  { action:'向き合う', value:'勇気・自己理解', hex:'#A8A8A8' },
  { action:'育む', value:'成長・見守り', hex:'#E05A6A' },
  { action:'認める', value:'尊重・承認', hex:'#E05A6A' },
  { action:'共感する', value:'理解・分かち合う', hex:'#E05A6A' },
  { action:'思いやる', value:'思いやり・配慮', hex:'#E05A6A' },
  { action:'感謝する', value:'謙虚さ・豊かさ', hex:'#E05A6A' },
  { action:'謝る', value:'真心・責任', hex:'#E05A6A' },
  { action:'管理する', value:'自己管理・習慣化', hex:'#2C4B8C' },
  { action:'責任を<br>持つ', value:'誠実さ・信頼', hex:'#2C4B8C' },
  { action:'約束を<br>守る', value:'信頼・人間関係', hex:'#2C4B8C' },
  { action:'決断する', value:'勇気・判断力', hex:'#2C4B8C' },
  { action:'計画する', value:'目的意識・自己管理', hex:'#2C4B8C' },
  { action:'実行する', value:'責任・行動力', hex:'#2C4B8C' },
];

  /* カードの色帯 → 8色マップ。実物のカードの色どおりに対応させる
     （赤いカード＝8 朱赤色、灰色のカード＝7 グレー。旧版は意味から推測して入れ替えていた） */
  var COLOR_MAP = {
    '#E8C530': 1, '#E8832A': 2, '#7BBCD5': 3, '#4CAF50': 4,
    '#2C4B8C': 5, '#7B5EA7': 6, '#A8A8A8': 7, '#E05A6A': 8
  };
  window.EQCC_CARDS = EQCC_CARDS;
  window.EQCC_COLOR_MAP = COLOR_MAP;

  var TOTAL = 53, VISIBLE = 9, RADIUS = 420;
  var deck = [];
  var curAngle = 0, targetAngle = 0, curIndex = 0;
  var dragging = false, lastX = 0, velocity = 0, lastTime = 0, raf = null, startX = 0, startY = 0, dragDist = 0;
  var sceneEl = document.getElementById('eqccCarouselScene');
  var wrap = document.getElementById('eqccCarouselWrapper');
  var cardEls = [];
  if (!sceneEl || !wrap) return;

  wrap.addEventListener('click', function (e) {
    if (dragDist > 8) { e.stopPropagation(); e.preventDefault(); }
    dragDist = 0;
  }, true);

  function build() {
    sceneEl.innerHTML = ''; cardEls = [];
    for (var i = 0; i < TOTAL; i++) {
      var el = document.createElement('div');
      el.className = 'c-card'; el.dataset.index = i;
      el.innerHTML = '<div class="c-card-back"><div class="c-card-inner"><img class="c-logo-img" src="images/card-logo.png" alt=""><div class="c-eq-text">EQ</div><div class="c-sub-text">EQ Total management</div></div></div>';
      el.addEventListener('click', function () {
        var idx = parseInt(this.dataset.index, 10);
        if (idx === curIndex) draw(); else snapTo(idx);
      });
      sceneEl.appendChild(el); cardEls.push(el);
    }
    update(0);
  }

  function update(angleDeg) {
    var step = 360 / TOTAL, range = (VISIBLE / 2) * step, vis = [];
    for (var i = 0; i < TOTAL; i++) {
      var diff = (((i * step - angleDeg) % 360) + 360) % 360;
      if (diff > 180) diff -= 360;
      var el = cardEls[i];
      if (Math.abs(diff) > range + step) { el.style.visibility = 'hidden'; el.style.opacity = '0'; continue; }
      el.style.visibility = 'visible';
      var rad = diff * Math.PI / 180;
      var z = RADIUS * Math.cos(rad) - RADIUS, x = RADIUS * Math.sin(rad);
      var ratio = 1 - Math.abs(diff) / range;
      el.style.opacity = Math.max(0.15, ratio * 0.85 + 0.15);
      el.style.transform = 'translateX(' + x + 'px) translateZ(' + z + 'px) rotateY(' + (-diff) + 'deg) scale(' + Math.max(0.55, ratio * 0.45 + 0.55) + ')';
      el.style.zIndex = Math.round(ratio * 100);
      vis.push({ el: el, ratio: ratio });
    }
    vis.sort(function (a, b) { return a.ratio - b.ratio; }).forEach(function (v) { sceneEl.appendChild(v.el); });
  }

  function snapTo(idx) {
    var step = 360 / TOTAL;
    curIndex = ((idx % TOTAL) + TOTAL) % TOTAL;
    targetAngle = curIndex * step;
    var diff = targetAngle - curAngle; if (diff > 180) diff -= 360; if (diff < -180) diff += 360;
    targetAngle = curAngle + diff;
    animateTo();
  }
  function animateTo() {
    if (raf) cancelAnimationFrame(raf);
    (function step() {
      var d = targetAngle - curAngle;
      if (Math.abs(d) < 0.05) { curAngle = targetAngle; update(curAngle); return; }
      curAngle += d * 0.18; update(curAngle); raf = requestAnimationFrame(step);
    })();
  }
  function inertia() {
    if (raf) cancelAnimationFrame(raf);
    (function step() {
      if (Math.abs(velocity) < 0.1) {
        var s = 360 / TOTAL, nearest = Math.round(curAngle / s);
        curIndex = ((nearest % TOTAL) + TOTAL) % TOTAL; targetAngle = nearest * s; animateTo(); return;
      }
      curAngle += velocity; velocity *= 0.88; update(curAngle); raf = requestAnimationFrame(step);
    })();
  }

  var sens = (360 / TOTAL) / 80;
  wrap.addEventListener('touchstart', function (e) {
    var t = e.touches[0]; startX = t.clientX; startY = t.clientY; lastX = t.clientX; lastTime = Date.now();
    velocity = 0; dragging = false; dragDist = 0; if (raf) cancelAnimationFrame(raf);
  }, { passive: true });
  wrap.addEventListener('touchmove', function (e) {
    var t = e.touches[0], dx = t.clientX - startX, dy = t.clientY - startY;
    if (!dragging && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) dragging = true;
    if (!dragging) return;
    e.preventDefault();
    var now = Date.now(), dt = Math.max(1, now - lastTime), mdx = t.clientX - lastX;
    dragDist += Math.abs(mdx);
    curAngle -= mdx * sens; velocity = -mdx * sens * (16 / dt); update(curAngle); lastX = t.clientX; lastTime = now;
  }, { passive: false });
  wrap.addEventListener('touchend', function () { if (!dragging) return; dragging = false; inertia(); }, { passive: true });

  var mouseDown = false, lastMX = 0;
  wrap.addEventListener('mousedown', function (e) { mouseDown = true; lastMX = e.clientX; velocity = 0; dragDist = 0; if (raf) cancelAnimationFrame(raf); e.preventDefault(); });
  window.addEventListener('mousemove', function (e) {
    if (!mouseDown) return;
    var dx = e.clientX - lastMX; dragDist += Math.abs(dx);
    curAngle -= dx * sens; velocity = -dx * sens; update(curAngle); lastMX = e.clientX;
  });
  window.addEventListener('mouseup', function () { if (!mouseDown) return; mouseDown = false; inertia(); });

  function textColor(hex) {
    var c = hex.replace('#', '');
    var yiq = (parseInt(c.substr(0, 2), 16) * 299 + parseInt(c.substr(2, 2), 16) * 587 + parseInt(c.substr(4, 2), 16) * 114) / 1000;
    return yiq >= 140 ? '#333333' : '#FFFFFF';
  }

  var drawBtn = document.getElementById('eqcc-draw-btn');
  function draw() {
    if (!deck.length) { drawBtn.disabled = true; drawBtn.querySelector('span').textContent = 'シャッフルしてください'; return; }
    var i = curIndex % deck.length;
    var card = deck.splice(i, 1)[0];
    document.getElementById('eqcc-remaining').textContent = deck.length;
    show(card);
  }
  function show(card) {
    document.getElementById('eqcc-card-color-bar').style.background = card.hex;
    document.getElementById('eqcc-card-chevron-shape').style.background = card.hex;
    var vt = document.getElementById('eqcc-card-value-text');
    vt.style.color = textColor(card.hex); vt.textContent = card.value;
    document.getElementById('eqcc-card-action').innerHTML = card.action;

    var area = document.getElementById('eqcc-drawn');
    area.classList.remove('is-show'); void area.offsetWidth; area.classList.add('is-show');
    document.getElementById('eqcc-notes').classList.add('is-show');

    var no = COLOR_MAP[card.hex.toUpperCase()];
    var info = (window.EQ_COLORS8 || [])[no - 1];
    var cta = document.getElementById('eqcc-map-cta');
    if (info && cta) {
      cta.style.setProperty('--mc', card.hex);
      cta.querySelector('span').textContent = '「' + info.title + '」の価値観を見る';
      cta.onclick = function () { if (window.EQMap) window.EQMap.go(no, card); };
      cta.classList.add('is-show');
    }
    Orb.setTarget(card.hex, 0.55, 1.4, 1.6);
    Orb.boost(0.6);
    if (!/[?&]capture/.test(location.search)) setTimeout(function () { area.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); }, 150);
  }
  function shuffle() {
    deck = EQCC_CARDS.slice().sort(function () { return Math.random() - 0.5; });
    document.getElementById('eqcc-remaining').textContent = deck.length;
    document.getElementById('eqcc-drawn').classList.remove('is-show');
    document.getElementById('eqcc-notes').classList.remove('is-show');
    document.getElementById('eqcc-map-cta').classList.remove('is-show');
    drawBtn.disabled = false; drawBtn.querySelector('span').textContent = 'カードを引く';
    Orb.reset(); Orb.restore();
  }
  drawBtn.addEventListener('click', draw);
  document.getElementById('eqcc-shuffle').addEventListener('click', shuffle);

  /* 引いたカードは、宙に浮いているようにゆっくり上下する */
  var drawnCard = document.getElementById('eqcc-drawn-card');
  if (!reduceMotion && drawnCard.animate) {
    drawnCard.animate(
      [{ transform: 'translateY(0)', boxShadow: '0 12px 36px rgba(0,0,0,0.2)' }, { transform: 'translateY(-10px)', boxShadow: '0 26px 34px -6px rgba(0,0,0,0.16)' }],
      { duration: 2400, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }
    );
  }

  shuffle();
  build();

  /* 画面に入ったとき、カードが流れてきて正面で止まる */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var played = false;
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting || played) return;
      played = true;
      var from = -(360 / TOTAL) * 9, t0 = performance.now(), dur = 1400;
      (function tick(now) {
        var p = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - p, 4);
        curAngle = from * (1 - e); update(curAngle);
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }, { threshold: 0.3 });
    io.observe(wrap);
  }
  /* 書き出しワークから：選んだ価値観の色のカードから1枚引く */
  window.EQCards = {
    drawColor: function (no) {
      var pool = deck.filter(function (k) { return COLOR_MAP[k.hex.toUpperCase()] === no; });
      if (!pool.length) pool = EQCC_CARDS.filter(function (k) { return COLOR_MAP[k.hex.toUpperCase()] === no; });
      var card = pool[Math.floor(Math.random() * pool.length)];
      var i = deck.indexOf(card);
      if (i > -1) { deck.splice(i, 1); document.getElementById('eqcc-remaining').textContent = deck.length; }
      show(card);
    }
  };

  /* 撮影用：?draw=番号 で、そのカードを引いた状態にする */
  var drawParam = new URLSearchParams(location.search).get('draw');
  if (drawParam) setTimeout(function () {
    var c = EQCC_CARDS[parseInt(drawParam, 10)] || EQCC_CARDS[0];
    show(c);
    if (window.EQMap) window.EQMap.show(COLOR_MAP[c.hex.toUpperCase()], c);
  }, 400);
})();
