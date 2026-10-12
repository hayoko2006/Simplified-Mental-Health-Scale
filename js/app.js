/*
 * app.js —— 视图渲染、hash 路由、状态管理与 localStorage 持久化
 *
 * 路由：
 *   #/home              首页（六维度卡片 + 说明 + 参考文献）
 *   #/quiz/<scaleId>    单维度答题（scaleId 为量表 id；all = 综合测评）
 *   #/results           结果页（显示最近一次完成会话的维度范围）
 *   #/references        首页内参考文献锚点
 *
 * 状态：
 *   answers —— 全部作答 { itemKey: value }，即时持久化（mhs_answers_v1）
 *   session —— 最近一次完成会话 { scaleId, at }（mhs_session_v1）
 *   无外部依赖、无 CDN
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'mhs_answers_v1';
  var SESSION_KEY = 'mhs_session_v1';

  var state = {
    view: 'home',
    routeName: 'home',
    routeScale: 'all',   // 当前答题/校验作用范围：量表 id 或 'all'
    answers: {},
    session: null,       // { scaleId, at }
    invalid: {}          // 提交校验失败的高亮标记 {key: true}
  };

  /* ---------- 内联 Lucide SVG 图标（禁止 CDN，故内联 path） ---------- */

  var ICONS = {
    cloud:   '<path d="M17.5 19a4.5 4.5 0 1 0-.42-8.98 6 6 0 1 0-11.06 3.1A3.5 3.5 0 0 0 7 19.5h10.5Z"/>',
    wind:    '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
    flame:   '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>',
    waves:   '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1"/>',
    moon:    '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    fingerprint: '<path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    book:    '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    heart:   '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    alert:   '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    check:   '<path d="M20 6 9 17l-5-5"/>',
    arrow:   '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    back:    '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    rotate:  '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 21H3v-5"/>',
    shield:  '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'
  };

  function icon(name, size) {
    var size2 = size || 18;
    return '<svg class="icon" width="' + size2 + '" height="' + size2 + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ---------- localStorage 持久化 ---------- */

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        state.answers = saved.answers || {};
      }
      var rawS = localStorage.getItem(SESSION_KEY);
      if (rawS) {
        var s = JSON.parse(rawS);
        state.session = (s && s.scaleId) ? s : null;
      }
    } catch (e) { /* 存储不可用时静默降级为内存态 */ }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: state.answers }));
    } catch (e) { /* 同上 */ }
  }

  function persistSession() {
    try {
      if (state.session) localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* 同上 */ }
  }

  /* ---------- 工具函数 ---------- */

  function esc(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function scaleById(id) {
    for (var i = 0; i < window.SCALES.length; i++) {
      if (window.SCALES[i].id === id) return window.SCALES[i];
    }
    return null;
  }

  /** 按 scope（量表 id 或 'all'）取量表数组；无效 id 归入全部 */
  function scalesOf(scopeId) {
    if (scopeId && scopeId !== 'all') {
      var s = scaleById(scopeId);
      if (s) return [s];
    }
    return window.SCALES;
  }

  function answeredIn(scale) {
    var n = 0;
    window.requiredKeys(scale).forEach(function (k) {
      if (typeof state.answers[k] !== 'undefined') n++;
    });
    return n;
  }

  function percent(score, max) {
    if (!max) return 0;
    return Math.round(score / max * 100);
  }

  function fmtTime(ts) {
    var d = new Date(ts);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function stripAbbr(scale) {
    var src = scale.source || '';
    if (scale.abbr && src.indexOf(scale.abbr + ' ') === 0) return src.slice(scale.abbr.length + 1);
    return src;
  }

  /* ---------- 渲染：Topbar / 进度 ---------- */

  function renderTopbar() {
    var wrap = document.querySelector('.topbar-progress-wrap');
    if (state.view === 'quiz') {
      var scales = scalesOf(state.routeScale);
      var total = 0, done = 0;
      scales.forEach(function (s) {
        total += window.requiredKeys(s).length;
        done += answeredIn(s);
      });
      wrap.classList.remove('is-hidden');
      document.getElementById('topbar-progress').style.width = (total ? Math.round(done / total * 100) : 0) + '%';
      document.getElementById('topbar-count').textContent = done + '/' + total;
    } else {
      wrap.classList.add('is-hidden');
    }
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === state.routeName);
    });
  }

  /* ---------- 渲染：首页 ---------- */

  function renderHome() {
    var html = '';

    html += '<section class="hero rise" style="--i:0">' +
      '<span class="hero-eyebrow">标准化自评 · 实时计分 · 数据不出本机</span>' +
      '<h1>简易精神症状自评量表系统</h1>' +
      '<p class="hero-sub">基于 PHQ-9、GAD-7、ASRM、MDQ、ISI、PQ-16 六项国际通用标准化量表，覆盖抑郁、焦虑、躁狂、双相、睡眠与精神病性风险六大维度。您可以<b>选择任意维度单独测评</b>，也可以一次完成综合评估。</p>' +
      '<div class="hero-actions">' +
      '<button type="button" class="btn btn-primary btn-lg" data-action="start">' + icon('clipboard') + '综合测评（' + window.TOTAL_ITEMS + ' 题 · 约 15 分钟）</button>' +
      (state.session ? '<button type="button" class="btn btn-ghost btn-lg" data-action="go-results">' + icon('activity') + '查看上次结果</button>' : '') +
      '</div>' +
      '<ul class="hero-facts">' +
      '<li>' + window.TOTAL_ITEMS + ' 个标准化条目</li>' +
      '<li>公开划界分自动分级</li>' +
      '<li>答案仅保存在本机浏览器</li>' +
      '</ul></section>';

    // 六维度选择卡
    html += '<section class="dim-section" aria-label="选择测评维度">' +
      '<div class="section-head">' +
      '<h2>六大测评维度</h2>' +
      '<p>点击任意维度卡片，单独开始该组测评；作答进度会自动保存在本机。</p>' +
      '</div>';
    html += '<div class="grid-cards">';
    window.SCALES.forEach(function (scale, i) {
      var done = answeredIn(scale);
      var total = window.requiredKeys(scale).length;
      var progressNote = '';
      if (done >= total) progressNote = '<span class="dim-done">' + icon('check', 13) + '已完成</span><span class="dot"></span>';
      else if (done > 0) progressNote = '<span class="dim-doing">已答 ' + done + '/' + total + '</span><span class="dot"></span>';

      html += '<a class="card dim-card rise" data-accent="' + scale.id + '" style="--i:' + (i + 1) + '" href="#/quiz/' + scale.id + '" aria-label="开始' + esc(scale.name) + '测评">' +
        '<div class="dim-top"><span class="dim-badge">' + icon(scale.icon, 22) + '</span>' +
        '<span class="dim-abbr">' + esc(scale.abbr) + '</span></div>' +
        '<h3>' + esc(scale.name) + '</h3>' +
        '<p class="dim-source">' + esc(stripAbbr(scale)) + '</p>' +
        '<p class="dim-tagline">' + esc(scale.tagline) + '</p>' +
        '<div class="dim-meta">' + progressNote + scale.items.length + ' 个条目 · 约 ' + scale.minutes + ' 分钟</div>' +
        '<span class="dim-go">开始测评 ' + icon('arrow', 16) + '</span>' +
        '</a>';
    });
    html += '</div></section>';

    // 测评说明
    html += '<section class="panel rise" style="--i:7">' +
      '<h2>' + icon('clipboard') + '测评说明</h2>' +
      '<ol class="howto">' +
      '<li><strong>两种测评方式</strong>——可在首页选择单个维度单独测评，也可从顶部进行全部六维度的综合测评；两者计分标准完全一致。</li>' +
      '<li><strong>请根据真实感受作答</strong>——各条目没有对错之分，凭第一印象选择最贴近的选项即可。</li>' +
      '<li><strong>实时计分</strong>——每作答一题即更新完成度；全部作答完成后提交，系统按各量表的公开划界分自动统计得分与分级。</li>' +
      '<li><strong>匿名与隐私</strong>——本系统不设账号、不上传数据、不依赖任何服务器数据库，作答记录仅存于本机浏览器，可随时一键清空。</li>' +
      '</ol></section>';

    // 参考文献（显著位置）
    html += renderReferences();
    // 免责声明
    html += renderDisclaimer();

    return html;
  }

  function renderReferences(scales) {
    var list = scales || window.SCALES;
    var html = '<section class="panel rise" style="--i:8" id="references" aria-label="参考文献">' +
      '<h2>' + icon('book') + '参考文献与理论依据</h2>' +
      '<p class="panel-note">本系统的全部维度、条目设置与计分规则均以下列公开发表的标准化量表为依据：</p>' +
      '<ol class="ref-list">';
    list.forEach(function (scale) {
      html += '<li><span class="ref-scale">' + esc(scale.source) + '（' + esc(scale.name) + '维度）</span>' +
        '<span class="ref-cite">' + esc(scale.ref) + '</span></li>';
    });
    html += '<li><span class="ref-scale">量表中文译法参照公开发表的中文验证版本整理</span>' +
      '<span class="ref-cite">PHQ-9、GAD-7 中文版信效度：Wang W, et al. J Affect Disord. 2014（引证 α=0.82–0.91）；MDQ 中文条目经国内临床机构授权翻译验证（杨海晨等，2010）。条目译法如与原作者正式版本存在出入，以其为准。</span></li>';
    html += '</ol></section>';
    return html;
  }

  function renderDisclaimer() {
    return '<section class="disclaimer rise" style="--i:9" role="note">' +
      icon('shield', 20) +
      '<div><strong>本测评仅为参考，不能替代专业医疗诊断。</strong>' +
      '本系统为自评筛查工具，结果受作答时状态影响，不构成诊断结论或治疗建议。如测评提示异常，或您正被情绪、睡眠、知觉等问题困扰，请及时前往精神科或临床心理门诊，由专业医师进行面谈评估。</div>' +
      '</section>';
  }

  function emptyState(iconName, title, desc, action, actionLabel) {
    return '<section class="empty">' +
      icon(iconName, 44) +
      '<h1>' + esc(title) + '</h1>' +
      '<p>' + esc(desc) + '</p>' +
      (action ? '<button type="button" class="btn btn-primary" data-action="' + action + '">' + esc(actionLabel) + '</button>' : '') +
      '</section>';
  }

  /* ---------- 渲染：答题页 ---------- */

  function renderQuiz() {
    var scales = scalesOf(state.routeScale);
    var single = scales.length === 1;
    var total = 0, done = 0;
    scales.forEach(function (s) {
      total += window.requiredKeys(s).length;
      done += answeredIn(s);
    });
    var pct = total ? Math.round(done / total * 100) : 0;

    var title = single ? scales[0].name : '综合测评';
    var sub = single
      ? esc(stripAbbr(scales[0])) + ' · ' + esc(scales[0].timeWindow) + ' · 共 ' + total + ' 个条目 · 约 ' + scales[0].minutes + ' 分钟'
      : '全部六个维度共 ' + total + ' 个条目 · 约 15 分钟 · 按顺序作答即可';

    var html = '<div class="quiz-topline">' +
      '<a class="quiz-back" href="#/home">' + icon('back', 15) + '返回，选择其他维度</a>' +
      '</div>';

    html += '<section class="quiz-hero rise" style="--i:0" data-accent="' + (single ? scales[0].id : 'primary') + '">' +
      '<div class="quiz-hero-head">' +
      '<span class="dim-badge">' + icon(single ? scales[0].icon : 'clipboard', 22) + '</span>' +
      '<div class="quiz-hero-text"><h1>' + esc(title) + '</h1><p class="quiz-sub">' + sub + '</p></div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="reset-scope">' + icon('rotate', 15) + '重置本组作答</button>' +
      '</div>' +
      '<div class="quiz-progress"><div class="qp-track"><div class="qp-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="qp-text"><b>' + done + '</b> / ' + total + ' 已作答</span></div>' +
      '<p class="quiz-note">' + (single ? esc(scales[0].note) : '综合测评将依次呈现六个标准化量表，可中途离开，作答进度自动保存。') + '</p>' +
      '</section>';

    scales.forEach(function (scale, si) {
      html += '<section class="scale-block" data-accent="' + scale.id + '" id="block-' + scale.id + '">' +
        '<header class="scale-header">' +
        '<div class="scale-title">' +
        (single ? '' : '<span class="scale-num">' + String(si + 1).padStart(2, '0') + '</span>') +
        '<span class="dim-badge dim-badge-sm">' + icon(scale.icon, 18) + '</span>' +
        '<h2>' + esc(scale.name) + '</h2>' +
        '<span class="scale-tag">' + esc(scale.abbr) + '</span>' +
        '</div>' +
        '<div class="scale-info"><span class="live-score" data-live="' + scale.id + '">未完成</span>' +
        '<span class="scale-window">' + esc(scale.timeWindow) + '</span></div>' +
        '</header>' +
        '<p class="scale-note">' + esc(scale.note) + '</p>';

      if (scale.type === 'mdq') {
        html += '<p class="scale-lead">以下条目询问您<b>一生中</b>是否曾出现过下列体验，请选择“是”或“否”。</p>';
      }

      scale.items.forEach(function (item, i) {
        var idx = String(i + 1).padStart(2, '0');
        html += '<article class="item' + (state.invalid[item.key] ? ' item-invalid' : '') + '" data-item="' + item.key + '">' +
          '<div class="item-text"><span class="item-index">' + idx + '</span>' + esc(item.text) + '</div>';
        html += renderOptions(item.key, item.options, state.answers[item.key]);
        html += '</article>';

        // PQ-16 条件性痛苦评定
        if (scale.type === 'pq16') {
          html += '<article class="item distress' + (state.answers[item.key] === 1 ? ' distress-on' : ' distress-off') + '" data-distress="' + item.distressKey + '" data-for="' + item.key + '">' +
            '<div class="item-text"><span class="item-index sub">↳</span>若答“是”，该体验给您带来的痛苦程度？</div>' +
            renderOptions(item.distressKey, scale.distressOptions, state.answers[item.distressKey]) +
            '</article>';
        }
      });

      // MDQ 附加两问
      if (scale.cluster) {
        html += '<article class="item' + (state.invalid[scale.cluster.id] ? ' item-invalid' : '') + '" data-item="' + scale.cluster.id + '">' +
          '<div class="item-text"><span class="item-index">' + String(scale.items.length + 1).padStart(2, '0') + '</span>' + esc(scale.cluster.text) + '</div>' +
          renderOptions(scale.cluster.id, scale.cluster.options, state.answers[scale.cluster.id]) +
          '</article>';
        html += '<article class="item' + (state.invalid[scale.impairment.id] ? ' item-invalid' : '') + '" data-item="' + scale.impairment.id + '">' +
          '<div class="item-text"><span class="item-index">' + String(scale.items.length + 2).padStart(2, '0') + '</span>' + esc(scale.impairment.text) + '</div>' +
          renderOptions(scale.impairment.id, scale.impairment.options, state.answers[scale.impairment.id]) +
          '</article>';
      }

      html += '</section>';
    });

    html += '<section class="quiz-actions">' +
      '<p class="quiz-progress-note">已完成 <b data-progress-note>' + done + '</b> / ' + total + ' 个条目' +
      '<span data-missing-note class="missing-note"></span></p>' +
      '<div class="quiz-btn-row">' +
      '<a class="btn btn-ghost" href="#/home">返回导览</a>' +
      '<button type="button" class="btn btn-primary btn-lg" data-action="submit">' + icon('check') + '完成作答，查看结果</button>' +
      '</div>' +
      '<p class="quiz-consent">提交即表示您已理解并接受：本结果仅为参考，不能替代专业医疗诊断。</p>' +
      '</section>' +
      renderDisclaimer();

    return html;
  }

  function renderOptions(key, options, current) {
    var html = '<div class="option-row" role="radiogroup" aria-label="选项">';
    options.forEach(function (opt) {
      var sel = current === opt.value;
      html += '<label class="opt' + (sel ? ' opt-on' : '') + '">' +
        '<input type="radio" name="' + key + '" value="' + opt.value + '"' + (sel ? ' checked' : '') + '>' +
        '<span>' + esc(opt.label) + '</span></label>';
    });
    return html + '</div>';
  }

  /* ---------- 渲染：结果页 ---------- */

  function renderResults() {
    var sess = state.session;
    if (!sess) {
      return emptyState('clipboard', '还没有可展示的结果', '完成任意维度的测评后，这里会自动生成得分与分级说明。', 'start', '开始综合测评');
    }

    var scales = scalesOf(sess.scaleId);
    var incomplete = scales.filter(function (s) { return answeredIn(s) < window.requiredKeys(s).length; });
    if (incomplete.length) {
      return emptyState('clipboard', '该组测评尚未完成', '结果页会在所选量表全部条目作答完成后自动统计。', 'start', '继续作答');
    }

    var isAll = sess.scaleId === 'all';
    var results = isAll ? window.computeAll(state.answers) : [window.computeScale(scales[0], state.answers)];

    var title = isAll ? '综合测评结果' : scales[0].name + ' · 测评结果';
    var html = '<section class="result-head rise" style="--i:0">' +
      '<h1>' + esc(title) + '</h1>' +
      '<p>作答完成时间：' + fmtTime(sess.at) + ' · 以下分级均由标准化量表的公开划界分自动计算。</p>' +
      '</section>';

    // 总体概览（综合测评时展示）
    if (isAll) {
      var flagCount = 0;
      results.forEach(function (r) { if (r.id !== 'cross_note' && r.tone === 'alert') flagCount++; });
      var overviewTone = flagCount >= 2 ? 'alert' : (flagCount === 1 ? 'caution' : 'positive');
      var overviewText = flagCount === 0
        ? '各维度得分均处于较低水平，未发现需要优先关注的分级。'
        : (flagCount >= 2
          ? '有 ' + flagCount + ' 个维度达到“建议尽快评估”分级，建议尽早安排精神科/临床心理门诊面谈，并携带本结果供参考。'
          : '有 1 个维度达到“建议评估”分级，建议近期安排专业评估，其余维度继续观察。');
      html += '<section class="overview overview-' + overviewTone + ' rise" style="--i:1">' + icon(flagCount ? 'alert' : 'check', 20) +
        '<div><strong>总体提示</strong><p>' + esc(overviewText) + '</p></div></section>';
    }

    // 各维度结果卡
    html += '<section class="results-list">';
    results.forEach(function (r, ri) {
      var riseCls = ' rise';
      var riseStyle = ' style="--i:' + (ri + 1) + '"';
      if (r.id === 'cross_note') {
        html += '<article class="card result-card result-caution' + riseCls + '"' + riseStyle + '>' +
          '<header class="result-title"><span class="dim-badge dim-badge-sm">' + icon('activity', 18) + '</span>' +
          '<h2>' + esc(r.name) + '</h2><span class="result-level level-caution">就诊提示</span></header>' +
          '<p class="result-desc">' + esc(r.desc) + '</p>' +
          '</article>';
        return;
      }

      var scale = scales.filter(function (s) { return s.id === r.id; })[0];
      var accent = scale ? scale.id : 'primary';
      html += '<article class="card result-card result-' + r.tone + riseCls + '" data-accent="' + accent + '"' + riseStyle + '>';

      html += '<header class="result-title">' +
        (scale ? '<span class="dim-badge dim-badge-sm">' + icon(scale.icon, 18) + '</span>' : '') +
        '<h2>' + esc(r.name) + '</h2>' +
        '<span class="result-level level-' + r.tone + '">' + esc(r.level) + '</span></header>';

      if (r.id === 'mdq') {
        html += '<div class="extras">';
        r.extras.forEach(function (ex) {
          html += '<div class="extra"><span class="extra-label">' + esc(ex.label) + '</span><span class="extra-value">' + esc(ex.value) + '</span></div>';
        });
        html += '</div>';
      } else if (r.id === 'pq16') {
        html += '<div class="result-score-row"><span class="result-score">' + r.score + '</span>' +
          '<span class="result-max">/ ' + r.maxScore + ' 项（症状分）</span>' +
          '<span class="result-window">痛苦分划界 ≥ 9</span></div>';
        html += '<div class="extras">';
        r.extras.forEach(function (ex) {
          html += '<div class="extra"><span class="extra-label">' + esc(ex.label) + '</span><span class="extra-value">' + esc(ex.value) + '</span></div>';
        });
        html += '</div>';
      } else {
        html += '<div class="result-score-row"><span class="result-score">' + r.score + '</span>' +
          '<span class="result-max">/ ' + r.maxScore + ' 分</span>' +
          '<span class="result-window">' + esc(scale.timeWindow) + '</span></div>';
        html += renderBandBar(scale, r.score);
      }

      html += '<p class="result-desc">' + esc(r.desc) + '</p>';
      r.flags.forEach(function (f) {
        html += '<div class="flag flag-' + f.tone + '">' + icon('alert', 16) + esc(f.text) + '</div>';
      });
      if (scale) {
        html += '<p class="result-ref">依据：' + esc(scale.ref) + '</p>';
      }
      html += '</article>';
    });
    html += '</section>';

    // 本次范围引用来源
    html += renderReferences(scales);

    html += renderDisclaimer();
    html += '<div class="result-actions">' +
      '<button type="button" class="btn btn-ghost" data-action="retake" data-scope="' + sess.scaleId + '">' + icon('rotate') + '重新测评' + (isAll ? '' : '本维度') + '</button>' +
      '<a class="btn btn-ghost" href="#/home">' + icon('clipboard') + '测评其他维度</a>' +
      '<a class="btn btn-ghost" href="#/references">' + icon('book') + '查看全部参考文献</a>' +
      '</div>';

    return html;
  }

  /** 分数区间条：色带 + 分值 + 当前位置标记 */
  function renderBandBar(scale, score) {
    var segments = [];
    var prev = 0;
    scale.bands.forEach(function (b) {
      segments.push({ from: prev, to: b.max, tone: b.tone });
      prev = b.max + 1;
    });
    var total = scale.max + 1;
    var html = '<div class="bandbar" role="img" aria-label="得分 ' + score + '，' + bandOfLabel(scale, score) + '">';
    segments.forEach(function (seg) {
      var w = (seg.to - seg.from + 1) / total * 100;
      html += '<span class="seg seg-' + seg.tone + '" style="width:' + w + '%"></span>';
    });
    var pos = percent(score, scale.max);
    html += '<span class="marker" style="left:' + pos + '%"></span></div>';
    html += '<div class="bandbar-labels">';
    scale.bands.forEach(function (b) {
      var rangeText = getRangeText(scale, b);
      html += '<span class="band-label band-label-' + b.tone + '">' + esc(rangeText) + ' · ' + esc(b.level) + '</span>';
    });
    html += '</div>';
    return html;
  }

  function getRangeText(scale, band) {
    var bands = scale.bands;
    var idx = bands.indexOf(band);
    if (idx === 0) return '0–' + band.max;
    var from = bands[idx - 1].max + 1;
    return from === band.max ? String(band.max) : from + '–' + band.max;
  }

  function bandOfLabel(scale, score) {
    for (var i = 0; i < scale.bands.length; i++) {
      if (score <= scale.bands[i].max) return scale.bands[i].level;
    }
    return '';
  }

  /* ---------- 路由 ---------- */

  function route() {
    var hash = location.hash || '#/home';
    var raw = hash.replace('#/', '').split('?')[0];
    var seg = raw.split('/');
    var head = seg[0] || 'home';

    if (head === 'quiz') {
      state.view = 'quiz';
      state.routeName = 'quiz';
      state.routeScale = (seg[1] && scaleById(seg[1])) ? seg[1] : 'all';
    } else if (head === 'results') {
      state.view = 'results';
      state.routeName = 'results';
      state.routeScale = state.session ? state.session.scaleId : 'all';
    } else if (head === 'references') {
      state.view = 'home';
      state.routeName = 'references';
      state.routeScale = 'all';
    } else {
      state.view = 'home';
      state.routeName = 'home';
      state.routeScale = 'all';
    }

    var main = document.getElementById('app');
    if (state.view === 'quiz') main.innerHTML = renderQuiz();
    else if (state.view === 'results') main.innerHTML = renderResults();
    else main.innerHTML = renderHome();

    renderTopbar();

    if (state.routeName === 'references') {
      var ref = document.getElementById('references');
      if (ref) { ref.scrollIntoView({ behavior: 'smooth' }); return; }
    }
    window.scrollTo({ top: 0 });
  }

  /* ---------- 事件 ---------- */

  function updateQuizProgress() {
    var scales = scalesOf(state.routeScale);
    var total = 0, done = 0;
    scales.forEach(function (s) {
      total += window.requiredKeys(s).length;
      done += answeredIn(s);
    });
    var fill = document.querySelector('.qp-fill');
    if (fill) fill.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
    var qtext = document.querySelector('.qp-text');
    if (qtext) qtext.innerHTML = '<b>' + done + '</b> / ' + total + ' 已作答';
    var note = document.querySelector('[data-progress-note]');
    if (note) note.textContent = done;

    if (state.view === 'quiz') {
      var bar = document.getElementById('topbar-progress');
      bar.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
      document.getElementById('topbar-count').textContent = done + '/' + total;
    }
  }

  function updateLiveScores() {
    scalesOf(state.routeScale).forEach(function (scale) {
      var el = document.querySelector('[data-live="' + scale.id + '"]');
      if (!el) return;
      var keys = window.requiredKeys(scale);
      var done = keys.filter(function (k) { return typeof state.answers[k] !== 'undefined'; }).length;
      if (done < keys.length) {
        el.textContent = '未完成 ' + done + '/' + keys.length;
        el.className = 'live-score live-pending';
      } else {
        var r = window.computeScale(scale, state.answers);
        el.textContent = r.level;
        el.className = 'live-score live-' + r.tone;
      }
    });
    updateQuizProgress();
  }

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (input.type !== 'radio') return;
    var key = input.name;
    var value = Number(input.value);

    state.answers[key] = value;
    delete state.invalid[key];
    persist();

    // 同步本组选项的选中态样式
    var row = input.closest('.option-row');
    if (row) {
      row.querySelectorAll('.opt').forEach(function (lbl) {
        var inp = lbl.querySelector('input');
        lbl.classList.toggle('opt-on', !!(inp && inp.checked));
      });
    }

    var wrap = input.closest('[data-item], [data-distress]');
    if (wrap) wrap.classList.remove('item-invalid');

    // PQ-16：答“是”展开痛苦评定，答“否”收起
    var distressWrap = document.querySelector('[data-for="' + key + '"]');
    if (distressWrap) {
      if (value === 1) distressWrap.classList.remove('distress-off');
      else distressWrap.classList.add('distress-off');
    }

    updateLiveScores();
  });

  /** 清空某量表组的作答（含 PQ-16 条件性痛苦评定） */
  function clearScaleAnswers(scale) {
    scale.items.forEach(function (item) {
      delete state.answers[item.key];
      if (item.distressKey) delete state.answers[item.distressKey];
      delete state.invalid[item.key];
    });
    if (scale.cluster) { delete state.answers[scale.cluster.id]; delete state.invalid[scale.cluster.id]; }
    if (scale.impairment) { delete state.answers[scale.impairment.id]; delete state.invalid[scale.impairment.id]; }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'start') {
      location.hash = '#/quiz/all';
    } else if (action === 'go-results') {
      location.hash = '#/results';
    } else if (action === 'go-references') {
      location.hash = '#/references';
    } else if (action === 'reset') {
      if (!window.confirm('将清空全部作答记录并重新开始，确定吗？')) return;
      state.answers = {};
      state.invalid = {};
      state.session = null;
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(SESSION_KEY); } catch (err) {}
      location.hash = '#/home';
      route();
    } else if (action === 'reset-scope' || action === 'retake') {
      var scope = action === 'retake' ? btn.getAttribute('data-scope') : state.routeScale;
      if (!window.confirm('将清空该组已作答的内容，确定吗？')) return;
      scalesOf(scope).forEach(clearScaleAnswers);
      state.session = null;      // 会话随作答清空而失效
      state.invalid = {};
      persist();
      persistSession();
      location.hash = '#/quiz/' + (scope || 'all');
      route();
    } else if (action === 'submit') {
      handleSubmit();
    }
  });

  function handleSubmit() {
    // 校验：当前作用范围内所有必答条目必须已作答
    var missing = [];
    state.invalid = {};
    scalesOf(state.routeScale).forEach(function (scale) {
      window.requiredKeys(scale).forEach(function (key) {
        if (typeof state.answers[key] === 'undefined') {
          state.invalid[key] = true;
          missing.push(key);
        }
      });
    });

    if (missing.length) {
      // 高亮未完成条目并定位第一处
      Object.keys(state.invalid).forEach(function (key) {
        var wrap = document.querySelector('[data-item="' + key + '"], [data-distress="' + key + '"]');
        if (wrap) wrap.classList.add('item-invalid');
      });
      var first = document.querySelector('[data-item="' + missing[0] + '"], [data-distress="' + missing[0] + '"]');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var missNote = document.querySelector('[data-missing-note]');
      if (missNote) missNote.textContent = '（还有 ' + missing.length + ' 个条目未作答，已在页面中标出）';
      return;
    }

    state.session = { scaleId: state.routeScale, at: Date.now() };
    persist();
    persistSession();
    location.hash = '#/results';
    route();
  }

  /* ---------- 启动 ---------- */

  loadState();
  window.addEventListener('hashchange', route);
  route();
})();
