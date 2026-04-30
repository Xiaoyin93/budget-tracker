# Claude Code 项目上下文

这个文件给 Claude Code 看，帮助 AI 助手快速理解项目背景和约定。

## 项目背景

个人用的月度预算记账工具。用户是**港币收入（HK$30,000/月）、深圳生活、人民币开销**的跨境场景，计划 2027 年上半年结婚。

## 核心约定

### 不要做的事

- **不要引入框架**（React/Vue/Svelte 等）。这是刻意的选择，保持零依赖、单文件可分发。
- **不要加后端**。所有数据存浏览器 localStorage，用户通过导出/导入 JSON 做跨设备迁移。
- **不要用 CDN 外部依赖**。目标是下载下来就能跑，断网也能用。
- **不要改存储 key 前缀** `budget_tracker:`，会导致老数据丢失。
- **不要把配置值写进业务逻辑里**。所有数字、分类都在 `src/config.js`。

### 要做的事

- **中文界面**，用户是中文母语者
- **数字显示必须 `Math.round()`**，避免浮点数尾巴
- **金额用 `toLocaleString('en-US')`** 保证千分位
- **HKD 和 CNY 要分清楚**，每个 item 都有 `cur` 字段
- **保持设计克制**：无渐变、无阴影、圆角 8px/12px 为主
- **暗色模式必须可用**，改色时检查 `@media (prefers-color-scheme: dark)`

## 架构

```
src/config.js   →  预算配置（纯数据，改预算改这里）
src/app.js      →  业务逻辑（渲染、计算、存储、事件）
src/styles.css  →  样式（CSS 变量在顶部）
src/index.html  →  开发版入口，import config.js / app.js
dist/budget-tracker.html  →  发布版（build.sh 生成的单文件版）
build.sh        →  把 src/ 打包成 dist/ 单文件的脚本
```

### 数据模型

localStorage 里三类 key（都带 `budget_tracker:` 前缀）：

```javascript
'budget_tracker:months_tracked'  // Array<string>，形如 ["2026-06", "2026-07"]
'budget_tracker:month:2026-06'   // { actuals: {id: number}, notes: string, saved_at: ISO date }
```

## 开发流程

1. 改代码在 `src/` 下编辑
2. 本地测试：`python3 -m http.server 8080` 访问 `http://localhost:8080/src/`
3. 发布：`./build.sh` 会重新生成 `dist/budget-tracker.html`

## 常见修改任务

### 改预算数字或汇率
→ 只改 `src/config.js`，然后 `./build.sh`

### 加新的支出类别
→ 在 `src/config.js` 的 `SECTIONS` 对应分组里加一个 item：
```javascript
{ id: '唯一id', name: '显示名', budget: 数字, cur: 'CNY' 或 'HKD' }
```

### 加新的顶层分组
→ `src/config.js` 里在 `SECTIONS` 数组加一个新对象。如果是新的储蓄类型（要计入储蓄率），注意 `src/app.js` 里 `recalc()` 函数目前只识别 `sec.id === 'savings'`，可能要扩展这个判断。

### 改配色
→ 改 `src/styles.css` 顶部 `:root` 里的 CSS 变量。深色模式在下方的 `@media` 块里。

### 加图表 / 年度总结等新页面
→ 考虑多页面还是 tab 切换。如果加 tab，参考 `section-actions` 的按钮样式，保持视觉一致。

## 已知限制 / TODO

- 汇率写死在 `config.js`，不能按月记录历史汇率
- 没有图表可视化（柱状图/趋势图）
- 婚礼基金达标后没自动提示转用途
- 历史记录列表超过 12 个月后可能需要分页或折叠
