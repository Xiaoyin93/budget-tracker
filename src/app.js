// 月度预算记账工具 - 主逻辑
// 用动态 import 绕过浏览器对 ES 模块的强缓存（这样改 config.js 后刷新即可生效）
const { CONFIG, SECTIONS } = await import('./config.js?t=' + Date.now());

const STORAGE_PREFIX = 'budget_tracker:';
const INCOME_CNY = CONFIG.incomeHKD * CONFIG.exchangeRate;

let currentMonth = '';
let monthData = { actuals: {}, notes: '', saved_at: null };
let dirty = false;

// ============================================
// 工具函数
// ============================================

function buildMonthOptions() {
  const months = [];
  const { start, end } = CONFIG.monthRange;
  for (let y = start.year; y <= end.year; y++) {
    const startM = y === start.year ? start.month : 1;
    const endM = y === end.year ? end.month : 12;
    for (let m = startM; m <= endM; m++) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  return months;
}

function fmtCNY(n) { return '¥' + Math.round(n).toLocaleString('en-US'); }
function fmtHKD(n) { return 'HK$' + Math.round(n).toLocaleString('en-US'); }
function fmtByCur(n, cur) { return cur === 'CNY' ? fmtCNY(n) : fmtHKD(n); }
function toCNY(n, cur) { return cur === 'CNY' ? n : n * CONFIG.exchangeRate; }

// ============================================
// 存储
// ============================================

function storageGet(key) {
  try {
    const v = localStorage.getItem(STORAGE_PREFIX + key);
    return v ? JSON.parse(v) : null;
  } catch (e) { return null; }
}

function storageSet(key, val) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
    return true;
  } catch (e) { return false; }
}

function getMonthsTracked() {
  return storageGet('months_tracked') || [];
}

function addMonthTracked(month) {
  const list = getMonthsTracked();
  if (!list.includes(month)) {
    list.push(month);
    list.sort();
    storageSet('months_tracked', list);
  }
}

// ============================================
// 渲染
// ============================================

// Remix Icon SVG（fill=currentColor 跟随文字色）
const SECTION_ICONS = {
  fixed:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.49a1 1 0 0 1 .386-.79l8-6.222a1 1 0 0 1 1.228 0l8 6.222a1 1 0 0 1 .386.79V20zm-2-1V9.978l-7-5.444-7 5.444V19h14z"/></svg>',
  living:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 16V4H2V2h3a1 1 0 0 1 1 1v12h12.438l2-8H8V5h13.72a1 1 0 0 1 .97 1.243l-2.5 10A1 1 0 0 1 19.22 17H5a1 1 0 0 1-1-1zm2 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm12 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>',
  savings: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22zm0 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-1 4h2v1h2v2h-4a.5.5 0 0 0 0 1h2a2.5 2.5 0 0 1 0 5h-1v1H10v-1H8v-2h4a.5.5 0 0 0 0-1h-2a2.5 2.5 0 0 1 0-5h1V7z"/></svg>',
};

function renderSections() {
  const wrap = document.getElementById('sectionsWrap');
  let html = '';
  SECTIONS.forEach(sec => {
    let budgetCNY = 0;
    sec.items.forEach(i => { budgetCNY += toCNY(i.budget, i.cur); });
    const icon = SECTION_ICONS[sec.id] || '';
    html += `<div class="section" data-section="${sec.id}">
      <div class="section-header">
        <span class="section-title">${icon}${sec.title}</span>
        <span class="section-sub">${sec.subtitle} · 预算 ${fmtCNY(budgetCNY)}</span>
      </div>`;
    sec.items.forEach(item => {
      const curLabel = item.cur === 'CNY' ? 'RMB' : 'HKD';
      html += `<div class="item-row">
        <span class="item-name">${item.name}<span class="cur-pill">${curLabel}</span></span>
        <span class="item-budget">${fmtByCur(item.budget, item.cur)}</span>
        <input class="item-input" type="number" min="0" step="1" placeholder="${item.budget}" data-item="${item.id}" data-cur="${item.cur}" data-budget="${item.budget}" />
        <span class="item-variance" data-var="${item.id}">—</span>
      </div>`;
    });
    html += `<div class="section-footer">
        <span>小计（RMB 等值）</span>
        <span data-subtotal="${sec.id}">¥0 / ${fmtCNY(budgetCNY)}</span>
      </div>
      <div class="section-actions">
        <button type="button" data-fill-section="${sec.id}">按预算填本组</button>
      </div>
    </div>`;
  });
  wrap.innerHTML = html;
}

