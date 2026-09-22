/* ==========================================================================
   場面で気づく体験ワーク（EQをはじめて知る人向け）
   ・場面を見せて「この時どう思う？」と聞く。選択肢は 事実(F) / 解釈(I) / 思い込み(A)
   ・判定やタイプ分けはしない。Brifu の「かんたんEQ診断」と役割を分けるため
     （設計シート v2.0「EQ Gate側の位置づけ」）。返すのは「自分はこう見ていたのか」という自覚だけ
   ・メール登録はふり返りのあと（体験を先に渡す）
   ========================================================================== */
(function () {
  var Orb = window.Orb;

  /* メールの送信先：株式会社Brifu（info@brifu.co.jp）。
     サーバーのない静的サイトなので、フォーム送信サービス FormSubmit を通して届ける。
     ・Brifu 宛て：登録者のお名前・メール・今日のふり返り
     ・登録者宛て：今日のふり返り（自動返信）
     はじめての送信のあと、info@brifu.co.jp に FormSubmit から確認メールが届き、
     そのメールのボタンを押すと受付が有効になる。 */
  var MAIL_TO = 'info@brifu.co.jp';
  var MAIL_ENDPOINT = 'https://formsubmit.co/ajax/' + MAIL_TO;
  var reflection = '';

  var SCENES = [
    { scene: '朝、同僚に挨拶をしたのに、相手から返事がなかった。', short: '挨拶に返事がなかった',
      F: '返事はなかった。理由は、まだ分からない。', I: '私に興味がないのかもしれない。', A: 'やっぱり嫌われている。いつもこうだ。' },
    { scene: '上司に提出した資料が、たくさんの修正を入れて戻ってきた。', short: '資料が修正だらけで戻ってきた',
      F: '修正が多く入っていた。どこを直すか確かめよう。', I: 'あまり期待されていないのかな。', A: '自分は、仕事ができない人間だ。' },
    { scene: '友人に送ったメッセージが、半日たっても既読にならない。', short: 'メッセージが既読にならない',
      F: 'まだ読まれていない。相手の状況は分からない。', I: '何か、気に障ることを書いたのかもしれない。', A: 'どうせ私は、後回しにされる存在だ。' },
    { scene: '会議で意見を言ったら、一瞬、場が静かになった。', short: '意見を言ったら場が静かになった',
      F: '数秒、誰も話さなかった。', I: '的外れなことを言ってしまったかな。', A: '自分は、意見を言わないほうがいい。' },
    { scene: '家族に「またそれ？」と言われた。', short: '家族に「またそれ？」と言われた',
      F: '「またそれ？」と言われた。どういう意味か聞いてみよう。', I: '呆れられているのかもしれない。', A: '何をしても、認めてもらえない。' },
    { scene: '同僚が、自分以外の人をランチに誘っていた。', short: '自分以外がランチに誘われていた',
      F: '同僚が、別の人をランチに誘っていた。', I: '私とは、あまり話したくないのかな。', A: '私はいつも、輪に入れない。' },
    { scene: '目標にしていた数字に、今月も届かなかった。', short: '今月も目標に届かなかった',
      F: '今月は届かなかった。差はどれくらいだろう。', I: 'やり方が、自分に合っていないのかもしれない。', A: '自分は、何をやっても続かない。' },
    { scene: '頑張ったことを「すごいね」と褒められた。', short: '「すごいね」と褒められた',
      F: '「すごいね」と言ってもらえた。', I: '気をつかって、言ってくれているのだろう。', A: '本当の自分を知ったら、がっかりされる。' }
  ];

  var LENS = {
    F: { label: '事実', color: '#2f8540' },
    I: { label: '解釈', color: '#1f5bb8' },
    A: { label: '思い込み', color: '#b0473b' }
  };

  /* 次に知るべきテーマ：今日いちばん多く選んだ見え方から、次の体験へ案内する（タイプ名は付けない） */
  var THEMES = {
    F: { title: '感情を、情報として受けとめる', text: '今日は、事実に戻って見る言葉を多く選びました。次は、その奥で動いている感情にも目を向けてみましょう。EQコアカード®を1枚引いて、湧いた感情をそのまま感じてみてください。', href: 'index.html#cards', btn: 'EQコアカード®を引く', orb: '#3aa55a' },
    I: { title: '事実と解釈を、分けてみる', text: '今日は、出来事に意味をつける言葉を多く選びました。同じ出来事を、事実・解釈・思い込みの3つのフィルターで見比べてみましょう。', href: 'index.html#filter', btn: '3つの見え方を比べる', orb: '#3f74d6' },
    A: { title: '思考の奥にある「認識」に気づく', text: '今日は、先回りして結論を出す言葉を多く選びました。それは自分を守ってきた大切な働きでもあります。感情が動いた出来事を書き出して、何を信じていたのかを見つめてみましょう。', href: 'index.html#work', btn: '書き出しワークをはじめる', orb: '#d0584a' },
    M: { title: '認識の循環を知る', text: '今日は、場面によって見え方が変わりました。誰にでもあることです。出来事から新しい経験まで、認識が感情と行動を生み出す11のステップを見てみましょう。', href: 'index.html#cycle', btn: '認識の循環を見る', orb: '#9b5de5' }
  };

  /* いちばん多く選んだ見え方が単独1位ならそのテーマ、同点ならM（認識の循環） */
  function pickTheme(count) {
    var keys = ['F', 'I', 'A'];
    var max = Math.max(count.F, count.I, count.A);
    var tops = keys.filter(function (k) { return count[k] === max; });
    return (max >= 4 && tops.length === 1) ? tops[0] : 'M';
  }

  var $ = function (id) { return document.getElementById(id); };
  var answers = [];
  var order = [];
  var cur = 0;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function show(id) {
    ['d-intro', 'd-question', 'd-result'].forEach(function (x) { $(x).classList.toggle('is-show', x === id); });
    var top = $('diag-panel').getBoundingClientRect().top;
    if (top < 60 || top > window.innerHeight * 0.6) window.scrollBy({ top: top - 110, behavior: 'smooth' });
  }

  var prog = $('d-progress');
  SCENES.forEach(function () { prog.appendChild(document.createElement('span')); });

  function renderQuestion() {
    var s = SCENES[cur];
    $('d-no').textContent = 'SCENE ' + String(cur + 1).padStart(2, '0') + ' / ' + String(SCENES.length).padStart(2, '0');
    $('d-scene').textContent = s.scene;
    [].forEach.call(prog.children, function (b, k) { b.classList.toggle('is-on', k <= cur); });
    $('d-back').disabled = cur === 0;
    var box = $('d-options');
    box.innerHTML = '';
    order[cur] = order[cur] || shuffle(['F', 'I', 'A']);
    order[cur].forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'opt';
      if (answers[cur] === k) b.classList.add('is-picked');
      b.innerHTML = '<span></span>';
      b.firstChild.textContent = s[k];
      /* 選択肢ごとに色を変えると答えが透けるので、球体はどれも同じ色で反応させる */
      b.addEventListener('mouseenter', function () { Orb.setTarget('#9b5de5', 0.4, 1.3, 1.6); Orb.boost(1); });
      b.addEventListener('mouseleave', function () { Orb.reset(); Orb.restore(); });
      b.addEventListener('click', function () { pick(k, b); });
      box.appendChild(b);
    });
    $('d-question').classList.remove('is-show'); void $('d-question').offsetWidth; $('d-question').classList.add('is-show');
  }
  var locked = false;
  function pick(k, btn) {
    if (locked) return;
    locked = true;
    answers[cur] = k;
    btn.classList.add('is-picked');
    Orb.setTarget('#c65bd0', 0.5, 1.6, 1.8);
    setTimeout(function () {
      locked = false;
      Orb.reset();
      if (cur < SCENES.length - 1) { cur++; renderQuestion(); }
      else finish();
    }, 420);
  }

  /* メールに入れる「今日のふり返り」の文章（判定はしない。選んだ言葉を並べるだけ） */
  function buildReflection(count, T) {
    var lines = ['■ 今日の8つの場面：事実 ' + count.F + '／解釈 ' + count.I + '／思い込み ' + count.A, ''];
    SCENES.forEach(function (s, i) {
      var k = answers[i];
      lines.push('SCENE ' + (i + 1) + '　' + s.short);
      lines.push('　選んだ言葉（' + LENS[k].label + '）：' + s[k]);
      if (k !== 'F') lines.push('　事実に戻ると：' + s.F);
    });
    lines.push('', '■ 次に知るべきテーマ：' + T.title);
    return lines.join('\n');
  }

  function finish() {
    var count = { F: 0, I: 0, A: 0 };
    answers.forEach(function (k) { count[k]++; });
    var key = pickTheme(count);
    var T = THEMES[key];
    $('r-legend').innerHTML = ['F', 'I', 'A'].map(function (k) {
      return '<span><i style="background:' + LENS[k].color + '"></i>' + LENS[k].label + ' ' + count[k] + '場面</span>';
    }).join('');
    var spans = $('r-ribbon').children;
    [].forEach.call(spans, function (sp) { sp.style.width = '0'; });

    var list = $('r-mirror');
    list.innerHTML = '';
    SCENES.forEach(function (s, i) {
      var k = answers[i];
      var li = document.createElement('li');
      li.className = 'mirror-item';
      li.innerHTML = '<p class="mirror-item__scene"></p><p class="mirror-item__pick"><span class="mirror-item__tag"></span><span class="t"></span></p>' +
        (k !== 'F' ? '<p class="mirror-item__fact"><b>事実に戻ると：</b><span class="f"></span></p>' : '');
      li.querySelector('.mirror-item__scene').textContent = 'SCENE ' + (i + 1) + '　' + s.short;
      var tag = li.querySelector('.mirror-item__tag');
      tag.textContent = LENS[k].label; tag.style.background = LENS[k].color;
      li.querySelector('.t').textContent = s[k];
      if (k !== 'F') li.querySelector('.f').textContent = s.F;
      list.appendChild(li);
    });

    $('t-title').textContent = T.title;
    $('t-text').textContent = T.text;
    $('t-btn').textContent = T.btn;
    $('t-link').href = T.href;
    reflection = buildReflection(count, T);
    $('mail-record').value = reflection;

    show('d-result');
    Orb.setTarget(T.orb, 0.5, 1.3, 1.5);
    setTimeout(function () {
      spans[0].style.width = (count.F / SCENES.length * 100) + '%';
      spans[1].style.width = (count.I / SCENES.length * 100) + '%';
      spans[2].style.width = (count.A / SCENES.length * 100) + '%';
    }, 250);
  }

  $('d-start').addEventListener('click', function () { cur = 0; answers = []; order = []; show('d-question'); renderQuestion(); });
  $('d-back').addEventListener('click', function () { if (cur > 0) { cur--; renderQuestion(); } });
  $('d-restart').addEventListener('click', function () { cur = 0; answers = []; order = []; Orb.reset(); show('d-question'); renderQuestion(); });

  $('mail-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = $('mail-msg');
    if (!f.email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value)) { msg.textContent = 'メールアドレスを確認してください。'; return; }
    if (!f.agree.checked) { msg.textContent = 'お知らせの受け取りへの同意にチェックを入れてください。'; return; }
    msg.textContent = '送信しています…';
    var name = f.elements['name'].value.trim();
    var body = {
      name: name || '（未記入）',
      email: f.email.value.trim(),
      'ふり返り': reflection,
      _subject: '【EQ Gate】体験ワークのふり返り登録' + (name ? '（' + name + 'さん）' : ''),
      _template: 'table',
      _captcha: 'false',
      _autoresponse: (name ? name + 'さん\n\n' : '') +
        'EQ Gate「場面で気づく体験ワーク」にご参加いただき、ありがとうございました。\n今日のふり返りをお送りします。\n\n' + reflection +
        '\n\n見え方を選び直す、3つの問い\n・実際に起きたことは何か？\n・この出来事を、どう受け止めているか？\n・それは本当に事実か？ 他の可能性はないか？\n\n株式会社Brifu　EQ Gate'
    };
    fetch(MAIL_ENDPOINT, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', Accept: 'application/json' } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || String(res.j.success) === 'false') throw new Error();
        msg.textContent = '登録しました。まもなくメールが届きます。';
        f.reset();
      })
      .catch(function () { msg.textContent = '送信できませんでした。時間をおいて、もう一度お試しください。'; });
  });

  /* 撮影用：?capture=1&demo=result で結果画面を表示 */
  var params = new URLSearchParams(location.search);
  if (params.get('demo') === 'result') {
    answers = ['I', 'F', 'I', 'A', 'I', 'F', 'I', 'A'];
    finish();
  } else if (params.get('demo') === 'question') {
    show('d-question'); renderQuestion();
  }
})();
