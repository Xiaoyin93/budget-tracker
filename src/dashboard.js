// 历史看板 - 基于鲨鱼记账明细的可视化
// 数据来源: src/data/records.json (从 CSV 转换)
(function () {
const fmtCNY = (n) => '¥' + Math.round(n).toLocaleString('en-US');

// 类别配色（pastel tag），按类别名稳定哈希
const TAG_CLASSES = ['tag-mint','tag-pink','tag-blue','tag-purple','tag-rose','tag-yellow','tag-orange','tag-gray'];
const TAG_BAR_COLORS = {
  'tag-mint':   '#1F6849',
  'tag-pink':   '#A53752',
  'tag-blue':   '#2C5F87',
  'tag-purple': '#553B8C',
  'tag-rose':   '#A2407D',
  'tag-yellow': '#7E5A0F',
  'tag-orange': '#8A4715',
  'tag-gray':   '#4A4843',
};
function tagFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return TAG_CLASSES[h % TAG_CLASSES.length];
}

// 当前选区：{ type: 'year' | 'recent6' | 'recent3' | 'month', month?: 'YYYY-MM' }
let selection = { type: 'year' };

function getActiveMonths(agg) {
  if (selection.type === 'year')    return agg.months;
  if (selection.type === 'recent6') return agg.months.slice(-6);
  if (selection.type === 'recent3') return agg.months.slice(-3);
  if (selection.type === 'month')   return [selection.month];
  return agg.months;
}
const fmtCNYShort = (n) => {
  const v = Math.round(n);
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 10000) return sign + '¥' + (abs / 10000).toFixed(1) + 'w';
  return sign + '¥' + abs.toLocaleString('en-US');
};

// ============================================
// 数据聚合
// ============================================

function aggregate(records) {
  const byMonth = {};      // ym -> { exp, inc, byCat: {cat: amt} }
  const byCat = {};        // cat -> total
  const months = new Set();
  const cats = new Set();

  for (const r of records) {
    const ym = r.d.slice(0, 7);
    months.add(ym);
    if (!byMonth[ym]) byMonth[ym] = { exp: 0, inc: 0, byCat: {} };
    if (r.t === '支出') {
      byMonth[ym].exp += r.a;
      byMonth[ym].byCat[r.c] = (byMonth[ym].byCat[r.c] || 0) + r.a;
      byCat[r.c] = (byCat[r.c] || 0) + r.a;
      cats.add(r.c);
    } else {
      byMonth[ym].inc += r.a;
    }
  }

  return {
    months: [...months].sort(),
    cats: [...cats].sort((a, b) => byCat[b] - byCat[a]),
    byMonth,
    byCat
  };
}

// ============================================
// 摘要指标
// ============================================