function populateMonthPicker() {
  const sel = document.getElementById('monthPicker');
  const months = buildMonthOptions();
  sel.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join('');
}

// ============================================
// 月份加载与计算
// ============================================

function loadMonth(m) {
  currentMonth = m;
  document.getElementById('monthPicker').value = m;
  const saved = storageGet('month:' + m);
  monthData = saved || { actuals: {}, notes: '', income: null, saved_at: null };
  document.querySelectorAll('input[data-item]').forEach(inp => {
    const id = inp.getAttribute('data-item');
    const v = monthData.actuals ? monthData.actuals[id] : undefined;
    inp.value = (v !== undefined && v !== null && v !== '') ? v : '';
  });
  document.getElementById('monthNotes').value = monthData.notes || '';
  dirty = false;
  updateSaveStatus();
  recalc();
}

function getCurrentIncome() {
  return (monthData.income && monthData.income > 0) ? monthData.income : INCOME_CNY;
}

function updateSaveStatus() {
  const el = document.getElementById('saveStatus');
  if (dirty) {
    el.textContent = '未保存 •';
    el.classList.add('dirty');
  } else if (monthData.saved_at) {
    const d = new Date(monthData.saved_at);
    const dateStr = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    el.textContent = '已保存 ' + dateStr;
    el.classList.remove('dirty');
  } else {
    el.textContent = '未保存';
    el.classList.remove('dirty');
  }
}

function recalc() {
  let totalBudgetCNY = 0;
  let totalActualCNY = 0;
  let anyFilled = false;
  let savingsActualCNY = 0;
  let savingsTargetCNY = 0;
  let savingsFilled = false;

  SECTIONS.forEach(sec => {
    let secBudget = 0;
    let secActual = 0;
    sec.items.forEach(item => {
      const budCNY = toCNY(item.budget, item.cur);
      secBudget += budCNY;
      totalBudgetCNY += budCNY;
      const inp = document.querySelector(`input[data-item="${item.id}"]`);
      const raw = inp && inp.value !== '' ? parseFloat(inp.value) : null;
      let actCNY = 0;
      const varEl = document.querySelector(`[data-var="${item.id}"]`);
      if (raw !== null && !isNaN(raw)) {
        actCNY = toCNY(raw, item.cur);
        secActual += actCNY;
        totalActualCNY += actCNY;
        anyFilled = true;
        const diff = raw - item.budget;
        if (diff === 0) {
          varEl.textContent = '✓';
          varEl.className = 'item-variance v-ok';
        } else if (diff < 0) {
          varEl.textContent = fmtByCur(Math.abs(diff), item.cur) + ' ↓';
          varEl.className = 'item-variance v-ok';
        } else {
          varEl.textContent = '+' + fmtByCur(diff, item.cur);
          varEl.className = 'item-variance v-over';
        }
      } else {
        varEl.textContent = '—';
        varEl.className = 'item-variance';
      }
      if (sec.id === 'savings') {
        savingsTargetCNY += budCNY;
        if (raw !== null && !isNaN(raw)) {
          savingsActualCNY += actCNY;
          savingsFilled = true;
        }
      }
    });
    const subEl = document.querySelector(`[data-subtotal="${sec.id}"]`);
    if (subEl) subEl.textContent = fmtCNY(secActual) + ' / ' + fmtCNY(secBudget);
  });

  const income = getCurrentIncome();
  const sumBudgetEl = document.getElementById('sumBudget');
  if (document.activeElement !== sumBudgetEl) sumBudgetEl.textContent = fmtCNY(income);
  document.getElementById('sumBudgetSub').textContent =
    monthData.income ? '本月手动录入' : 'RMB 等值（默认）';
  if (anyFilled) {
    document.getElementById('sumActual').textContent = fmtCNY(totalActualCNY);
    const diff = totalBudgetCNY - totalActualCNY;
    const sub = document.getElementById('sumActualSub');
    if (diff >= 0) {
      sub.textContent = '预算内 ' + fmtCNY(Math.abs(diff));
      sub.style.color = 'var(--success)';
    } else {
      sub.textContent = '超支 ' + fmtCNY(Math.abs(diff));
      sub.style.color = 'var(--danger)';
    }
    if (savingsActualCNY > 0) {
      const rate = (savingsActualCNY / income) * 100;
      document.getElementById('sumRate').textContent = rate.toFixed(1) + '%';
    } else {
      document.getElementById('sumRate').textContent = '—';
    }
  } else {
    document.getElementById('sumActual').textContent = '¥0';
    document.getElementById('sumActualSub').textContent = '待填写';
    document.getElementById('sumActualSub').style.color = 'var(--text-tertiary)';
    document.getElementById('sumRate').textContent = '—';
  }

  renderPacman(savingsActualCNY, savingsTargetCNY, savingsFilled);
}

