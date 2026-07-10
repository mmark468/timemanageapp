# Change Log

本文件作为阶段性 change 文档入口，重点说明当前存档相对上一次存档发生了什么。日常小改不需要立即创建新分支；在开发者提示汇总对话、阶段性总结更改或准备交接时，再创建或更新当前存档对应的 change 文档。

## 记录规则

- 每次修改都要记住并保留要点，但不要因为每一个小改就创建新分支。
- 阶段性汇总时，为当前存档创建新的 change 文档；只有需要保留阶段快照时，再创建日期或编号存档分支。
- change 文档顶部先写给人看的变更 list；每条 50 字内说清具体改了什么，例如修复 bug、调整 UI 设计、新增搜题功能。
- 变更 list 下方再补充细节，包括涉及页面 / 模块、关键文件、验证结果、未完成事项，以及相对上一次存档的变化。
- README 只放长期有价值的项目说明；临时测试、分享、部署发布和平台后台配置流程不要写进 README。

## 2026-07-10 · local-resource-library

- 当前存档：完成可持久使用的本地资料库，并整理部署与项目文档结构。
- 变更摘要：
  - 新增 IndexedDB 科目、资料元数据和文件 Blob 存储。
  - 资料分类固定为“卷子 / 学习资料”。
  - 新增批量导入、重复处理、搜索、排序、收藏、移动、重命名、删除、分享、导出和预览。
  - 新增资料库首页、科目详情双标签页和文件预览页。
  - 修复手机端横向溢出和弹窗点击穿透。
  - 改进相对资源路径、构建类型检查和 Tailwind 重新生成。
  - 新增分层文档与 `docs/internal/` 专业资料目录。
- 验证结果：TypeScript、14 项工具测试、预览构建、手机与桌面浏览器回归均通过。

## 2026-07-07 · question-organization-cleanup

- 当前存档：独立错题大模块移除，错题记录并入搜题页的题目整理。
- 变更摘要：
  - 删除桌面侧边栏中的“错题”入口和独立错题页面路由。
  - 删除资料库首页、科目详情里的错题本入口。
  - 搜题页“试卷归纳”改为“题目整理”，承接试卷状态和错题归纳。
  - 加深试卷学习状态、记录分数开关、学习任务卡片和优先级标签的颜色。
- 关键文件：
  - `src/App.tsx`
  - `src/pages/QuestionSearchPage.tsx`
  - `src/pages/SubjectsPage.tsx`
  - `src/pages/SubjectDetailPage.tsx`
  - `src/components/TaskCard.tsx`
  - `src/types.ts`
- 验证结果：`tsc --noEmit` 通过，`vite build` 通过。

## 2026-07-04 · responsive-webapp-archive

- 当前存档：`main` 保存七月四号响应式 Web App 源码与阶段说明，网站构建已发布到 `gh-pages`。
- 上一次存档：`2026-07-04 · docs-readme-cleanup`，主要是 README 和模块文档整理。
- 变更摘要：
  - 新增通用 AppLayout，手机端保留底部导航，768px 以上切换为桌面侧边栏。
  - 首页桌面端重排为学习工作台，左侧管理任务 / 搜题 / 今日日历，右侧放专注模块。
  - 搜题页恢复科目、年份、月份、卷号选择，并新增试卷状态、答案入口和错题记录。
  - 资料库页从学习进度改为本地文件整理入口，展示文件、真题、答案和待归档数量。
  - 日历页桌面端改为左侧月历、右侧当天时间线，并标注中国假期、考试、特别事项和 DDL。
- 关键文件：
  - `src/components/AppLayout.tsx`
  - `src/pages/TodayPage.tsx`
  - `src/pages/CalendarPage.tsx`
  - `src/pages/QuestionSearchPage.tsx`
  - `src/pages/SubjectsPage.tsx`
  - `src/styles.css`
  - `docs/archives/2026-07-04-responsive-webapp.md`
- 验证结果：
  - `tsc --noEmit` 通过。
  - `vite build` 通过。
  - `scripts/build-preview.mjs` 通过。
- 发布记录：
  - `gh-pages` 发布提交：`5ea0113 mark calendar holidays and exam items`
  - 发布资源版本：`time-planning-preview-20260705-1434`

## 2026-07-04 · docs-readme-cleanup

- 当前存档：`main` 工作区文档整理，尚未创建正式存档分支。
- 上一次存档：当前仓库还没有 Git commit，暂无可比对的历史存档。
- 变更摘要：
  - 重写根目录 README，保留项目定位、网站需求、设计思路、技术栈、已完成功能、结构和协作存档规则。
  - 删除 GitHub README 中“发给别人测试”“微信小程序部署 / AppID 配置”等临时说明。
  - 重写所有模块 README，让它们只保留模块定位、技术结构、已实现能力、边界和变更记录规则。
  - 新增本 `CHANGELOG.md`，作为后续阶段性 change 文档入口。
- 验证结果：本轮只修改 Markdown 文档，未改动应用代码。
