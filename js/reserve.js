/* ==========================================================================
   EQ Gate — 体験会の予約フォーム
   ・カレンダーで日にち、ボタンで時間を選び、お客様の情報とあわせて info@brifu.co.jp へ送る
   ・「リクエスト」方式：Brifuが確認して返信し、確定のご連絡をもって予約完了
   ・開催日や時間を変えるときは、下の「設定」だけを書き換える
   ========================================================================== */
(function () {
  /* ---------- 設定（ここだけ書き換えればOK） ---------- */
  var MAIL_TO = 'info@brifu.co.jp';
  var MAIL_ENDPOINT = 'https://formsubmit.co/ajax/' + MAIL_TO;
  var SLOT_TIMES = ['10:00〜', '14:00〜', '19:00〜'];   // 選べる時間
  var OPEN_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];            // 選べる曜日（0=日 1=月 … 6=土）。平日だけなら [1,2,3,4,5]
  var CLOSED_DATES = [];                                 // 選べない日。例）['2026-12-29', '2026-12-30']
  var MIN_DAYS_AHEAD = 3;                                // 今日から何日後から選べるか
  var MONTHS_AHEAD = 3;                                  // 何か月先まで見せるか

  var DOW = ['日', '月', '火', '水', '木', '金', '土'];
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var first = new Date(today.getTime() + MIN_DAYS_AHEAD * 86400000);
  var last = new Date(today.getFullYear(), today.getMonth() + MONTHS_AHEAD + 1, 0);
  var view = new Date(first.getFullYear(), first.getMonth(), 1);
  var selDate = null, selTime = '';

  function key(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function jp(d) { return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日（' + DOW[d.getDay()] + '）'; }
  function openDay(d) { return d >= first && d <= last && OPEN_WEEKDAYS.indexOf(d.getDay()) > -1 && CLOSED_DATES.indexOf(key(d)) < 0; }

  /* ---------- カレンダー ---------- */
  var cal = $('cal');
  function renderCal() {
    var y = view.getFullYear(), m = view.getMonth();
    var html = '<div class="cal__bar">' +
      '<button type="button" class="cal__nav" id="cal-prev" aria-label="前の月">←</button>' +
      '<p class="cal__title">' + y + '年 ' + (m + 1) + '月</p>' +
      '<button type="button" class="cal__nav" id="cal-next" aria-label="次の月">→</button></div>' +
      '<div class="cal__grid">';
    DOW.forEach(function (n, i) { html += '<span class="cal__dow' + (i === 0 ? ' is-sun' : i === 6 ? ' is-sat' : '') + '">' + n + '</span>'; });
    var startDow = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), i;
    for (i = 0; i < startDow; i++) html += '<span class="cal__blank"></span>';
    for (i = 1; i <= days; i++) {
      var d = new Date(y, m, i), cls = 'cal__d';
      if (key(d) === key(today)) cls += ' is-today';
      if (selDate && key(d) === key(selDate)) cls += ' is-sel';
      html += '<button type="button" class="' + cls + '" data-d="' + key(d) + '"' + (openDay(d) ? '' : ' disabled') + ' aria-label="' + jp(d) + '">' + i + '</button>';
    }
    html += '</div>';
    cal.innerHTML = html;
    $('cal-prev').disabled = new Date(y, m, 1) <= new Date(first.getFullYear(), first.getMonth(), 1);
    $('cal-next').disabled = new Date(y, m + 1, 1) > last;
    $('cal-prev').addEventListener('click', function () { view = new Date(y, m - 1, 1); renderCal(); });
    $('cal-next').addEventListener('click', function () { view = new Date(y, m + 1, 1); renderCal(); });
    [].forEach.call(cal.querySelectorAll('.cal__d:not(:disabled)'), function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-d').split('-');
        selDate = new Date(+p[0], +p[1] - 1, +p[2]);
        renderCal(); updatePick();
      });
    });
  }
  $('cal-hint').textContent = '今日から' + MIN_DAYS_AHEAD + '日後以降の日にちを選べます。グレーの日は、ご予約をお受けしていません。';

  /* ---------- 時間 ---------- */
  var slots = $('slots');
  SLOT_TIMES.forEach(function (t, i) {
    var lab = document.createElement('label');
    lab.className = 'slot';
    lab.innerHTML = '<input type="radio" name="slot" value="' + t + '"' + '><span>' + t + '</span>';
    lab.querySelector('input').addEventListener('change', function () { selTime = t; updatePick(); });
    slots.appendChild(lab);
  });

  function updatePick() {
    var el = $('rsv-pick');
    if (!selDate && !selTime) { el.textContent = '日にちと時間を選ぶと、ここに表示されます。'; return; }
    el.innerHTML = '<em>' + (selDate ? jp(selDate) : '（日にち未選択）') + '</em>　' + (selTime ? '<em>' + selTime + '</em>' : '（時間未選択）');
  }

  /* ---------- 送信 ---------- */
  $('rsv-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = $('rsv-msg');
    var name = f.elements['name'].value.trim();
    if (!selDate) { msg.textContent = 'ご希望の日にちを、カレンダーから選んでください。'; return; }
    if (!selTime) { msg.textContent = 'ご希望の時間を選んでください。'; return; }
    if (!name) { msg.textContent = 'お名前を入力してください。'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) { msg.textContent = 'メールアドレスを確認してください。'; return; }
    if (!f.agree.checked) { msg.textContent = '同意にチェックを入れてください。'; return; }
    msg.textContent = '送信しています…';
    var when = jp(selDate) + ' ' + selTime;
    var tel = f.elements['tel'].value.trim(), memo = f.elements['memo'].value.trim();
    var body = {
      'ご希望日時': when,
      'お名前': name,
      email: f.email.value.trim(),
      'お電話': tel || '（未記入）',
      '参加人数': f.elements['num'].value,
      'ご質問・ご要望': memo || '（なし）',
      _subject: '【EQ Gate】体験会のご予約リクエスト｜' + when + '｜' + name + 'さん',
      _template: 'table',
      _captcha: 'false',
      _autoresponse: name + 'さん\n\nEQ Gateの体験会にお申し込みいただき、ありがとうございます。\n以下の内容で、ご予約のリクエストを受け付けました。\n\n' +
        'ご希望日時：' + when + '\n参加人数：' + f.elements['num'].value + '\n\n' +
        '株式会社Brifuの担当者が内容を確認し、あらためてメールでご連絡します。\n確定のご連絡をもって、ご予約完了となります。\n（ご希望に添えない場合は、別の日時をご相談させていただきます）\n\n株式会社Brifu\ninfo@brifu.co.jp'
    };
    fetch(MAIL_ENDPOINT, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', Accept: 'application/json' } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || String(res.j.success) === 'false') throw new Error();
        $('rsv-main').style.display = 'none';
        $('rsv-done-text').textContent = 'ご希望日時：' + when + '。株式会社Brifuの担当者が内容を確認し、メールでご連絡します。確定のご連絡をもって、ご予約完了となります。';
        $('rsv-done').classList.add('is-show');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(function () { msg.textContent = '送信できませんでした。時間をおいて、もう一度お試しください。'; });
  });

  renderCal();

  /* 撮影用：?capture=1&demo=1 で、日にちと時間を選んだ状態にする */
  if (params.get('demo')) {
    var c = cal.querySelector('.cal__d:not(:disabled)');
    if (c) { c.click(); }
    var inp = slots.querySelector('input'); if (inp) { inp.checked = true; selTime = inp.value; updatePick(); }
  }
})();