// ============================================
// 吃豆人进度条
// ============================================

// 吃豆人（像素风，嘴巴朝右）
const PAC_GRID = [
  '..oooo..',
  '.oooooo.',
  'ooo.....',
  'oo......',
  'oo......',
  'ooo.....',
  '.oooooo.',
  '..oooo..',
];
// 终点：像素爱心旗
const GOAL_GRID = [
  'yyyyyyyy',  // 旗顶
  'yrryyrry',  // 爱心两个圆顶
  'rhhrrhhr',  // 爱心中间
  'rhhhhhhr',  // 爱心最宽
  'yrhhhhry',  // 收窄
  'yyrhhryy',
  'yyyrryyy',  // 爱心尖
  'yyyyyyyy',  // 旗底
];

function pixelArt(grid, cx, cy, px, palette) {
  const offX = cx - 4 * px;
  const offY = cy - 4 * px;
  let html = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const ch = grid[r][c];
      const fill = palette[ch];
      if (fill) {
        html += `<rect x="${offX + c * px}" y="${offY + r * px}" width="${px}" height="${px}" fill="${fill}"/>`;
      }
    }
  }
  return html;
}

function renderPacman(savedCNY, targetCNY, savingsFilled) {
  const svg = document.getElementById('pacmanSvg');
  const status = document.getElementById('pacmanStatus');
  const foot = document.getElementById('pacmanFoot');
  if (!svg) return;

  // 用 SVG 实际渲染宽度做 viewBox，避免拉伸把圆压扁
  const H = 56, midY = H / 2;
  const W = Math.max(svg.clientWidth || 800, 320);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const px = 4;
  const pacHalf = 4 * px;
  const xStart = 8 + pacHalf;
  const xApple = W - 8 - pacHalf;

  const ratio = targetCNY > 0 ? savedCNY / targetCNY : 0;
  let xPac;
  if (ratio <= 1) {
    xPac = xStart + Math.max(ratio, 0) * (xApple - xStart);
  } else {
    // 超额完成时小黄人略过旗子，最多伸出 24px
    xPac = xApple + Math.min((ratio - 1) * 200, 24);
  }

  // 豆子均匀分布在轨道上
  const dotCount = 22;
  const dotStart = xStart + pacHalf + 6;
  const dotEnd = xApple - pacHalf - 6;
  const dotStep = (dotEnd - dotStart) / (dotCount - 1);

  let html = '';
  // 轨道
  html += `<line x1="${xStart}" y1="${midY}" x2="${xApple}" y2="${midY}" stroke="var(--border-soft, rgba(15,14,11,0.18))" stroke-width="1" stroke-dasharray="2 4"/>`;

  // 未吃掉的豆子
  for (let i = 0; i < dotCount; i++) {
    const dx = dotStart + i * dotStep;
    if (dx > xPac + pacHalf - 2) {
      html += `<rect x="${dx - 2}" y="${midY - 2}" width="4" height="4" fill="#F2B82A" shape-rendering="crispEdges"/>`;
    }
  }

  // 终点旗子
  const goalSize = 32;
  html += `<image href="assets/flag.png" x="${xApple - goalSize / 2}" y="${midY - goalSize / 2}" width="${goalSize}" height="${goalSize}" style="image-rendering:pixelated"/>`;

  // 吃豆人
  const pacSize = 32;
  html += `<g class="pacman-face">
    <image href="assets/douzi.png" x="${xPac - pacSize / 2}" y="${midY - pacSize / 2}" width="${pacSize}" height="${pacSize}" style="image-rendering:pixelated"/>
  </g>`;

  svg.innerHTML = html;

  // 状态文字 — 当前 / 储蓄目标
  const pct = Math.round(ratio * 100);
  const remain = targetCNY - savedCNY;
  if (!savingsFilled || targetCNY <= 0) {
    status.innerHTML = `${fmtCNY(0)} <span class="pacman-slash">/</span> ${fmtCNY(targetCNY)}`;
    foot.textContent = '填完「储蓄 + 投资」即可看到进度';
    return;
  }
  if (ratio < 1) {
    status.innerHTML = `${fmtCNY(savedCNY)} <span class="pacman-slash">/</span> ${fmtCNY(targetCNY)} <span class="pacman-pct">${pct}%</span>`;
    foot.textContent = `还差 ${fmtCNY(remain)} 才到目标`;
  } else if (ratio === 1) {
    status.innerHTML = `${fmtCNY(savedCNY)} <span class="pacman-slash">/</span> ${fmtCNY(targetCNY)} <span class="pacman-pct done">100%</span>`;
    foot.textContent = '正好达成本月储蓄目标 🎉';
  } else {
    status.innerHTML = `${fmtCNY(savedCNY)} <span class="pacman-slash">/</span> ${fmtCNY(targetCNY)} <span class="pacman-pct done">${pct}%</span>`;
    foot.textContent = `超额完成 +${fmtCNY(-remain)} 🎉`;
  }
}

