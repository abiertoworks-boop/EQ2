/* ==========================================================================
   eq-phrase.js — 日本語の「段の切り方」を自然にする（文節の途中で改行しない）
   ・Google の BudouX（文節を判定する小さな機械学習）を CDN から読み込み、文節の切れ目に <wbr> を入れる
   ・読み込めない時や古いブラウザでも、CSS（eq-phrase.css）の word-break:auto-phrase で近い結果になる
   ・あとから JS で追加した文章も、自動で処理する
   使い方：このファイルを <script src="eq-phrase.js" defer></script> で読み込むだけ。
   ========================================================================== */
(function () {
  var CDN = 'https://cdn.jsdelivr.net/npm/budoux/bundle/budoux-ja.min.js';
  var SELECTOR = 'h1,h2,h3,h4,p,li,dt,dd,figcaption,small,label,blockquote,.lead,.btn > span';
  var JA = /[぀-ヿ一-鿿]/;
  var parse = null;

  function leafOK(el) {
    if (el.closest('script,style,textarea,input,select,svg,[data-no-phrase]')) return false;
    if (el.dataset.phrased) return false;
    if (!JA.test(el.textContent)) return false;
    return !el.querySelector('p,ul,ol,div,section,article,table,h1,h2,h3,h4,form');   // 入れ子の文章ブロックを持つ親は、子のほうで処理する
  }
  /* 「…」で囲まれた短い言葉（18文字まで）は、途中で折り返さない */
  function keepQuotes(parts) {
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var cur = parts[i];
      if (cur.indexOf("「") > -1 && cur.indexOf("」") < 0) {
        var j = i, merged = cur;
        while (j + 1 < parts.length && merged.length < 18 && merged.indexOf("」") < 0) { j++; merged += parts[j]; }
        if (merged.indexOf("」") > -1 && merged.length <= 18 + 4) { cur = merged; i = j; }
      }
      out.push(cur);
    }
    return out;
  }
  function phraseNode(textNode) {
    var t = textNode.nodeValue;
    if (!JA.test(t) || !t.trim()) return;
    var parts = keepQuotes(parse(t));
    if (parts.length < 2) return;
    var frag = document.createDocumentFragment();
    parts.forEach(function (p, i) {
      if (i) frag.appendChild(document.createElement('wbr'));
      frag.appendChild(document.createTextNode(p));
    });
    textNode.parentNode.replaceChild(frag, textNode);
  }
  function process(el) {
    if (!parse || !leafOK(el)) return;
    el.dataset.phrased = '1';
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(phraseNode);
  }
  function processAll(root) {
    if (!parse) return;
    var scope = root || document;
    if (scope.matches && scope.matches(SELECTOR)) process(scope);
    [].forEach.call(scope.querySelectorAll ? scope.querySelectorAll(SELECTOR) : [], process);
  }

  var pending = null;
  function watch() {
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        [].forEach.call(m.addedNodes, function (nd) { if (nd.nodeType === 1) { pending = pending || []; pending.push(nd); } });
        if (m.type === 'characterData' && m.target.parentElement) { delete m.target.parentElement.dataset.phrased; pending = pending || []; pending.push(m.target.parentElement); }
      });
      if (pending && !watch.t) watch.t = setTimeout(function () { var q = pending; pending = null; watch.t = 0; q.forEach(processAll); }, 60);
    }).observe(document.body, { childList: true, subtree: true });
  }

  function start() {
    // budoux-ja が <budoux-ja> 要素と一緒に公開する parser を使う
    var s = document.createElement('script');
    s.src = CDN; s.async = true;
    s.onload = function () {
      try {
        var probe = document.createElement('budoux-ja');
        probe.textContent = 'テスト';
        document.body.appendChild(probe);
        var parser = probe.parser || (window.budoux && window.budoux.loadDefaultJapaneseParser && window.budoux.loadDefaultJapaneseParser());
        document.body.removeChild(probe);
        if (parser && parser.parse) parse = function (t) { return parser.parse(t); };
      } catch (e) { /* 失敗しても CSS の auto-phrase に任せる */ }
      if (parse) { processAll(document); watch(); document.documentElement.classList.add('is-phrased'); }
    };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
