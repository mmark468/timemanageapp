# 时间规划

面向中国国际学生和 A-Level 学生的学习时间管理 MVP。当前版本是本地可用的网页 App，个人档案、任务、课表、今日安排、日历、科目进度、搜题记录和番茄钟记录都会保存在浏览器 `localStorage`。

## 技术栈

- React + Vite
- TypeScript
- Tailwind CSS
- lucide-react
- localStorage 本地数据保存

## 本地运行

```bash
npm install
npm run dev
```

开发地址通常是 `http://localhost:5173`。

生产构建：

```bash
npm run build
npm run preview
```

如果使用项目中准备好的本地 Node/npm 环境：

```bash
scripts/dev-local.sh
```

## 模块化结构

项目按模块化设计拆分，方便后续分别维护前端 UI、搜题程序和后端 database，不需要把所有逻辑混在一个页面里。

```text
docs/
  module-design.md      # 前端 UI / 搜题程序 / 后端 database 的模块边界
src/
  App.tsx               # 应用状态、页面切换和核心交互入口
  components/           # 通用 UI 组件
  data/                 # 初始示例数据
  features/
    questionSearch/     # 搜题模块：题库索引、搜索、图片识别和题目定位
  pages/                # 产品页面
  types.ts              # 共享数据类型
  utils/                # localStorage 与日期工具
backend/
  caie_papers/          # CAIE past-paper 采集、索引、SQLite/FTS 搜索和本地 HTTP API 原型
```

更完整的模块边界见 [`docs/module-design.md`](docs/module-design.md)。

## MVP 已实现

- 首次进入设置个人档案、课程体系、考试局和科目
- 首页整合今日安排、任务截止时间、考试倒计时和番茄钟
- 日历按月查看事项，并支持编辑任务、课程、考试和假期
- 科目页管理单元学习进度和刷题进度
- 课表支持学校周、自定义时间线、A/B 周、批量编辑和单节微调
- 番茄钟支持开始、暂停、重置和完成记录
- 搜题页支持按科目、年份、月份、卷号、Paper、知识点和关键词查找本地题库
- 数学 9709 已接入 2018 年以后的 QP/MS paper-level database 浏览入口

## 当前边界

- 目前没有登录、云同步、支付、通知推送或 AI 自动计划。
- 用户数据默认保存在当前浏览器的 `localStorage`，换设备不会自动同步。
- 搜题模块已预留后端 database 接口；当前数学题库主要是 paper-level QP/MS 索引，逐题深度搜索需要后续继续扩展。

## 协作和存档规则

- 日常小改不需要每次都写新的 `CHANGELOG.md`。
- 当明确要求“存入新分支”“存档”“发布新版本”时，再检查当前 diff，总结该存档点的修改，并写入新的 change 记录。
- 较大改动先保留在单独分支或预览路径，确认后再合并到主版本。