// ============================================
// 保存与历史
// ============================================

function saveMonth() {
  const actuals = {};
  document.querySelectorAll('input[data-item]').forEach(inp => {
    const id = inp.getAttribute('data-item');
    const v = inp.value;
    if (v !== '') {
      const n = parseFloat(v);
      if (!isNaN(n)) actuals[id] = n;
    }
  });
  const notes = document.getElementById('monthNotes').value;
  const saved_at = new Date().toISOString();
  const payload = { actuals, notes, income: monthData.income || null, saved_at };
  const ok = storageSet('month:' + currentMonth, payload);
  if (ok) {
    addMonthTracked(currentMonth);
    monthData = payload;
    dirty = false;
    updateSaveStatus();
    showToast('已保存 ' + currentMonth);
    renderHistory();
  } else {
    showToast('保存失败，请检查浏览器存储权限', true);
  }
}

function showToast(msg, isErr) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' error' : '');
  setTimeout(() => { t.classList.remove('show'); }, 2400);
}

function renderHistory() {
  const list = document.getElementById('histList');
  const months = getMonthsTracked();
  if (!months.length) {
    list.innerHTML = '<div class="empty">还没有保存过的月份，填完本月后点「保存本月」就会显示在这里。</div>';
    return;
  }
  const totalBudgetCNY = SECTIONS.reduce((s, sec) =>
    s + sec.items.reduce((ss, i) => ss + toCNY(i.budget, i.cur), 0), 0);
  const rows = [];
  months.slice().reverse().forEach(m => {
    const data = storageGet('month:' + m);
    let totalCNY = 0;
    let savingsCNY = 0;
    if (data && data.actuals) {
      SECTIONS.forEach(sec => {
        sec.items.forEach(item => {
          const v = data.actuals[item.id];
          if (v !== undefined && v !== null) {
            const c = toCNY(v, item.cur);
            totalCNY += c;
            if (sec.id === 'savings') savingsCNY += c;
          }
        });
      });
    }
    const diff = totalBudgetCNY - totalCNY;
    const diffLabel = totalCNY === 0 ? '—' : (diff >= 0 ? '预算内' : '超支');
    const diffClass = totalCNY === 0 ? '' : (diff >= 0 ? 'v-ok' : 'v-over');
    const rate = savingsCNY > 0 ? ((savingsCNY / INCOME_CNY) * 100).toFixed(0) + '%' : '—';
    rows.push(`<div class="history-row">
      <span style="font-weight: 500;">${m}</span>
      <span style="color: var(--text-secondary);">${totalCNY > 0 ? fmtCNY(totalCNY) : '空'}</span>
      <span class="${diffClass}">${diffLabel}</span>
      <span style="color: var(--text-secondary);">储蓄 ${rate}</span>
      <button class="history-load" type="button" data-load="${m}">查看</button>
    </div>`);
  });
  list.innerHTML = rows.join('');
  list.querySelectorAll('[data-load]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      loadMonth(e.target.getAttribute('data-load'));
    });
  });
}

// ============================================
// 导入导出
// ============================================