function renderSummary(agg) {
  const allMonths = agg.months;
  const active = getActiveMonths(agg);
  const isSingle = selection.type === 'month';

  const setLabels = (arr) => arr.forEach((t, i) => {
    document.getElementById('mLabel' + i).textContent = t;
  });

  // 总览类（年/近6/近3）
  const overallAvgExp = allMonths.reduce((s, m) => s + agg.byMonth[m].exp, 0) / allMonths.length;
  const overallAvgInc = allMonths.reduce((s, m) => s + agg.byMonth[m].inc, 0) / allMonths.length;

  const totalExp = active.reduce((s, m) => s + (agg.byMonth[m]?.exp || 0), 0);
  const totalInc = active.reduce((s, m) => s + (agg.byMonth[m]?.inc || 0), 0);
  const n = active.length;
  const avgExp = totalExp / n;
  const avgInc = totalInc / n;

  if (isSingle) {
    setLabels(['当月支出', '对比月均', '当月收入', '当月盈余']);
    const m = agg.byMonth[selection.month] || { exp: 0, inc: 0, byCat: {} };
    const exp = m.exp, inc = m.inc, net = inc - exp;
    const rate = inc > 0 ? net / inc : 0;
    const expDiff = exp - overallAvgExp;
    const incDiff = inc - overallAvgInc;

    document.getElementById('mTotalExp').textContent = fmtCNY(exp);
    document.getElementById('mMonths').textContent =
      (expDiff >= 0 ? '高于月均 ' : '低于月均 ') + fmtCNY(Math.abs(expDiff));

    document.getElementById('mAvgExp').textContent = fmtCNY(overallAvgExp);
    document.getElementById('mAvgExpSub').textContent = `12 个月平均水平`;

    document.getElementById('mAvgInc').textContent = fmtCNY(inc);
    document.getElementById('mAvgIncSub').textContent =
      (incDiff >= 0 ? '高于月均 ' : '低于月均 ') + fmtCNY(Math.abs(incDiff));

    const netEl = document.getElementById('mAvgNet');
    netEl.classList.remove('metric-pos', 'metric-neg');
    netEl.textContent = (net >= 0 ? '' : '-') + fmtCNY(Math.abs(net));
    netEl.classList.add(net >= 0 ? 'metric-pos' : 'metric-neg');
    document.getElementById('mAvgNetSub').textContent = `储蓄率 ${(rate * 100).toFixed(1)}%`;
  } else {
    // year / recent6 / recent3
    const totalLabel = selection.type === 'year' ? '总支出' : `近 ${n} 月支出`;
    setLabels([totalLabel, '月均支出', '月均收入', '月均盈余']);

    const avgNet = avgInc - avgExp;
    const rate = avgInc > 0 ? avgNet / avgInc : 0;

    let maxM = active[0], minM = active[0];
    for (const m of active) {
      if (agg.byMonth[m].exp > agg.byMonth[maxM].exp) maxM = m;
      if (agg.byMonth[m].exp < agg.byMonth[minM].exp) minM = m;
    }

    document.getElementById('mTotalExp').textContent = fmtCNY(totalExp);
    document.getElementById('mMonths').textContent = `${n} 个月累计`;
    document.getElementById('mAvgExp').textContent = fmtCNY(avgExp);
    document.getElementById('mAvgExpSub').textContent =
      `最高 ${maxM.slice(5)}月 ${fmtCNY(agg.byMonth[maxM].exp)} · 最低 ${minM.slice(5)}月 ${fmtCNY(agg.byMonth[minM].exp)}`;
    document.getElementById('mAvgInc').textContent = fmtCNY(avgInc);
    document.getElementById('mAvgIncSub').textContent = '含意外收入';

    const netEl = document.getElementById('mAvgNet');
    netEl.classList.remove('metric-pos', 'metric-neg');
    netEl.textContent = (avgNet >= 0 ? '' : '-') + fmtCNY(Math.abs(avgNet));
    netEl.classList.add(avgNet >= 0 ? 'metric-pos' : 'metric-neg');
    document.getElementById('mAvgNetSub').textContent = `储蓄率 ${(rate * 100).toFixed(1)}%`;
  }

  // 顶部日期范围标签
  const rangeEl = document.getElementById('dateRange');
  if (selection.type === 'month') {
    rangeEl.textContent = `查看月份 · ${selection.month}`;
  } else if (selection.type === 'year') {
    rangeEl.textContent = `${allMonths[0]} → ${allMonths[allMonths.length - 1]}`;
  } else {
    rangeEl.textContent = `${active[0]} → ${active[active.length - 1]}`;
  }
}

// ============================================
// 月度柱状图（SVG）
// ============================================

