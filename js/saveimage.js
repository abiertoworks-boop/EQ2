/* ==========================================================================
   EQ Gate — 「画像で保存」
   ・結果を1枚の画像（PNG）にまとめ、画面に表示する。そのままダウンロード、またはスマホは長押しで保存できる
   ・ライブラリなし。canvas に直接描く（外部へは何も送らない）
   window.EQSaveImage.compose(opts) → Promise<canvas>   opts: { heading, sub, accent, topH, drawTop(ctx,x,y,w), sections:[{label,text}], foot }
   window.EQSaveImage.show(canvas, filename)            … 画像を表示するウィンドウを開く
   ========================================================================== */
(function () {
  var W = 1080, PAD = 72;
  var SERIF = '"Zen Old Mincho","Noto Serif JP","Hiragino Mincho ProN","Yu Mincho",serif';
  var SANS = '"Zen Kaku Gothic New","Noto Sans JP","Hiragino Sans","Yu Gothic",sans-serif';
  var NG_HEAD = '、。，．）」』】！？ー・ぁぃぅぇぉっゃゅょァィゥェォッャュョ…';

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('600 40px ' + SERIF, '感情認識'), document.fonts.load('500 30px ' + SANS, '感情認識'), document.fonts.load('700 30px ' + SANS, '感情認識')
    ]).catch(function () {});
  }

  /* 日本語の折り返し（行頭に句読点・閉じ括弧が来ないようにする） */
  function wrap(ctx, text, maxW) {
    var out = [];
    String(text).split('\n').forEach(function (para) {
      var line = '';
      for (var i = 0; i < para.length; i++) {
        var ch = para.charAt(i);
        if (ctx.measureText(line + ch).width > maxW && line) {
          if (NG_HEAD.indexOf(ch) > -1) { line += ch; out.push(line); line = ''; continue; }
          out.push(line); line = ch;
        } else line += ch;
      }
      out.push(line);
    });
    return out;
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function compose(o) {
    return fontsReady().then(function () {
      var m = document.createElement('canvas').getContext('2d');
      var innerW = W - PAD * 2, boxPad = 40, textW = innerW - boxPad * 2;
      var LH_BODY = 52, LH_LABEL = 46;
      /* 先に高さを測る */
      m.font = '600 52px ' + SERIF;
      var headLines = wrap(m, o.heading || '', innerW);
      m.font = '500 28px ' + SANS;
      var subLines = o.sub ? wrap(m, o.sub, innerW) : [];
      var boxes = (o.sections || []).filter(function (s) { return s.text; }).map(function (s) {
        m.font = '500 32px ' + SANS;
        var lines = wrap(m, s.text, textW);
        return { label: s.label, lines: lines, h: boxPad * 1.6 + LH_LABEL + lines.length * LH_BODY };
      });
      var y = 150;
      var headY = y; y += headLines.length * 72 + 8;
      var subY = y; y += subLines.length * 44 + (subLines.length ? 16 : 0);
      y += 24;
      var topY = y; y += (o.topH || 0) + (o.topH ? 48 : 0);
      var boxY = [];
      boxes.forEach(function (b) { boxY.push(y); y += b.h + 24; });
      y += 24;
      var footY = y; y += 110;
      var H = Math.max(y, 900);

      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#f3f4f8'); g.addColorStop(0.55, '#eceef4'); g.addColorStop(1, '#e4e7f1');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      /* ふちの色帯 */
      var acc = o.accent || '#6a52d9';
      ctx.fillStyle = acc; ctx.fillRect(0, 0, W, 12);

      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#6b7189'; ctx.font = '500 26px ' + SANS;
      ctx.fillText('EQ Gate  |  株式会社Brifu', PAD, 78);
      var d = new Date();
      var ds = d.getFullYear() + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + ('0' + d.getDate()).slice(-2);
      ctx.textAlign = 'right'; ctx.fillText(ds, W - PAD, 78); ctx.textAlign = 'left';

      ctx.fillStyle = '#151b34'; ctx.font = '600 52px ' + SERIF;
      headLines.forEach(function (ln, i) { ctx.fillText(ln, PAD, headY + 56 + i * 72); });
      ctx.fillStyle = '#434a63'; ctx.font = '500 28px ' + SANS;
      subLines.forEach(function (ln, i) { ctx.fillText(ln, PAD, subY + 34 + i * 44); });

      if (o.drawTop) o.drawTop(ctx, PAD, topY, innerW);

      boxes.forEach(function (b, i) {
        var by = boxY[i];
        ctx.save();
        ctx.shadowColor = 'rgba(21,27,52,.18)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
        ctx.fillStyle = '#fbfcfe'; rrect(ctx, PAD, by, innerW, b.h, 28); ctx.fill();
        ctx.restore();
        ctx.fillStyle = acc; ctx.font = '700 24px ' + SANS;
        ctx.fillText(b.label, PAD + boxPad, by + boxPad + 22);
        ctx.fillStyle = '#151b34'; ctx.font = '500 32px ' + SANS;
        b.lines.forEach(function (ln, k) { ctx.fillText(ln, PAD + boxPad, by + boxPad + LH_LABEL + 36 + k * LH_BODY); });
      });

      ctx.fillStyle = '#6b7189'; ctx.font = '500 24px ' + SANS; ctx.textAlign = 'center';
      ctx.fillText(o.foot || '感情はあなたの心の道しるべ。', W / 2, footY + 20);
      ctx.fillText('abiertoworks-boop.github.io/EQ2', W / 2, footY + 58);
      return c;
    });
  }

  /* ---------- 画像を表示するウィンドウ ---------- */
  var overlay = null;
  function close() { if (overlay) { overlay.remove(); overlay = null; document.documentElement.classList.remove('simg-open'); } }
  function show(canvas, filename) {
    var url;
    try { url = canvas.toDataURL('image/png'); } catch (e) { alert('画像を作れませんでした。ブラウザを変えて、もう一度お試しください。'); return; }
    close();
    overlay = document.createElement('div');
    overlay.className = 'simg';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', '保存用の画像');
    overlay.innerHTML =
      '<div class="simg__box">' +
      '<p class="simg__title">保存用の画像ができました</p>' +
      '<div class="simg__imgwrap"><img class="simg__img" alt="保存用の画像（結果のまとめ）"></div>' +
      '<p class="simg__hint">スマホは、画像を長押しして「写真に追加」。パソコンは、下のボタンで保存できます。</p>' +
      '<div class="simg__actions"><a class="btn simg__dl" download="' + (filename || 'eq-gate.png') + '"><span>画像をダウンロード</span></a>' +
      '<button class="btn btn--ghost simg__close" type="button"><span>閉じる</span></button></div></div>';
    overlay.querySelector('.simg__img').src = url;
    overlay.querySelector('.simg__dl').href = url;
    overlay.querySelector('.simg__close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
    document.body.appendChild(overlay);
    document.documentElement.classList.add('simg-open');
    overlay.querySelector('.simg__close').focus();
  }

  window.EQSaveImage = { compose: compose, show: show, wrap: wrap, rrect: rrect, SERIF: SERIF, SANS: SANS };
})();
