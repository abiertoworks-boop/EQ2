/* EQ Gate トップページの体験パーツ */
(function () {
  var Orb = window.Orb;
  var isTouch = window.matchMedia('(hover: none)').matches;

  /* ==========================================================
     1. 同じ出来事、3つの見え方（事実・解釈・思い込み）
     ========================================================== */
  var LENSES = {
    fact: {
      color: '#2f8540', kicker: '① 状態認識（事実）', title: '観察された事実',
      desc: '客観的に観察された、ありのままの事実を、そのまま捉えている状態。',
      bubble: '挨拶をした。<br>返事は、なかった。<br>何かあったのかな？', img: 'fact', alt: '首をかしげて考える女性',
      list: ['主観や解釈を入れず、事実をそのまま見る', '良い・悪いの判断をしない', '五感で確認できること'],
      q: '「実際に起きたことは何か？」'
    },
    interp: {
      color: '#1f5bb8', kicker: '② 解釈（意味づけ）', title: '意味づけ',
      desc: '事実に対して、自分の経験や価値観をもとに、意味づけをしている状態。',
      bubble: '返事がなかった……。<br>私に興味が<br>ないのかもしれない。', img: 'interp', alt: 'ほおに手を当てて不安そうな女性',
      list: ['事実に「意味」をつけている', '過去の経験や価値観が影響する', '人によって解釈が異なる'],
      q: '「この出来事を、どう受け止めているか？」'
    },
    assume: {
      color: '#b0473b', kicker: '③ 思い込み', title: '自分がつくった世界',
      desc: '解釈がさらに強まり、決めつけや思い込みで「自分がつくった世界」を見ている状態。',
      bubble: 'やっぱり嫌われている。<br>私は必要とされていない。<br>どうせうまくいかない。', img: 'assume', alt: '目を閉じてうつむく女性',
      list: ['解釈を「絶対の事実」として信じ込む', '決めつけや一般化が起こる', '自分の世界を狭め、苦しみや行動の制限につながる'],
      q: '「それは本当に事実か？ 他の可能性はないか？」'
    }
  };
  var panel = document.getElementById('filter-panel');
  var body = document.getElementById('filter-body');
  var tabs = [].slice.call(document.querySelectorAll('.tab[data-lens]'));
  function showLens(key, fromUser) {
    var L = LENSES[key];
    tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.getAttribute('data-lens') === key)); });
    panel.style.setProperty('--tc', L.color);
    body.innerHTML =
      '<p class="fp__kicker">' + L.kicker + '</p><h3>' + L.title + '</h3><p class="fp__desc">' + L.desc + '</p>' +
      '<div class="fp__stage"><p class="bubble">' + L.bubble + '</p><img class="fp__person" src="images/people/' + L.img + '.png" alt="' + L.alt + '" width="347" height="620"></div><ul class="fp__list">' + L.list.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
      '<p class="fp__q">' + L.q + '</p>';
    body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
    if (fromUser) { Orb.setTarget(L.color, 0.45, 1.4, 1.7); Orb.boost(0.8); }
  }
  tabs.forEach(function (t) {
    var key = t.getAttribute('data-lens');
    t.addEventListener('click', function () { showLens(key, true); });
    t.addEventListener('mouseenter', function () { Orb.setTarget(LENSES[key].color, 0.45, 1.4, 1.7); Orb.boost(0.8); });
    t.addEventListener('mouseleave', function () { Orb.reset(); Orb.restore(); });
  });

  /* ==========================================================
     2. 認識の循環（11ステップ・アイコン）
     ========================================================== */
  var STEPS = [
    { name: '出来事', icon: 'event', color: '#9aa3b8', desc: '日常で起きる出来事・現象・情報。ここから循環が始まる。' },
    { name: '認知', icon: 'cognition', color: '#1a6eb9', desc: '五感や経験を通して、情報を受け取る。' },
    { name: '認識', icon: 'recognition', color: '#7b8ce0', desc: '価値観や過去の経験をもとに、意味づけ・解釈する。' },
    { name: '感情', icon: 'emotion', color: '#e8384a', desc: '認識から感情が生まれる。感情は、認識を知らせる情報。' },
    { name: '自覚', icon: 'awareness', color: '#f5b400', desc: '感情や思考、身体の反応に気づき、今の自分を客観的に見る。' },
    { name: '理解', icon: 'understanding', color: '#39a62f', desc: 'なぜそう感じたのか。認識が生まれる仕組みや背景を知る。' },
    { name: '認識の更新', icon: 'update', color: '#fe8809', desc: '新しい視点や価値観を取り入れ、認識を書き換える。' },
    { name: 'あり方', icon: 'being', color: '#1d3f7a', desc: '価値観が日常に表れた状態。考え方・接し方・伝え方。' },
    { name: '行動', icon: 'action', color: '#0a1f4d', desc: 'あり方に基づいて、具体的な行動を選ぶ。' },
    { name: '結果', icon: 'result', color: '#9aa3b8', desc: '行動の結果として、現実の変化や反応が返ってくる。' },
    { name: '新しい経験', icon: 'experience', color: '#9aa3b8', desc: '新しい経験が、次の認知の入口になる。' }
  ];
  var ring = document.getElementById('ring');
  var center = document.getElementById('ring-center');
  var nodes = [];
  var active = -1, autoTimer = null, userTouched = false;

  function sizeRing() { ring.style.setProperty('--ringpx', (ring.clientWidth * 0.41) + 'px'); }
  STEPS.forEach(function (s, i) {
    var b = document.createElement('button');
    b.className = 'node';
    b.type = 'button';
    b.style.setProperty('--a', (i * 360 / STEPS.length) + 'deg');
    b.style.setProperty('--sc', s.color);
    b.setAttribute('aria-label', (i + 1) + '. ' + s.name);
    b.innerHTML = '<img class="node__img" src="images/icons/' + s.icon + '.png" alt="" width="72" height="72" loading="lazy">' +
      '<span class="node__num">' + (i + 1) + '</span><span class="node__label">' + s.name + '</span>';
    b.addEventListener('mouseenter', function () { stopAuto(); activate(i, true); });
    b.addEventListener('mouseleave', function () { Orb.reset(); Orb.restore(); Orb.setOffsetX(0); });
    b.addEventListener('focus', function () { stopAuto(); activate(i, true); });
    b.addEventListener('click', function () { stopAuto(); activate(i, true); });
    ring.appendChild(b);
    nodes.push(b);
  });
  sizeRing();
  window.addEventListener('resize', sizeRing);

  function activate(i, fromUser) {
    var s = STEPS[i];
    if (active === i && !fromUser) return;
    nodes.forEach(function (n, k) { n.classList.toggle('is-active', k === i); });
    active = i;
    center.style.setProperty('--sc', s.color);
    center.innerHTML = '<span class="ring__no">STEP ' + String(i + 1).padStart(2, '0') + ' / 11</span>' +
      '<span class="ring__name">' + s.name + '</span><span class="ring__desc">' + s.desc + '</span>';
    center.classList.remove('swap'); void center.offsetWidth; center.classList.add('swap');
    if (fromUser) {
      Orb.setTarget(s.color, 0.45, 1.3, 1.5);
      Orb.boost(0.8);
      Orb.setOffsetX(i % 2 ? 0.55 : -0.55);
      if (isTouch) setTimeout(function () { Orb.reset(); Orb.restore(); Orb.setOffsetX(0); }, 2200);
    }
  }
  /* 誰もさわっていない間は、光が順番にステップを巡る */
  function startAuto() {
    if (userTouched || autoTimer) return;
    autoTimer = setInterval(function () { activate((active + 1) % STEPS.length, false); }, 2400);
    activate((active + 1) % STEPS.length, false);
  }
  function stopAuto() { userTouched = true; clearInterval(autoTimer); autoTimer = null; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) startAuto(); else { clearInterval(autoTimer); autoTimer = null; }
    }, { threshold: 0.35 }).observe(ring);
  }
  if (new URLSearchParams(location.search).has('capture')) activate(3, false);

  /* ==========================================================
     3. 認識のクセを体験する（6ステップの書き出し）
        EQ認識理論の順：出来事 → 感情 → 思考（心の声）→ 認識（意味づけ・価値観・信念）→ 自覚
        → 大切にしていた価値観（EQコアカード®の8色）を選び、その色のカードを引く。
        問いは、うれしい出来事にも、つらい出来事にも使える言い方にしている。
     ========================================================== */
  var EMOTIONS = [
    ['嬉しい', '#e8b93f'], ['安心', '#3aa55a'], ['楽しい', '#f08a3c'], ['感謝', '#d9738f'], ['誇らしい', '#c9a227'],
    ['怒り', '#d6653f'], ['悲しみ', '#4a5fd1'], ['不安', '#7a4fc9'], ['怖い', '#5b3fa0'], ['焦り', '#e8a33f'],
    ['悔しい', '#c0392b'], ['恥ずかしい', '#d67ab0'], ['もやもや', '#8a8f99'], ['その他', '#8a92a8']
  ];
  var work = { emotions: [], value: 0 };
  var chipsBox = document.getElementById('w-emotions');
  EMOTIONS.forEach(function (e) {
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'chip'; c.textContent = e[0];
    c.style.setProperty('--ec', e[1]);
    c.setAttribute('aria-pressed', 'false');
    c.addEventListener('click', function () {
      var on = c.classList.toggle('is-on');
      c.setAttribute('aria-pressed', String(on));
      if (on) { work.emotions.push(e[0]); Orb.setTarget(e[1], 0.45, 1.3, 1.6); Orb.boost(0.6); }
      else { work.emotions = work.emotions.filter(function (x) { return x !== e[0]; }); Orb.reset(); Orb.restore(); }
    });
    chipsBox.appendChild(c);
  });
  var intensity = document.getElementById('w-intensity');
  intensity.addEventListener('input', function () { document.getElementById('w-intensity-v').textContent = intensity.value; });

  var workPanel = document.getElementById('work-panel');
  var bars = [].slice.call(workPanel.querySelectorAll('.progress span'));
  var valueBox = document.getElementById('w-values');
  function val(id) { return document.getElementById(id).value.trim(); }

  /* STEP 6：価値観の8色（COLORS8 は下の「4.」で定義。開いたときに組み立てる） */
  function buildValues() {
    if (valueBox.children.length) return;
    COLORS8.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.style.setProperty('--vc', c.hex);
      b.innerHTML = '<img src="images/values/v' + c.no + '.png" alt=""><b>' + c.title + '</b><span>' + c.desc.replace(/価値観$/, '') + '</span>';
      b.addEventListener('click', function () {
        work.value = c.no;
        [].forEach.call(valueBox.children, function (x) { x.classList.remove('is-on'); x.setAttribute('aria-checked', 'false'); });
        b.classList.add('is-on'); b.setAttribute('aria-checked', 'true');
        Orb.setTarget(c.hex, 0.35, 1.1, 1.4); Orb.boost(0.6);
      });
      valueBox.appendChild(b);
    });
  }

  function goStep(n) {
    [].forEach.call(workPanel.querySelectorAll('.step'), function (s) { s.classList.toggle('is-show', s.getAttribute('data-step') === String(n)); });
    bars.forEach(function (b, k) { b.classList.toggle('is-on', k < Math.min(n, 6)); });
    if (n === 5) {
      var meaning = val('w-q1'), care = val('w-q2'), belief = val('w-q3');
      var t = '私はこの出来事を、「' + (meaning || val('w-thought') || '……') + '」と受け止めていました。';
      if (care) t += '\nその奥で、「' + care + '」を大切にしていました。';
      if (belief) t += '\nそして、「' + belief + '」と思っていました。';
      var m = document.getElementById('w-mirror');
      m.textContent = t; m.style.whiteSpace = 'pre-line';
    }
    if (n === 6) buildValues();
    var top = workPanel.getBoundingClientRect().top;
    if (top < 60) window.scrollBy({ top: top - 100, behavior: 'smooth' });
  }
  [].forEach.call(workPanel.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () { goStep(parseInt(b.getAttribute('data-go'), 10)); });
  });
  document.getElementById('w-finish').addEventListener('click', function () {
    var lines = [];
    if (val('w-event')) lines.push('出来事：' + val('w-event'));
    if (work.emotions.length) lines.push('感情：' + work.emotions.join('・') + '（強さ ' + intensity.value + '/10）');
    if (val('w-thought')) lines.push('心の声：「' + val('w-thought') + '」');
    if (val('w-q1')) lines.push('受け止め方：「' + val('w-q1') + '」');
    if (val('w-q2')) lines.push('大切にしていたこと：「' + val('w-q2') + '」');
    if (val('w-q3')) lines.push('思っていたこと：「' + val('w-q3') + '」');
    if (val('w-awareness')) lines.push('気づいたこと：「' + val('w-awareness') + '」');
    document.getElementById('w-result').textContent = lines.length ? lines.join('\n') : '今日は、答えを見つけることより、自分の認識に気づくことが目的です。';
    var box = document.getElementById('w-value-box'), toCard = document.getElementById('w-to-card');
    if (work.value) {
      var c = COLORS8[work.value - 1];
      box.hidden = false;
      box.style.setProperty('--vc', c.hex);
      box.innerHTML = '<img src="images/values/v' + c.no + '.png" alt=""><p>大切にしていたのは、<b>「' + c.title + '」</b>に近い価値観でした。この色のEQコアカード®から1枚引いて、次の一歩を見つけましょう。</p>';
      toCard.querySelector('span').textContent = '「' + c.title + '」のカードを引く';
      toCard.style.background = c.hex; toCard.style.borderColor = c.hex;
      Orb.setTarget(c.hex, 0.4, 1.2, 1.5);
    } else {
      box.hidden = true;
      toCard.querySelector('span').textContent = 'コアカードを引く';
      toCard.style.background = ''; toCard.style.borderColor = '';
    }
    goStep(7);
  });
  /* ふり返り → EQコアカード®へ。価値観を選んでいれば、その色のカードから1枚引く */
  document.getElementById('w-to-card').addEventListener('click', function () {
    var cards = document.getElementById('cards');
    cards.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (work.value && window.EQCards) setTimeout(function () { window.EQCards.drawColor(work.value); }, 900);
  });
  document.getElementById('w-restart').addEventListener('click', function () {
    ['w-event', 'w-thought', 'w-q1', 'w-q2', 'w-q3', 'w-awareness'].forEach(function (id) { document.getElementById(id).value = ''; });
    work.emotions = []; work.value = 0;
    [].forEach.call(chipsBox.children, function (c) { c.classList.remove('is-on'); c.setAttribute('aria-pressed', 'false'); });
    [].forEach.call(valueBox.children, function (c) { c.classList.remove('is-on'); c.setAttribute('aria-checked', 'false'); });
    intensity.value = 5; document.getElementById('w-intensity-v').textContent = '5';
    Orb.reset();
    goStep(1);
  });
  if (new URLSearchParams(location.search).get('wstep')) setTimeout(function () { goStep(parseInt(new URLSearchParams(location.search).get('wstep'), 10)); }, 200);


  /* ==========================================================
     2b. 3つの原理にふれると、関係するステップが拡大し、線で結ばれる
     ========================================================== */
  var links = document.getElementById('ring-links');
  var SVGNS = 'http://www.w3.org/2000/svg';
  function nodePoint(i) {
    var a = (i * 360 / STEPS.length) * Math.PI / 180;
    return [50 + 41 * Math.sin(a), 50 - 41 * Math.cos(a)];
  }
  function clearLinks() {
    ring.classList.remove('is-linking');
    nodes.forEach(function (n) { n.classList.remove('is-linked'); });
    [].forEach.call(links.children, function (el) { el.classList.remove('is-on'); });
    setTimeout(function () { if (!ring.classList.contains('is-linking')) links.innerHTML = ''; }, 500);
  }
  function showLinks(p) {
    var ids = p.getAttribute('data-link').split(',').map(function (x) { return parseInt(x, 10) - 1; });
    var color = getComputedStyle(p).getPropertyValue('--pc').trim();
    stopAuto();
    links.innerHTML = '';
    ring.style.setProperty('--lc', color);
    ring.classList.add('is-linking');
    nodes.forEach(function (n, k) { n.classList.toggle('is-linked', ids.indexOf(k) > -1); n.classList.remove('is-active'); });
    var d = ids.map(function (id, k) { var pt = nodePoint(id); return (k ? 'L' : 'M') + pt[0].toFixed(2) + ' ' + pt[1].toFixed(2); }).join(' ');
    var path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('pathLength', '1');
    links.appendChild(path);
    ids.forEach(function (id) {
      var pt = nodePoint(id), c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', pt[0]); c.setAttribute('cy', pt[1]); c.setAttribute('r', '1.1');
      links.appendChild(c);
    });
    void links.getBoundingClientRect();
    requestAnimationFrame(function () { [].forEach.call(links.children, function (el) { el.classList.add('is-on'); }); });
    center.style.setProperty('--sc', color);
    center.innerHTML = '<span class="ring__no">PRINCIPLE ' + p.querySelector('.principle__no').textContent + '</span>' +
      '<span class="ring__name" style="font-size:clamp(1.05rem,2vw,1.35rem)">' + p.querySelector('h3').textContent + '</span>' +
      '<span class="ring__desc">' + p.querySelector('.principle__steps').textContent + '</span>';
    center.classList.remove('swap'); void center.offsetWidth; center.classList.add('swap');
    Orb.setTarget(color, 0.4, 1.2, 1.5); Orb.boost(0.75);
  }
  [].forEach.call(document.querySelectorAll('.principle[data-link]'), function (p) {
    p.addEventListener('mouseenter', function () { showLinks(p); });
    p.addEventListener('focus', function () { showLinks(p); });
    p.addEventListener('mouseleave', function () { clearLinks(); Orb.reset(); Orb.restore(); });
    p.addEventListener('blur', function () { clearLinks(); Orb.reset(); Orb.restore(); });
    p.addEventListener('click', function () {
      var on = p.classList.toggle('is-on');
      [].forEach.call(document.querySelectorAll('.principle.is-on'), function (o) { if (o !== p) o.classList.remove('is-on'); });
      if (on) { showLinks(p); if (isTouch) ring.scrollIntoView({ behavior: 'smooth', block: 'center' }); } else clearLinks();
    });
  });
  var capParams = new URLSearchParams(location.search);
  if (capParams.get('link')) {
    var pl = document.querySelectorAll('.principle[data-link]')[parseInt(capParams.get('link'), 10) - 1];
    if (pl) setTimeout(function () { showLinks(pl); }, 300);
  }

  /* ==========================================================
     4. 8色の価値観成長マップ（実物カードの写真つき）
     ========================================================== */
  var COLORS8 = [
    { no: 1, title: '自己認識', name: '黄色', hex: '#e8b93f', desc: '自己認識力を高める価値観' },
    { no: 2, title: '新しい視点', name: 'オレンジ', hex: '#e8813f', desc: '新しい価値観を生み出す価値観' },
    { no: 3, title: '自己表現', name: '水色', hex: '#4fb6d6', desc: '自己表現を促す価値観' },
    { no: 4, title: '人間関係', name: 'グリーン', hex: '#4caf7d', desc: '人間関係を深める価値観' },
    { no: 5, title: '責任を持つ', name: '紺色', hex: '#2c3e78', desc: '責任と使命感を育てる価値観' },
    { no: 6, title: '自己中軸を整える', name: '紫色', hex: '#7a4fc9', desc: '自己中軸を整え、変容を促す価値観' },
    { no: 7, title: '他者を思いやる', name: 'グレー', hex: '#8a8f99', desc: '他人中軸を整え、思いやりを育てる価値観' },
    { no: 8, title: '成熟した自己', name: '朱赤色', hex: '#c0392b', desc: '自分軸（成熟した自己）を確立する価値観' }
  ];
  window.EQ_COLORS8 = COLORS8;
  var grid8 = document.getElementById('grid8');
  var tiles = [];
  COLORS8.forEach(function (c) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'c8';
    el.id = 'c8-' + c.no;
    el.style.setProperty('--c8', c.hex);
    el.innerHTML = '<span class="c8__icon"><img src="images/values/v' + c.no + '.png" alt="" loading="lazy"></span>' +
      '<span class="c8__head"><span class="c8__badge">' + String(c.no).padStart(2, '0') + '</span><span class="c8__title">' + c.title + '</span></span>' +
      '<span class="c8__desc" style="display:block">' + c.desc + '</span><span class="c8__color">' + c.name + 'のカード</span>';
    Orb.bind(el, c.hex, 0.45, 1.3, 1.5);
    el.addEventListener('click', function () { showSpot(c.no, null); });
    grid8.appendChild(el);
    tiles.push(el);
  });

  var spot = document.getElementById('spot');
  function showSpot(no, drawn) {
    var c = COLORS8[no - 1];
    tiles.forEach(function (t, k) { t.classList.toggle('is-on', k === no - 1); });
    spot.style.setProperty('--sc', c.hex);
    document.getElementById('spot-icon').src = 'images/values/v' + no + '.png';
    document.getElementById('spot-label').textContent = 'COLOR ' + String(no).padStart(2, '0') + ' — ' + c.name + 'のカード';
    document.getElementById('spot-name').textContent = c.title;
    document.getElementById('spot-desc').textContent = c.desc;
    var drawnEl = document.getElementById('spot-drawn');
    if (drawn) {
      drawnEl.hidden = false;
      drawnEl.innerHTML = 'あなたが引いたカード：<b></b>（<span></span>）';
      drawnEl.querySelector('b').textContent = drawn.action.replace(/<br>/g, '');
      drawnEl.querySelector('span').textContent = drawn.value;
    } else drawnEl.hidden = true;
    document.getElementById('spot-text').textContent = drawn
      ? 'このカードは、「' + c.desc + '」の仲間です。同じ色のカードには、次のような言葉が並んでいます。'
      : '「' + c.desc + '」の色です。この色のカードには、次のような言葉が並んでいます。';
    var words = document.getElementById('spot-words');
    words.innerHTML = '';
    var cards = window.EQCC_CARDS || [], map = window.EQCC_COLOR_MAP || {};
    cards.filter(function (k) { return map[k.hex.toUpperCase()] === no; }).forEach(function (k) {
      var s = document.createElement('span');
      s.textContent = k.action.replace(/<br>/g, '');
      if (drawn && k.action === drawn.action && k.value === drawn.value) s.className = 'is-drawn';
      words.appendChild(s);
    });
    spot.classList.remove('is-show'); void spot.offsetWidth; spot.classList.add('is-show');
    Orb.setTarget(c.hex, 0.4, 1.2, 1.5);
  }

  /* 引いたカードのボタン → カードの色の幕が画面を流れ、価値観マップへ運ぶ */
  var curtain = document.getElementById('curtain');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.EQMap = {
    go: function (no, drawn) {
      var c = COLORS8[no - 1];
      var target = document.getElementById('map8');
      if (reduce || !curtain) { target.scrollIntoView(); showSpot(no, drawn); return; }
      curtain.style.setProperty('--cc', c.hex);
      document.getElementById('curtain-label').textContent = c.title + '　—　' + c.desc;
      curtain.className = 'curtain is-in';
      setTimeout(function () {
        var html = document.documentElement, prev = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 90);
        html.style.scrollBehavior = prev;
        showSpot(no, drawn);
        setTimeout(function () { curtain.className = 'curtain is-out'; }, 350);
        setTimeout(function () { curtain.className = 'curtain'; }, 1300);
      }, 650);
    },
    show: showSpot
  };
  if (capParams.get('spot')) setTimeout(function () { showSpot(parseInt(capParams.get('spot'), 10), null); }, 300);

  /* ==========================================================
     5. ゲートの先にある道のり：内側に湾曲したギャラリー
        中央の枠がいちばん奥（小さく）、両端ほど手前（大きく）見える円筒の内側。
        ゆっくり流れ続け、ドラッグ・スワイプ・スクロールで回る。各枠は EQ Platform の該当ステージへのリンク。
     ========================================================== */
  var gal = document.getElementById('jgal');
  var galScene = document.getElementById('jgal-scene');
  if (gal && galScene) {
    var PF = 'https://abiertoworks-boop.github.io/eq-platform/';
    var STAGES6 = [
      { k: 'STAGE 01', role: '入口', name: 'EQ Gate', text: 'EQとの出会いの入口。体験ワーク・勉強会・動画などに、無料でふれられる。', c: '#dd9a45', icon: 'gate', href: PF + '#stage-1', here: true },
      { k: 'STAGE 02', role: '心の土台を育てる', name: 'EIA', text: '認識を自覚し、更新し続ける継続成長プログラム。', c: '#48a878', icon: 'eia', href: PF + '#stage-2' },
      { k: 'STAGE 03', role: 'EQを使う力を育てる', name: 'EQ Skills', text: '感情リテラシーやコミュニケーション力を高める基礎プログラム。', c: '#4a7fd6', icon: 'skills', href: PF + '#stage-3' },
      { k: 'STAGE 04', role: 'あり方・人間力を育てる', name: 'EQ Humanity', text: 'メタ認知や他者理解を通して、人格・人間力を高める。', c: '#8871c9', icon: 'humanity', href: PF + '#stage-4' },
      { k: 'STAGE 05', role: '学んだEQを実践する', name: 'EQTM', text: '仲間と実践し、学びを日常の習慣にしていく場。', c: '#3d968a', icon: 'eqtm', href: PF + '#stage-5' },
      { k: 'STAGE 06', role: '社会へ活かす', name: 'EQ Business Nexus', text: 'EQ認識理論を活かし、個人・企業・組織の課題解決に伴走する。', c: '#c98a9e', icon: null, href: PF + '#nexus' }
    ];
    var REP = 3, slides = [];
    for (var r = 0; r < REP; r++) {
      STAGES6.forEach(function (s) {
        var a = document.createElement('a');
        a.className = 'jslide';
        a.href = s.href; a.target = '_blank'; a.rel = 'noopener';
        a.style.setProperty('--c', s.c);
        a.setAttribute('aria-label', s.name + '（EQ Platformの紹介ページを開く）');
        if (r > 0) { a.tabIndex = -1; a.setAttribute('aria-hidden', 'true'); }
        a.innerHTML = (s.here ? '<span class="jslide__here">いまここ</span>' : '') +
          '<span class="jslide__art">' + (s.icon ? '<img src="images/stages/' + s.icon + '.png" alt="" loading="lazy">' : '<span class="jslide__mark"></span>') + '</span>' +
          '<span class="jslide__body"><span class="jslide__k">' + s.k + '</span><span class="jslide__role">' + s.role + '</span>' +
          '<span class="jslide__name">' + s.name + '</span><span class="jslide__text">' + s.text + '</span><span class="jslide__go">詳しく見る</span></span>';
        a.addEventListener('mouseenter', function () { Orb.setTarget(s.c, 0.3, 1, 1.4); Orb.boost(0.6); });
        a.addEventListener('mouseleave', function () { Orb.reset(); Orb.restore(); });
        galScene.appendChild(a);
        slides.push(a);
      });
    }
    var N = slides.length;
    var galOffset = 0, galVel = 0, galDrag = false, galLastX = 0, galMoved = 0, galScrollBase = null;
    var reduceG = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fixedJo = capParams.get('jo');
    function layoutGal() {
      var small = window.innerWidth < 900;
      var R = small ? 460 : 760, step = small ? 21 : 17;
      galScene.style.transform = 'translateZ(' + (R * 0.6) + 'px)';
      for (var i = 0; i < N; i++) {
        var pos = ((i - galOffset) % N + N) % N;
        if (pos > N / 2) pos -= N;
        var ang = pos * step;
        var el = slides[i];
        if (Math.abs(ang) > 78) { el.style.visibility = 'hidden'; continue; }
        el.style.visibility = 'visible';
        el.style.transform = 'rotateY(' + (-ang) + 'deg) translateZ(' + (-R) + 'px)';
        el.style.opacity = String(Math.max(0, Math.min(1, (78 - Math.abs(ang)) / 18)));
      }
    }
    function galScrollShift() {
      var rect = gal.getBoundingClientRect();
      return (window.innerHeight - rect.top) / (window.innerHeight + rect.height) * 2.4;
    }
    var galLast = performance.now(), galRunning = false;
    function galTick(now) {
      var dt = Math.min(0.05, (now - galLast) / 1000); galLast = now;
      if (!galDrag) {
        galOffset += galVel;
        galVel *= 0.93;
        if (!reduceG) galOffset += dt * 0.12;
      }
      var shift = galScrollShift();
      if (galScrollBase === null) galScrollBase = shift;
      galOffset += (shift - galScrollBase); galScrollBase = shift;
      layoutGal();
      if (galRunning) requestAnimationFrame(galTick);
    }
    if (fixedJo !== null) { galOffset = parseFloat(fixedJo); layoutGal(); }
    else {
      layoutGal();
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && !galRunning) { galRunning = true; galLast = performance.now(); galScrollBase = null; requestAnimationFrame(galTick); }
        else if (!en[0].isIntersecting) galRunning = false;
      }, { threshold: 0 }).observe(gal);
    }
    var pxPerSlide = function () { return window.innerWidth < 900 ? 170 : 210; };
    gal.addEventListener('pointerdown', function (e) { galDrag = true; galLastX = e.clientX; galMoved = 0; galVel = 0; });
    window.addEventListener('pointermove', function (e) {
      if (!galDrag) return;
      var dx = e.clientX - galLastX; galLastX = e.clientX; galMoved += Math.abs(dx);
      galOffset -= dx / pxPerSlide(); galVel = -dx / pxPerSlide();
    });
    window.addEventListener('pointerup', function () { galDrag = false; });
    gal.addEventListener('click', function (e) { if (galMoved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    gal.addEventListener('dragstart', function (e) { e.preventDefault(); });
    window.addEventListener('resize', layoutGal);
  }
})();