function exportData() {
  const months = getMonthsTracked();
  const data = {
    exported_at: new Date().toISOString(),
    version: 1,
    months: {}
  };
  months.forEach(m => {
    const d = storageGet('month:' + m);
    if (d) data.months[m] = d;
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `budget-backup-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('已导出备份文件');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.months) throw new Error('格式不对');
      let count = 0;
      Object.keys(data.months).forEach(m => {
        storageSet('month:' + m, data.months[m]);
        addMonthTracked(m);
        count++;
      });
      loadMonth(currentMonth);
      renderHistory();
      showToast(`已导入 ${count} 个月的数据`);
    } catch (err) {
      showToast('导入失败：文件格式不对', true);
    }
  };
  reader.readAsText(file);
}

// ============================================
// 事件绑定
// ============================================

function bindEvents() {
  document.getElementById('sectionsWrap').addEventListener('input', (e) => {
    if (e.target.matches('input[data-item]')) {
      dirty = true;
      updateSaveStatus();
      recalc();
    }
  });

  document.getElementById('sectionsWrap').addEventListener('click', (e) => {
    const fill = e.target.getAttribute('data-fill-section');
    if (fill) {
      const sec = SECTIONS.find(s => s.id === fill);
      sec.items.forEach(item => {
        const inp = document.querySelector(`input[data-item="${item.id}"]`);
        if (inp) inp.value = item.budget;
      });
      dirty = true;
      updateSaveStatus();
      recalc();
    }
  });

  document.getElementById('monthPicker').addEventListener('change', (e) => {
    loadMonth(e.target.value);
  });

  document.getElementById('prevMonth').addEventListener('click', () => {
    const sel = document.getElementById('monthPicker');
    if (sel.selectedIndex > 0) {
      sel.selectedIndex -= 1;
      loadMonth(sel.value);
    }
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    const sel = document.getElementById('monthPicker');
    if (sel.selectedIndex < sel.options.length - 1) {
      sel.selectedIndex += 1;
      loadMonth(sel.value);
    }
  });

  document.getElementById('saveBtn').addEventListener('click', saveMonth);

  // 隐私模式：用 *** 隐藏金额（输入框切换为密码字符）
  const privacyBtn = document.getElementById('privacyBtn');
  function applyPrivacyToInputs(on) {
    document.querySelectorAll('.item-input').forEach(inp => {
      inp.type = on ? 'password' : 'number';
    });
  }
  if (storageGet('privacy_mode')) {
    document.body.classList.add('privacy-mode');
    applyPrivacyToInputs(true);
  }
  privacyBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('privacy-mode');
    storageSet('privacy_mode', on);
    applyPrivacyToInputs(on);
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    if (!confirm('确定清空本月所有输入？')) return;
    document.querySelectorAll('input[data-item]').forEach(inp => inp.value = '');
    document.getElementById('monthNotes').value = '';
    dirty = true;
    updateSaveStatus();
    recalc();
  });

  document.getElementById('fillBudgetBtn').addEventListener('click', () => {
    SECTIONS.forEach(sec => {
      sec.items.forEach(item => {
        const inp = document.querySelector(`input[data-item="${item.id}"]`);
        if (inp && inp.value === '') inp.value = item.budget;
      });
    });
    dirty = true;
    updateSaveStatus();
    recalc();
  });

  document.getElementById('monthNotes').addEventListener('input', () => {
    dirty = true;
    updateSaveStatus();
  });

  // 收入总额可点击编辑
  const sumBudgetEl = document.getElementById('sumBudget');
  sumBudgetEl.addEventListener('focus', () => {
    sumBudgetEl.textContent = String(Math.round(getCurrentIncome()));
    requestAnimationFrame(() => {
      const range = document.createRange();
      range.selectNodeContents(sumBudgetEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
  });
  sumBudgetEl.addEventListener('blur', () => {
    const txt = sumBudgetEl.textContent.replace(/[^\d.]/g, '');
    const n = parseFloat(txt);
    if (!isNaN(n) && n > 0) {
      monthData.income = n;
    } else {
      monthData.income = null;
    }
    dirty = true;
    updateSaveStatus();
    recalc();
  });
  sumBudgetEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sumBudgetEl.blur(); }
    if (e.key === 'Escape') {
      sumBudgetEl.textContent = fmtCNY(getCurrentIncome());
      sumBudgetEl.blur();
    }
  });

  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', (e) => {
    if (e.target.files.length) importData(e.target.files[0]);
    e.target.value = '';
  });

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveMonth();
    }
  });

  // 窗口尺寸变化重绘进度条（重算 viewBox 让吃豆人保持正圆）
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(recalc, 150);
  });
}

// ============================================
// 初始化
// ============================================

function setupBookName() {
  const el = document.getElementById('bookName');
  if (!el) return;
  el.value = storageGet('book_name') || '我的账本';
  el.addEventListener('blur', () => {
    const v = el.value.trim();
    storageSet('book_name', v);
    if (!v) el.value = '我的账本';
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') {
      el.value = storageGet('book_name') || '我的账本';
      el.blur();
    }
  });
}

function init() {
  setupBookName();
  renderSections();
  populateMonthPicker();
  bindEvents();
  let defaultMonth = `${CONFIG.monthRange.start.year}-${String(CONFIG.monthRange.start.month).padStart(2, '0')}`;
  const tracked = getMonthsTracked();
  if (tracked.length) defaultMonth = tracked[tracked.length - 1];
  loadMonth(defaultMonth);
  renderHistory();
}

init();