function renderBars(agg) {
  const svg = document.getElementById('barsSvg');
  const ms = agg.months;
  const W = Math.max(720, svg.clientWidth || 720);
  const H = 260;
  const padL = 50, padR = 10, padT = 16, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxV = Math.max(
    ...ms.map(m => Math.max(agg.byMonth[m].exp, agg.byMonth[m].inc))
  );
  // 上取整到最近的 5000
  const step = 5000;
  const yMax = Math.ceil(maxV / step) * step;

  const groupW = innerW / ms.length;
  const barW = Math.min(18, (groupW - 6) / 2);

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');

  let html = '';

  // y 轴网格 + 标签
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (yMax / ticks) * i;
    const y = padT + innerH - (v / yMax) * innerH;
    html += `<line class="bar-grid" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>`;
    html += `<text class="bar-label" x="${padL - 6}" y="${y + 3}" text-anchor="end">${fmtCNYShort(v)}</text>`;
  }

  // 每个月一组
  ms.forEach((m, i) => {
    const cx = padL + i * groupW + groupW / 2;
    const exp = agg.byMonth[m].exp;
    const inc = agg.byMonth[m].inc;
    const expH = (exp / yMax) * innerH;
    const incH = (inc / yMax) * innerH;
    const baseY = padT + innerH;

    const x1 = cx - barW - 1;
    const x2 = cx + 1;

    const activeMonths = getActiveMonths(agg);
    const inActive = activeMonths.includes(m);
    const isSingle = selection.type === 'month' && m === selection.month;
    const opacity = (selection.type !== 'year' && !inActive) ? 0.3 : 1;
    html += `<rect class="bar-expense" x="${x1}" y="${baseY - expH}" width="${barW}" height="${expH}" rx="2" opacity="${opacity}"/>`;
    html += `<rect class="bar-income"  x="${x2}" y="${baseY - incH}" width="${barW}" height="${incH}" rx="2" opacity="${opacity}"/>`;
    if (isSingle) {
      html += `<rect x="${cx - groupW/2 + 2}" y="${baseY + 2}" width="${groupW - 4}" height="2" fill="var(--text-primary)" rx="1"/>`;
    }

    // 月份标签
    html += `<text class="bar-month" x="${cx}" y="${H - 14}" text-anchor="middle">${m.slice(5)}月</text>`;
    // 净值标签
    const net = inc - exp;
    const netCol = net >= 0 ? 'var(--success)' : 'var(--danger)';
    html += `<text class="bar-value" x="${cx}" y="${H - 2}" text-anchor="middle" style="fill:${netCol}">${net >= 0 ? '+' : ''}${fmtCNYShort(net)}</text>`;
  });

  // 基线
  html += `<line class="bar-axis" x1="${padL}" y1="${padT + innerH}" x2="${W - padR}" y2="${padT + innerH}"/>`;

  svg.innerHTML = html;
  document.getElementById('barsHint').textContent = '· 月份下方为当月盈余';
}

// ============================================
// 类别分布
// ============================================

function renderCategories(agg) {
  const wrap = document.getElementById('catList');
  const active = getActiveMonths(agg);
  const n = active.length;

  // 把选中月份的类别累加
  const aggByCat = {};
  for (const m of active) {
    for (const [c, v] of Object.entries(agg.byMonth[m]?.byCat || {})) {
      aggByCat[c] = (aggByCat[c] || 0) + v;
    }
  }
  const data = Object.entries(aggByCat);

  data.sort((a, b) => b[1] - a[1]);
  if (data.length === 0) {
    wrap.innerHTML = '<div class="empty">该月暂无支出记录</div>';
    return;
  }

  const total = data.reduce((s, [, v]) => s + v, 0);
  const max = data[0][1];

  wrap.innerHTML = data.map(([c, v]) => {
    const pct = (v / total) * 100;
    const barW = (v / max) * 100;
    const tag = tagFor(c);
    const barColor = TAG_BAR_COLORS[tag];
    const sub = (selection.type === 'month')
      ? ''
      : `<span class="muted">/ 月均 ${fmtCNY(v / n)}</span>`;
    return `
      <div class="cat-row">
        <span class="cat-name"><span class="tag ${tag}">${c}</span></span>
        <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${barW}%;background:${barColor}"></div></div>
        <span class="cat-amt">${fmtCNY(v)} ${sub}</span>
        <span class="cat-pct">${pct.toFixed(1)}%</span>
      </div>
    `;
  }).join('');
}

// ============================================
// 月份 × 类别 热力表
// ============================================

