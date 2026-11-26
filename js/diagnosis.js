/* =========================================================
   EQ Gate — かんたんEQ診断 v2.0（株式会社Brifuのサイトから移設）
   Not a personality test and never a score: from today's worry,
   it shows which EQ ability is worth growing now.
   Q1 picks the theme (personal A–D / team E / unsure F),
   Q2 gives the axis (self / others) and depth (h = 横成長, v = 縦成長),
   Q3 checks depth against past experience; Q4 only appears when they disagree.
   ========================================================= */
(function () {
  'use strict';

  const PLATFORM = 'https://abiertoworks-boop.github.io/eq-platform/';

  // Stage pages. Until each stage has its own page, they point at its section of EQ Platform;
  // the per-result anchors below (#self, #others …) are only appended to URLs that have no hash yet.
  const STAGES = {
    gate:     { name: 'EQ Gate',           url: PLATFORM + '#stage-1' },
    eia:      { name: 'EIA',               url: PLATFORM + '#stage-2' },
    skills:   { name: 'EQ Skills',         url: PLATFORM + '#stage-3' },
    humanity: { name: 'EQ Humanity',       url: PLATFORM + '#stage-4' },
    eqtm:     { name: 'EQTM',              url: PLATFORM + '#stage-5' },
    nexus:    { name: 'EQ Business Nexus', url: PLATFORM + '#nexus' }
  };

  const RESULTS = {
    p1: { name: '自分を整え、行動につなげる力',
      desc: '自分の状態を理解し、整えながら、自分で次の行動を選ぶ力です。仕事・目標達成・習慣づくり・感情の自己管理などにつながります。',
      main: { stage: 'skills', anchor: '#self', title: '自分を整えるEQを見る' },
      sub:  { stage: 'eia', anchor: '', title: '自分に気づくEQも見てみる' } },
    p2: { name: '自分の内側に気づき、自分の見方を知る力',
      desc: 'すぐに答えを出したり変えようとする前に、自分の内側で何が起きているかに気づく力です。自分の見方・捉え方・認識を知る入口になります。',
      main: { stage: 'eia', anchor: '', title: '自分に気づくEQを見る' },
      sub:  { stage: 'skills', anchor: '#self', title: '自分を整えるEQも見てみる' } },
    p3: { name: '伝える・聴く・理解し合う力',
      desc: '自分の気持ちや考えを言語化して伝え、相手の考えや価値観を聴き、理解する力です。家族・職場・1on1・チーム対話などで活用できます。',
      main: { stage: 'skills', anchor: '#others', title: '人と理解し合うEQを見る' },
      sub:  { stage: 'humanity', anchor: '', title: '関係を育てるEQも見てみる' } },
    p4: { name: '相手との違いに気づき、関係を育てる力',
      desc: '自分と相手の見方・価値観の違いに気づき、どちらかを悪者にせず、関係そのものを見る力です。',
      main: { stage: 'humanity', anchor: '', title: '関係を育てるEQを見る' },
      sub:  { stage: 'eia', anchor: '', title: '自分に気づくEQも見てみる' } },
    p5: { name: 'まず、自分の現在地を知るところから',
      desc: '何に悩んでいるか、何を変えたいかがまだ整理できていないときは、まず現在地を知ることから始めます。それも立派な一歩です。',
      main: { stage: 'gate', anchor: '', title: 'はじめてのEQを見る' },
      sub:  { stage: 'skills', anchor: '#self', title: '自分を整えるEQも見てみる' } },
    o1: { name: '本音を言語化し、対話で理解し合う力',
      desc: '1on1・自己理解・相互理解・対話の質を高める方向です。メンバーが自分の言葉で話せる状態をつくることから始まります。',
      main: { stage: 'nexus', anchor: '#dialogue', title: '組織の対話を育てる支援を見る' },
      sub:  { stage: 'skills', anchor: '#others', title: '法人研修の内容も見てみる' } },
    o2: { name: '自分で考え、自分から動く人材を育てる力',
      desc: '自己認識・自己管理・自発性・行動につながる人材育成の方向です。指示で動かすのではなく、自ら選べる状態を育てます。',
      main: { stage: 'nexus', anchor: '#develop', title: '人材育成の支援を見る' },
      sub:  { stage: 'eqtm', anchor: '', title: '実践し続ける仕組みも見てみる' } },
    o3: { name: '価値観や見方の違いに気づき、関係性を育てる力',
      desc: '価値観・認識・関係性・組織文化まで見る方向です。制度や手法を変えても同じ課題が繰り返されるときは、ここに原因があります。',
      main: { stage: 'nexus', anchor: '#culture', title: '組織文化づくりの支援を見る' },
      sub:  { stage: 'humanity', anchor: '', title: '関係を育てるEQも見てみる' } },
    o4: { name: 'まず組織の現在地を知るところから',
      desc: '何が課題か整理できていない場合は、組織で今どんなことが起きているかを把握するところから始めます。',
      main: { stage: 'gate', anchor: '#corp', title: '組織のためのEQ入門を見る' },
      sub:  { stage: 'nexus', anchor: '', title: '法人向け支援も見てみる' } }
  };

  const VAGUE = 'まだよく分からない';

  const Q1 = { title: '今、特に気になっている悩みはどれですか？', options: [
    { label: '人間関係', note: '家族・夫婦・親子・職場・友人など', value: 'A' },
    { label: 'お金', note: '収入・仕事・お金への不安・お金との付き合い方など', value: 'B' },
    { label: '仕事・行動', note: 'やりたいのに動けない・続かない・仕事の悩みなど', value: 'C' },
    { label: '自分自身', note: '自分が分からない・自信・感情・考え方など', value: 'D' },
    { label: 'チーム・組織', note: '人材育成・1on1・コミュニケーション・組織づくりなど', value: 'E' },
    { label: 'どれにも当てはまらない／まだよく分からない', value: 'F', vague: true }
  ] };

  const Q2 = {
    A: { title: '人間関係について、今一番変えたいことはどれに近いですか？', options: [
      { label: '自分の気持ちや考えを言語化して、相手に伝えられるようになりたい', dim: 'others', depth: 'h' },
      { label: '相手の気持ちや考えを聴き、もっと理解できるようになりたい', dim: 'others', depth: 'h' },
      { label: 'なぜ同じような人間関係の悩みを繰り返すのか、自分と相手の見方や価値観の違いを知りたい', dim: 'others', depth: 'v' },
      { label: VAGUE, dim: null, depth: null, vague: true }
    ] },
    B: { title: 'お金について、今一番気になっていることはどれに近いですか？', options: [
      { label: '収入や仕事につながる行動を、もっと起こし続けられるようになりたい', dim: 'self', depth: 'h' },
      { label: 'お金に対して感じる不安や感情の奥で、自分に何が起きているのかを知りたい', dim: 'self', depth: 'v' },
      { label: '自分や家族・パートナーのお金に対する価値観や捉え方の違いを知りたい', dim: 'others', depth: 'v' },
      { label: VAGUE, dim: null, depth: null, vague: true }
    ] },
    C: { title: '仕事や行動について、今一番変えたいことはどれに近いですか？', options: [
      { label: '自分の考えや目標を言語化・整理して、行動につなげたい', dim: 'self', depth: 'h' },
      { label: 'やることは分かっているので、行動を続けたり習慣にできるようになりたい', dim: 'self', depth: 'h' },
      { label: 'なぜ途中で止まるのか、なぜ同じ行動パターンを繰り返すのかを知りたい', dim: 'self', depth: 'v' },
      { label: VAGUE, dim: null, depth: null, vague: true }
    ] },
    D: { title: '自分自身について、今一番変えたい・知りたいことはどれに近いですか？', options: [
      { label: '自分の気持ちや考えを言語化して、整理できるようになりたい', dim: 'self', depth: 'h' },
      { label: '感情が動いたときにも、自分を整えて行動を選べるようになりたい', dim: 'self', depth: 'h' },
      { label: '自分の内側で何が起きているのか、自分がどんな見方・捉え方・価値観を持っているのかを知りたい', dim: 'self', depth: 'v' },
      { label: VAGUE, dim: null, depth: null, vague: true }
    ] }
  };

  // axis implied by the Q1 theme, used when Q2 was answered "まだよく分からない"
  const THEME_DIM = { A: 'others', B: 'self', C: 'self', D: 'self' };

  // asks about past experience rather than wishes
  const Q3 = { title: 'この悩みについて、これまではどうでしたか？', options: [
    { label: '今回が初めて、または本格的に取り組んだことはまだない', depth: 'h' },
    { label: '過去に何度か取り組んだが、気づくと同じところに戻っている', depth: 'v' },
    { label: 'どちらとも言えない／まだよく分からない', depth: null, vague: true }
  ] };

  const Q4 = { title: '今、まず知りたいのはどちらですか？', options: [
    { label: '具体的にどうすれば変えられるのかを知りたい', depth: 'h' },
    { label: 'なぜ自分はこう感じたり、同じことを繰り返したりするのかを知りたい', depth: 'v' },
    { label: 'まだどちらか決められない', depth: null, vague: true }
  ] };

  const OQ2 = { title: 'チームや組織について、今一番変えたいことはどれに近いですか？', options: [
    { label: '1on1などで、メンバーが自分の考えや気持ちを言語化し、本音を話せるようにしたい', value: 'A' },
    { label: 'メンバー同士が聴き合い、お互いを理解できるコミュニケーションを増やしたい', value: 'B' },
    { label: 'メンバーが自分で考え、自分から行動できる組織にしたい', value: 'C' },
    { label: '組織の中で繰り返している人間関係や、価値観・見方の違いそのものを見直したい', value: 'D' },
    { label: '何から変えたらよいのか、まだよく分からない', value: 'E', vague: true }
  ] };

  const OQ3 = { title: '今の組織の状態に近いのはどちらですか？', options: [
    { label: '具体的な対話の方法や人材育成のやり方が分かれば、実践しながら改善していけそう', value: 'A' },
    { label: '1on1・研修・制度などを取り入れても、同じような人間関係や組織課題を繰り返している', value: 'B' },
    { label: 'どちらとも言えない／まだよく分からない', value: 'C', vague: true }
  ] };

  const panel = document.getElementById('diagPanel');
  if (!panel) return;
  const introEl = document.getElementById('diagIntro');
  const quizEl = document.getElementById('diagQuiz');
  const resultEl = document.getElementById('diagResult');
  let state = { history: [], answers: {} };

  const show = (el) => { [introEl, quizEl, resultEl].forEach((e) => { e.hidden = e !== el; }); };
  const toTop = () => { const y = panel.getBoundingClientRect().top + window.scrollY - 110; window.scrollTo({ top: y, behavior: 'smooth' }); };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');

  function renderQuestion(q, step, onPick) {
    show(quizEl);
    quizEl.innerHTML = `
      <div class="diag__progress"><span>Q ${pad(step)}</span><div class="bar"><i style="transform:scaleX(${(step - 1) / 4})"></i></div></div>
      <div class="q-card">
        <div class="q-card__num">QUESTION ${pad(step)}</div>
        <p class="q-card__q">${esc(q.title)}</p>
        <p class="q-card__scene">一番近いものを1つ選んでください。</p>
        <div class="choices">
          ${q.options.map((o, i) => `<button class="choice${o.vague ? ' is-vague' : ''}" type="button" data-i="${i}"><span class="dot"></span><span class="choice__t">${esc(o.label)}${o.note ? `<small>${esc(o.note)}</small>` : ''}</span></button>`).join('')}
        </div>
        <div class="diag__nav">
          <button class="diag__back" type="button">← ひとつ前へ</button>
          <span class="muted" style="font-size:12px;letter-spacing:.1em">3問（場合により4問）</span>
        </div>
      </div>`;
    requestAnimationFrame(() => {
      const bar = quizEl.querySelector('.bar i'); if (bar) bar.style.transform = `scaleX(${Math.min(step / 4, 1)})`;
      quizEl.querySelector('.q-card').classList.add('is-in');
    });
    quizEl.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
      b.classList.add('is-picked');
      setTimeout(() => { onPick(q.options[Number(b.dataset.i)]); toTop(); }, 320);
    }));
    quizEl.querySelector('.diag__back').addEventListener('click', back);
  }

  function goStep(name) { state.history.push(name); STEPS[name](); }

  function back() {
    state.history.pop();
    const prev = state.history.pop();
    if (!prev) { state = { history: [], answers: {} }; show(introEl); toTop(); return; }
    goStep(prev);
  }

  const STEPS = {
    q1: () => renderQuestion(Q1, 1, (o) => {
      state.answers.q1 = o.value;
      if (o.value === 'F') return finish('p5');
      goStep(o.value === 'E' ? 'oq2' : 'q2');
    }),
    q2: () => renderQuestion(Q2[state.answers.q1], 2, (o) => { state.answers.q2 = o; goStep('q3'); }),
    q3: () => renderQuestion(Q3, 3, (o) => { state.answers.q3 = o; resolvePersonal(); }),
    q4: () => renderQuestion(Q4, 4, (o) => {
      if (!o.depth) return finish('p5');
      finish(mapPersonal(state.answers.q2.dim || THEME_DIM[state.answers.q1], o.depth));
    }),
    oq2: () => renderQuestion(OQ2, 2, (o) => {
      state.answers.oq2 = o.value;
      if (o.value === 'E') return finish('o4');
      goStep('oq3');
    }),
    oq3: () => renderQuestion(OQ3, 3, (o) => finish(mapOrg(state.answers.oq2, o.value)))
  };

  // Q2 is the wish, Q3 the lived fact: if they disagree or both are unknown, ask Q4
  function resolvePersonal() {
    const d2 = state.answers.q2.depth, d3 = state.answers.q3.depth;
    const dim = state.answers.q2.dim || THEME_DIM[state.answers.q1];
    if ((d2 && d3 && d2 !== d3) || (!d2 && !d3)) return goStep('q4');
    finish(mapPersonal(dim, d2 || d3));
  }

  function mapPersonal(dim, depth) {
    if (dim === 'self') return depth === 'h' ? 'p1' : depth === 'v' ? 'p2' : 'p5';
    if (dim === 'others') return depth === 'h' ? 'p3' : depth === 'v' ? 'p4' : 'p5';
    return 'p5';
  }

  function mapOrg(q2, q3) {
    if (q3 === 'B') return 'o3';
    if (q3 === 'A') return q2 === 'C' ? 'o2' : q2 === 'D' ? 'o3' : 'o1';
    return 'o4';
  }

  function linkUrl(link) {
    const base = STAGES[link.stage].url;
    return base.includes('#') ? base : base + (link.anchor || '');
  }

  function finish(id) {
    const r = RESULTS[id];
    const card = (link, main) => `
      <a class="path ${main ? 'path--v is-rec' : 'path--h'}" href="${linkUrl(link)}" target="_blank" rel="noopener">
        ${main ? '<span class="rec">おすすめ</span>' : ''}
        <div class="k">${esc(STAGES[link.stage].name)}</div>
        <div class="t">${esc(link.title)}</div><span class="arr">→</span>
      </a>`;
    resultEl.innerHTML = `
      <div class="result">
        <div class="result__type">YOUR EQ — 今のあなたが伸ばすとよいEQの力</div>
        <h2 class="result__title">${esc(r.name)}</h2>
        <p class="result__lead">${esc(r.desc)}</p>
        <p class="result__cta-lead">この力について、くわしく知る</p>
        <div class="result__paths result__paths--cta">${card(r.main, true)}${card(r.sub, false)}</div>
        <div class="result__actions">
          <a class="btn" href="https://abiertoworks-boop.github.io/brifu-site/service.html" target="_blank" rel="noopener">Brifuの4つの事業を見る <span class="arr">→</span></a>
          <button class="diag__back" id="diagRetry" type="button">もう一度診断する</button>
        </div>
      </div>`;
    show(resultEl);
    requestAnimationFrame(() => resultEl.querySelector('.result').classList.add('is-in'));
    document.getElementById('diagRetry').addEventListener('click', () => { state = { history: [], answers: {} }; goStep('q1'); toTop(); });
  }

  document.getElementById('diagStart').addEventListener('click', () => { state = { history: [], answers: {} }; goStep('q1'); toTop(); });
})();
