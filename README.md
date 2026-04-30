# 月度预算记账工具 · Monthly Budget Tracker

一个本地运行的个人预算对照记账工具，专为**港币收入 + 深圳生活**的跨境场景设计。

## 特性

- 📊 多币种预算（RMB + HKD）自动换算
- 🎯 每月对照填写，实时计算差额和储蓄率
- 💾 数据保存在浏览器 localStorage，无需服务器
- 🌓 自动适配浅色/暗色模式
- 📱 响应式设计，手机也能用
- 📦 单文件 HTML（发布版），零外部依赖
- 💑 专门的婚礼基金追踪池

## 快速开始

### 直接使用（最简单）

双击 `dist/budget-tracker.html` 在浏览器打开即可。

### 本地开发

项目无构建步骤，直接启动本地服务器即可：

```bash
# 用 Python（推荐）
python3 -m http.server 8080

# 或 Node.js
npx serve .
```

然后访问 http://localhost:8080/src/

## 项目结构

```
budget-tracker/
├── README.md              项目说明（本文件）
├── dist/
│   └── budget-tracker.html    单文件发布版（可直接双击打开）
├── src/
│   ├── index.html         开发版入口
│   ├── styles.css         样式
│   ├── config.js          预算配置（修改这里改预算数字）
│   └── app.js             应用逻辑
├── docs/
│   ├── DESIGN.md          设计决策记录
│   └── ROADMAP.md         功能规划
└── build.sh               构建脚本：把 src/ 打包成单文件到 dist/
```

## 常见修改场景

### 改预算数字

编辑 `src/config.js` 里的 `SECTIONS` 数组。

### 改汇率

编辑 `src/config.js` 里的 `RATE` 常量。

### 加新分类

在 `src/config.js` 的 `SECTIONS` 里加一个对象即可。

### 改样式

编辑 `src/styles.css`，CSS 变量在顶部 `:root` 里。

### 发布新版本

```bash
./build.sh
```

会生成 `dist/budget-tracker.html`，把这个文件放到任何地方都能用。

## 技术栈

- **前端**: 纯 HTML/CSS/JS，零框架
- **存储**: 浏览器 localStorage
- **字体**: 系统默认（-apple-system, PingFang SC, Microsoft YaHei）

## 数据备份

工具内置「导出备份」和「导入备份」功能，可将所有月份数据导出为 JSON 文件。

建议每季度导出一次，放到云盘（iCloud / Dropbox / OneDrive）备份。

## License

个人项目，自用。