function renderHeatmap(agg) {
  const table = document.getElementById('heatTable');
  const topCats = agg.cats.slice(0, 12); // Top 12 类别
  const ms = agg.months;

  // 找出每个类别在所有月里的最大值，用于热力分级
  const catMax = {};
  topCats.forEach(c => {
    catMax[c] = Math.max(...ms.map(m => agg.byMonth[m].byCat[c] || 0));
  });

  const heatLevel = (v, max) => {
    if (!v) return 0;
    const r = v / max;
    if (r < 0.2) return 1;
    if (r < 0.4) return 2;
    if (r < 0.6) return 3;
    if (r < 0.8) return 4;
    return 5;
  };

  let html = '<thead><tr><th>类别</th>';
  ms.forEach(m => { html += `<th>${m.slice(5)}月</th>`; });
  html += '<th>合计</th></tr></thead><tbody>';

  topCats.forEach(c => {
    html += `<tr><td>${c}</td>`;
    let rowTotal = 0;
    ms.forEach(m => {
      const v = agg.byMonth[m].byCat[c] || 0;
      rowTotal += v;
      const lvl = heatLevel(v, catMax[c]);
      const cls = v ? `heat-cell h-${lvl}` : 'heat-cell-empty';
      html += `<td class="${cls}" data-cat="${c}" data-month="${m}" data-amt="${Math.round(v)}">${v ? Math.round(v).toLocaleString('en-US') : '·'}</td>`;
    });
    html += `<td>${Math.round(rowTotal).toLocaleString('en-US')}</td></tr>`;
  });

  // 每月总计行
  html += '<tr class="heat-row-total"><td>月支出</td>';
  let grand = 0;
  ms.forEach(m => {
    const v = agg.byMonth[m].exp;
    grand += v;
    html += `<td>${Math.round(v).toLocaleString('en-US')}</td>`;
  });
  html += `<td>${Math.round(grand).toLocaleString('en-US')}</td></tr>`;
  html += '</tbody>';

  table.innerHTML = html;
}

// ============================================
// 开销画像（每类别月均 + sparkline）
// ============================================

function renderProfile(agg) {
  const wrap = document.getElementById('profileGrid');
  const ms = agg.months;
  const n = ms.length;

  wrap.innerHTML = agg.cats.map(c => {
    const series = ms.map(m => agg.byMonth[m].byCat[c] || 0);
    const total = series.reduce((s, v) => s + v, 0);
    const avg = total / n;
    const max = Math.max(...series, 1);

    const w = 140, h = 22;
    const stepX = w / (series.length - 1 || 1);
    const points = series.map((v, i) => {
      const x = i * stepX;
      const y = h - (v / max) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const linePath = 'M ' + points.join(' L ');
    const areaPath = `M 0,${h} L ${points.join(' L ')} L ${w},${h} Z`;

    return `
      <div class="profile-row">
        <span class="profile-name">${c}</span>
        <svg class="profile-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          <path class="area" d="${areaPath}"/>
          <path d="${linePath}"/>
        </svg>
        <span class="profile-avg">${fmtCNY(avg)}/月</span>
      </div>
    `;
  }).join('');
}

// ============================================
// 大额记录 Top 20
// ============================================

let allRecords = [];
let currentAgg = { months: [], byMonth: {}, byCat: {}, cats: [] };

let currentFilterCat = '';

function renderBigList() {
  const wrap = document.getElementById('bigList');
  const activeSet = new Set(getActiveMonths(currentAgg));
  const expenses = allRecords.filter(r =>
    r.t === '支出'
    && (!currentFilterCat || r.c === currentFilterCat)
    && activeSet.has(r.d.slice(0, 7))
  );
  const top = expenses.slice().sort((a, b) => b.a - a.a).slice(0, 20);

  if (top.length === 0) {
    wrap.innerHTML = '<div class="empty">暂无记录</div>';
    return;
  }

  wrap.innerHTML = top.map(r => `
    <div class="big-row">
      <span class="big-date">${r.d}</span>
      <span class="tag ${tagFor(r.c)}">${r.c}</span>
      <span class="big-note">${r.n || '—'}</span>
      <span class="big-amt">${fmtCNY(r.a)}</span>
    </div>
  `).join('');
}

function setupHeatTooltip() {
  let tip = document.querySelector('.heat-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'heat-tooltip';
    document.body.appendChild(tip);
  }
  const table = document.getElementById('heatTable');

  table.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('td.heat-cell, td.heat-cell-empty');
    if (!cell || !cell.dataset.cat) {
      tip.classList.remove('show');
      return;
    }
    const cat = cell.dataset.cat;
    const month = cell.dataset.month;
    const amt = parseInt(cell.dataset.amt, 10);
    const amtStr = amt > 0 ? '¥' + amt.toLocaleString('en-US') : '无支出';
    tip.innerHTML = `<strong>${cat}</strong> · ${month}<br><span class="t-amt">${amtStr}</span>`;
    const r = cell.getBoundingClientRect();
    tip.style.left = (r.left + r.width / 2) + 'px';
    tip.style.top = r.top + 'px';
    tip.classList.add('show');
  });

  table.addEventListener('mouseleave', () => tip.classList.remove('show'));
}

