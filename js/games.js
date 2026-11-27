/* ==========================================================================
   EQコアカード®の遊び方（もしもゲーム／EQ自己認識力ゲーム）
   出典：ユーザー提供の「コアカード体験会の資料」
   ・53枚を「文字が見える面」でランダムに並べる
   ・並べている間はカードに動く装飾をつけない（視認性優先）
   ・「カードを広げる」を押したときだけ、中央から広がる動きをつける
   ・PCはクリック、スマホはタップで選べる。選んだカードには番号が付く
   ========================================================================== */
(function () {
  var section = document.getElementById('games');
  if (!section) return;

  var CARDS = window.EQCC_CARDS || [];
  var board = document.getElementById('gm-board');
  var grid = document.getElementById('gm-grid');
  var picks = document.getElementById('gm-picks');
  var result = document.getElementById('gm-result');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var capture = /[?&]capture/.test(location.search);

  /* もしもゲームのお題（資料の例題より） */
  var MOSHIMO = [
    'もしも…　朝起きたら性別が変わっていたら？<small>最初に何をしますか？　その時の気持ちは？</small>',
    'もしも…　家に帰ってみたら1000万円が置いてありました。<small>まず何をしますか？　その時の気持ちは？</small>',
    'もしも…　宝くじで3億円が当たったら？<small>まず何をしますか？　その時の気持ちは？</small>',
    'もしも…　朝起きたら未来か過去に変わっていました。<small>過去と未来、どちらに行きたいですか？　その時に取る行動は？　その時の気持ちは？</small>',
    'もしも…　外がゾンビだらけになっていたら？<small>どんな行動を取りますか？　その時の気持ちは？</small>',
    'もしも…　あなたが全く新しい分野に挑戦するとしたら？<small>どんな行動を取りますか？　その時の気持ちは？</small>',
    'もしも…　一日だけ透明人間になって、望むものがなんでも叶うとしたら？<small>どんな行動を取りますか？　その時の気持ちは？</small>',
    'もしも…　飛行機のトラブルで墜落しそうになったとき。<small>どんな行動を取りますか？　その時の気持ちは？</small>'
  ];

  var GAMES = {
    moshimo: {
      label: 'Game 01 — もしもゲーム',
      color: '#2f6fb5',
      prompt: function () { return MOSHIMO[Math.floor(Math.random() * MOSHIMO.length)]; },
      canChangePrompt: true,
      asks: [
        ['選んだ理由', 'なぜ、そのカードを選びましたか？'],
        ['その時の気持ち', 'カードを選んだとき、どんな気持ちになりましたか？（ポジティブ／ネガティブ、どちらでしたか？）'],
        ['聞くときの約束', '話している人に、反論や意見を言わずに最後まで聞きましょう。']
      ],
      resultTitle: '選んだカード'
    },
    self: {
      label: 'Game 02 — EQ自己認識力ゲーム',
      color: '#2f8540',
      prompt: function () {
        return '順番の人は「自分が1番大切だな」と思うカードを選びます。<small>他の人は、その人が1番大切にしていそうだなと思う「行動」のカードを1枚選びます。全員そろったら「せーの」で選んだカードを指さしましょう。</small>';
      },
      canChangePrompt: false,
      asks: [
        ['本人に聞く', 'そのカードを選んだのは、どうしてですか？'],
        ['まわりに聞く', 'そのカードを選んだのは、その人のどんなところからですか？'],
        ['気持ちをたしかめる', '自分の選んだカードと、まわりが選んだカード。見比べて、どんな気持ちになりましたか？']
      ],
      resultTitle: '指さしたカード'
    }
  };

  var current = null;      /* 今のゲーム */
  var tiles = [];          /* 盤面のカード（DOM） */
  var picked = [];         /* 選んだ順のindex */
  var timerId = null, timerLeft = 0;

  /* ---------- カード1枚のHTML ---------- */
  function cardHTML(card, n) {
    var light = isLight(card.hex);
    return '<span class="gmc__bar"></span><span class="gmc__dash"></span>' +
      '<span class="gmc__action">' + card.action + '</span>' +
      '<span class="gmc__bottom"><span class="gmc__chev"></span>' +
      '<span class="gmc__value" style="--vc:' + (light ? '#333' : '#fff') + '">' + card.value + '</span>' +
      '<span class="gmc__wall"></span></span>' +
      '<span class="gmc__num">' + (n || '') + '</span>';
  }
  /* 色帯が明るいときは、価値観の文字を濃い色にする（実物カードと同じ考え方） */
  function isLight(hex) {
    var c = hex.replace('#', '');
    var yiq = (parseInt(c.substr(0, 2), 16) * 299 + parseInt(c.substr(2, 2), 16) * 587 + parseInt(c.substr(4, 2), 16) * 114) / 1000;
    return yiq >= 140;
  }

  function shuffled() {
    var a = CARDS.map(function (c, i) { return { card: c, i: i }; });
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- 盤面をつくる ---------- */
  function buildBoard(spread) {
    grid.innerHTML = '';
    tiles = [];
    picked = [];
    shuffled().forEach(function (entry) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gmc';
      b.style.setProperty('--c', entry.card.hex);
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', entry.card.action.replace(/<br>/g, '') + '（' + entry.card.value + '）');
      b.innerHTML = cardHTML(entry.card, '');
      b.addEventListener('click', function () { toggle(b); });
      grid.appendChild(b);
      tiles.push({ el: b, card: entry.card });
    });
    updateCount();
    if (spread && !reduce && !capture) spreadIn();
  }

  /* 中央から広がる動き（終わったら transition を外して、以後は動かさない） */
  function spreadIn() {
    var rect = grid.getBoundingClientRect();
    var cx = rect.width / 2, cy = rect.height / 2;
    grid.classList.add('is-spreading');
    tiles.forEach(function (t) {
      var r = t.el.getBoundingClientRect();
      var x = (r.left - rect.left) + r.width / 2;
      var y = (r.top - rect.top) + r.height / 2;
      t.el.style.setProperty('--sx', (cx - x).toFixed(1) + 'px');
      t.el.style.setProperty('--sy', (cy - y).toFixed(1) + 'px');
      t.el.style.setProperty('--sr', (Math.random() * 60 - 30).toFixed(1) + 'deg');
      t.el.style.setProperty('--sd', (Math.random() * 0.45).toFixed(2) + 's');
      t.el.classList.add('is-stacked');
    });
    void grid.offsetWidth;
    requestAnimationFrame(function () {
      tiles.forEach(function (t) { t.el.classList.remove('is-stacked'); });
      setTimeout(function () {
        grid.classList.remove('is-spreading');
        tiles.forEach(function (t) {
          ['--sx', '--sy', '--sr', '--sd'].forEach(function (p) { t.el.style.removeProperty(p); });
        });
      }, 1600);
    });
  }

  /* ---------- 選ぶ・外す ---------- */
  function toggle(el) {
    var idx = tiles.map(function (t) { return t.el; }).indexOf(el);
    var at = picked.indexOf(idx);
    if (at > -1) picked.splice(at, 1);
    else if (picked.length < 8) picked.push(idx);
    renumber();
    updateCount();
    if (window.Orb && picked.length) {
      var c = tiles[picked[picked.length - 1]].card;
      window.Orb.setTarget(c.hex, 0.4, 1.2, 1.5); window.Orb.boost(0.6);
    } else if (window.Orb) { window.Orb.reset(); window.Orb.restore(); }
  }
  function renumber() {
    tiles.forEach(function (t) {
      t.el.setAttribute('aria-pressed', 'false');
      t.el.querySelector('.gmc__num').textContent = '';
    });
    picked.forEach(function (i, k) {
      tiles[i].el.setAttribute('aria-pressed', 'true');
      tiles[i].el.querySelector('.gmc__num').textContent = String(k + 1);
    });
  }
  function updateCount() {
    var n = document.getElementById('gm-count');
    if (n) n.textContent = picked.length ? picked.length + '枚 選択中' : 'カードをタップして選びます';
    var show = document.getElementById('gm-show');
    if (show) show.disabled = picked.length === 0;
    var fab = document.getElementById('gm-fab');
    if (fab) {
      fab.classList.toggle('is-on', picked.length > 0 && result.hidden);
      fab.setAttribute('aria-hidden', picked.length > 0 ? 'false' : 'true');
      document.getElementById('gm-fab-count').textContent = picked.length + '枚 選択中';
    }
  }

  /* ---------- ゲームを始める ---------- */
  function start(key) {
    current = GAMES[key];
    if (!current) return;
    section.style.setProperty('--gc', current.color);
    board.hidden = false;
    result.hidden = true;
    document.getElementById('gm-label').textContent = current.label;
    setPrompt();
    document.getElementById('gm-newq').hidden = !current.canChangePrompt;
    buildBoard(true);
    stopTimer();
    var top = board.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: top, behavior: reduce || capture ? 'auto' : 'smooth' });
  }
  function setPrompt() {
    document.getElementById('gm-q').innerHTML = current.prompt();
  }

  /* ---------- 1分タイマー（資料「1分ほどでカードを選びます」） ---------- */
  function stopTimer() {
    clearInterval(timerId); timerId = null; timerLeft = 0;
    var b = document.getElementById('gm-timer');
    if (b) { b.classList.remove('gm-tool--on'); b.innerHTML = '<span class="gm-timer">1分タイマー</span>'; }
  }
  function toggleTimer() {
    var b = document.getElementById('gm-timer');
    if (timerId) { stopTimer(); return; }
    timerLeft = 60;
    b.classList.add('gm-tool--on');
    var tick = function () {
      var m = Math.floor(timerLeft / 60), s = timerLeft % 60;
      b.innerHTML = '<span class="gm-timer">' + m + ':' + (s < 10 ? '0' : '') + s + '</span>';
      if (timerLeft <= 0) { stopTimer(); b.innerHTML = '<span class="gm-timer">せーのっ！</span>'; b.classList.add('gm-tool--on'); return; }
      timerLeft--;
    };
    tick();
    timerId = setInterval(tick, 1000);
  }

  /* ---------- 選んだカードを見る ---------- */
  function showResult() {
    if (!picked.length) return;
    document.getElementById('gm-result-title').textContent = current.resultTitle;
    var box = document.getElementById('gm-result-cards');
    box.innerHTML = '';
    picked.forEach(function (i, k) {
      var c = tiles[i].card;
      var el = document.createElement('div');
      el.className = 'gmc';
      el.style.setProperty('--c', c.hex);
      el.setAttribute('aria-pressed', 'true');
      el.innerHTML = cardHTML(c, k + 1);
      box.appendChild(el);
    });
    var asks = document.getElementById('gm-asks');
    asks.innerHTML = '';
    current.asks.forEach(function (a) {
      var d = document.createElement('div');
      d.className = 'gm-ask';
      d.innerHTML = '<span>' + a[0] + '</span><p>' + a[1] + '</p>';
      asks.appendChild(d);
    });
    result.hidden = false;
    updateCount();
    result.scrollIntoView({ behavior: reduce || capture ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- ボタン ---------- */
  [].slice.call(picks.querySelectorAll('[data-start]')).forEach(function (b) {
    b.addEventListener('click', function () { start(b.getAttribute('data-start')); });
  });
  document.getElementById('gm-newq').addEventListener('click', function () { setPrompt(); });
  document.getElementById('gm-reshuffle').addEventListener('click', function () { buildBoard(true); result.hidden = true; });
  document.getElementById('gm-clear').addEventListener('click', function () { picked = []; renumber(); updateCount(); result.hidden = true; });
  document.getElementById('gm-size').addEventListener('click', function () {
    var small = grid.classList.toggle('is-small');
    this.textContent = small ? 'カードを大きく' : 'たくさん並べる';
  });
  document.getElementById('gm-timer').addEventListener('click', toggleTimer);
  document.getElementById('gm-show').addEventListener('click', showResult);
  document.getElementById('gm-show2').addEventListener('click', showResult);
  document.getElementById('gm-again').addEventListener('click', function () {
    result.hidden = true;
    picked = []; renumber(); updateCount();
    buildBoard(true);
  });
  document.getElementById('gm-back').addEventListener('click', function () {
    board.hidden = true; result.hidden = true; stopTimer();
    if (window.Orb) { window.Orb.reset(); window.Orb.restore(); }
    picks.scrollIntoView({ behavior: reduce || capture ? 'auto' : 'smooth', block: 'center' });
  });

  /* 撮影用：?game=moshimo|self で盤面を開く */
  var g = new URLSearchParams(location.search).get('game');
  if (g && GAMES[g]) {
    current = GAMES[g];
    section.style.setProperty('--gc', current.color);
    board.hidden = false;
    document.getElementById('gm-label').textContent = current.label;
    document.getElementById('gm-q').innerHTML = current.prompt();
    document.getElementById('gm-newq').hidden = !current.canChangePrompt;
    buildBoard(false);
    var pick = new URLSearchParams(location.search).get('pick');
    if (pick) {
      pick.split(',').forEach(function (n) { var i = parseInt(n, 10); if (tiles[i]) toggle(tiles[i].el); });
      showResult();
    }
  }
})();