function setupBigFilter(agg) {
  const sel = document.getElementById('bigCatFilter');
  agg.cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', e => {
    currentFilterCat = e.target.value;
    renderBigList();
  });
}

// ============================================
// 月份切换
// ============================================

function renderMonthTabs(agg, onChange) {
  const wrap = document.getElementById('dashMonthTabs');
  const months = agg.months.slice().reverse(); // 最新月在前
  const latestMonth = agg.months[agg.months.length - 1];
  const yearRange = `${agg.months[0]} 至 ${latestMonth}`;

  // 默认 selection.month 为最新月
  if (!selection.month) selection.month = latestMonth;

  const isActive = (type) => selection.type === type;
  const monthLabel = isActive('month') ? `当月 · ${selection.month.slice(2)}` : '当月';

  wrap.innerHTML = `
    <button class="month-tab${isActive('year') ? ' active' : ''}" data-range="year" type="button">
      全年总览
      <span class="tab-tooltip">${yearRange}</span>
    </button>
    <button class="month-tab${isActive('recent6') ? ' active' : ''}" data-range="recent6" type="button">近 6 个月</button>
    <button class="month-tab${isActive('recent3') ? ' active' : ''}" data-range="recent3" type="button">近 3 个月</button>
    <span class="month-tab-picker${isActive('month') ? ' active' : ''}" data-range="month">
      <span class="picker-label">${monthLabel}</span>
      <svg class="picker-caret" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 13.1716L16.9497 8.22186L18.364 9.63607L12 16L5.63604 9.63607L7.05025 8.22186L12 13.1716Z"/></svg>
      <select id="monthDropdown" aria-label="选择月份">
        ${months.map(m => `<option value="${m}"${m === selection.month ? ' selected' : ''}>${m}</option>`).join('')}
      </select>
    </span>
  `;

  // tab 按钮（不含当月 picker）
  wrap.querySelectorAll('button.month-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      selection = { type: btn.dataset.range, month: selection.month };
      onChange();
      renderMonthTabs(agg, onChange); // 重渲染 tabs 反映新状态
    });
  });

  // 当月下拉
  const dropdown = wrap.querySelector('#monthDropdown');
  dropdown.addEventListener('change', () => {
    selection = { type: 'month', month: dropdown.value };
    onChange();
    renderMonthTabs(agg, onChange);
  });
  // 点击 picker pill 也激活当月模式
  const pickerPill = wrap.querySelector('.month-tab-picker');
  pickerPill.addEventListener('mousedown', (e) => {
    if (e.target === dropdown) return; // 让 select 自己处理
    if (selection.type !== 'month') {
      selection = { type: 'month', month: selection.month };
      onChange();
      renderMonthTabs(agg, onChange);
    }
  });
}

// ============================================
// 入口
// ============================================

async function loadRecords() {
  // 密码门统一处理（index.html 头部脚本已设置）
  if (window.__unlock) {
    const data = await window.__unlock;
    if (data) return data;
  }
  // 兜底（无密码门情况）
  if (window.__RECORDS__) return window.__RECORDS__;
  const r = await fetch('data/records.json');
  if (r.ok) return await r.json();
  throw new Error('找不到 records 数据');
}

async function init() {
  try {
    const records = await loadRecords();
    allRecords = records;
    const agg = aggregate(records);
    currentAgg = agg;

    function refresh() {
      renderSummary(agg);
      renderBars(agg);
      renderCategories(agg);
      renderBigList();
    }

    renderMonthTabs(agg, refresh);
    refresh();
    renderHeatmap(agg);
    setupHeatTooltip();
    renderProfile(agg);
    setupBigFilter(agg);

    // 切换到看板 tab 时重绘柱状图（首次显示后才有正确的宽度）
    window.__redrawDashboard = () => renderBars(agg);

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => renderBars(agg), 150);
    });
  } catch (e) {
    const host = document.getElementById('view-dashboard') || document.querySelector('.app');
    host.insertAdjacentHTML(
      'beforeend',
      `<div class="card" style="color:var(--danger)">数据加载失败：${e.message}<br/>请通过 HTTP 访问（如 <code>python3 -m http.server 8080</code>），不要直接双击打开。</div>`
    );
    console.error(e);
  }
}

init();
})();
