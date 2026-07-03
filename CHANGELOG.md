# CHANGELOG

## 2026-07-03 - 完成数学 9709 年份/月分层题库 database

### 本次修改内容

- 搜题页数学题库不再按一个个卷子平铺，改为“年份 -> 考试月份文件夹 -> 卷号 -> QP/MS”的分层浏览。
- 新增数学 9709 公开归档索引生成脚本，从 2018 年以后抓取并配对 Question Paper 和 Mark Scheme。
- 生成并接入数学 9709 paper-level database：23 个考试月份、342 份 QP、342 份 MS，所有条目均已配对。
- 下载题包统计改为显示完整 QP/MS database 数量，并自动迁移旧的 16 题 seed 下载状态。
- 搜索源新增 paper-level 索引，输入卷号、年份、月份、文件名时可在本地命中对应 QP/MS；原有演示细题搜索继续保留。
- 已运行 `npm run build:vite`、`npm run build` 和数据完整性检查，构建成功且缺失 QP/MS 配对数为 0。

### 修改文件

- `src/pages/QuestionSearchPage.tsx`
- `src/features/questionSearch/math9709PaperDatabase.ts`
- `src/features/questionSearch/math9709QuestionSource.ts`
- `src/features/questionSearch/questionArchiveGateway.ts`
- `src/features/questionSearch/questionSearchEngine.ts`
- `src/features/questionSearch/textTools.ts`
- `src/features/questionSearch/README.md`
- `scripts/cie-math/buildPapaCambridge9709Database.mjs`
- `content/cie-math/README.md`
- `package.json`
- `CHANGELOG.md`

### 影响范围

- 页面样式：有影响。数学题库区域改成年份按钮、月份文件夹和卷号列表。
- 数据结构：有影响。新增生成型数学 9709 paper database，并迁移旧本地题包 meta 显示为完整 QP/MS 数量。
- 接口：有影响。`QuestionSearchDataSource.kind` 新增 `bundled-database`，题库 gateway 改为返回 paper-level 搜索源。
- 依赖：无影响，未新增 npm 依赖；`package.json` 仅新增数据库生成脚本命令。

### 潜在风险

- PDF 链接来自公开归档源 PapaCambridge，不是 Cambridge 官方页面直接公开的完整下载列表；若第三方源改版，需要重新运行或修正生成脚本。
- 当前 database 是完整 QP/MS PDF 索引，不是每份 PDF 的逐题 OCR 文本索引；拍照搜具体题目的深度匹配仍依赖现有 seed 细题和后续后端 database。
- 前端 bundle 变大，Vite 提示超过 500KB；目前构建可用，后续可用懒加载拆分题库数据。

### 建议 commit message

```text
feat: add complete math 9709 paper database browser
```

## 2026-07-03 - 合并今日安排并补充数学题库卷号入口

### 本次修改内容

- 首页删除独立“今日任务”区块，将今日任务合并进“今日安排”的时间轴样式里。
- 保留今日安排的时间轴设计，并把任务的截止时间、科目、优先级、级别和完成勾选合并到每条安排中。
- 今日安排标题右侧保留添加任务入口和时间轴入口，让首页更简洁。
- 搜题页选中数学后，下滑可看到清晰的数学题库卷号列表。
- 数学题库按卷号聚合，支持直接点击 `QP` 打开 question paper，点击 `MS` 打开 mark scheme。
- 已运行 `npm run build:vite` 和 `npm run build`，构建与 TypeScript 检查成功。

### 修改文件

- `src/pages/TodayPage.tsx`
- `src/pages/QuestionSearchPage.tsx`
- `CHANGELOG.md`

### 影响范围

- 页面样式：有影响。首页信息布局更紧凑；搜题页新增数学题库卷号卡片。
- 数据结构：无影响，未新增 localStorage key 或领域模型字段。
- 接口：无影响，未修改组件对外 API 或后端接口。
- 依赖：无影响，未修改 `package.json` 或 `package-lock.json`。

### 潜在风险

- 首页不再单独展示旧的任务卡片删除按钮；任务仍可在其它任务/日历相关页面管理。
- 今日安排中无开始时间的任务会以“截止”形式进入时间轴列表，排序在当天具体时间安排之后。
- 数学题库卷号入口仍基于当前 MVP 内置 seed 题库，不代表完整官方全量题库。

### 建议 commit message

```text
feat: merge today tasks into schedule and add math paper library
```

## 2026-07-03 - 搜题页改为科目题包下载后本地搜索

### 本次修改内容

- 将搜题页从单一“数学搜题”改为“选择科目 -> 下载 2018+ 本地题包 -> 本地搜索”的阶段性 MVP 流程。
- 新增题库包 gateway，统一管理科目题包目录、下载状态、本地 meta 和未来 database 数据源适配点。
- 保留原有数学 9709 OCR、关键词、Paper 筛选和答案展示逻辑；下载数学题包后才启用搜索。
- 其它已配置科目显示为 `待接 database`，先保留入口，不伪造未接入的完整题库。
- 更新模块设计文档和搜题模块 README，说明新增边界和后续接 database 的位置。
- 已运行 `npm run build` 和 `npm run build:vite`，构建与 TypeScript 检查成功。

### 修改文件

- `src/pages/QuestionSearchPage.tsx`
- `src/features/questionSearch/questionArchiveGateway.ts`
- `src/features/questionSearch/questionLocator.ts`
- `src/features/questionSearch/README.md`
- `docs/module-design.md`
- `CHANGELOG.md`

### 影响范围

- 页面样式：有影响。搜题页新增科目题包选择、下载状态、下载按钮和未下载禁用态。
- 数据结构：有影响。新增 `finished.questionSearch.archives.v1` localStorage key，用于保存本地题包 meta / manifest。
- 接口：有影响。`locateQuestionFromText` 和 `locateQuestionFromImage` 新增可选 `QuestionSearchDataSource` 参数；新增 `questionArchiveGateway.ts` 作为未来 database / 本地缓存适配接口。
- 依赖：无影响，未修改 `package.json` 或 `package-lock.json`。

### 潜在风险

- 当前只有 CAIE 数学 9709 使用内置 seed 题包，并不等于已经下载完整 2018 年以后官方全量题库。
- 其它科目需要后续把真实 database manifest、IndexedDB 或 Cache Storage 接到 `questionArchiveGateway.ts` 后才能搜索。
- 新增 localStorage key 后，如果用户清理浏览器数据，需要重新点击下载题包。
- GitHub Pages 可能有短缓存，手机端可能需要刷新或等待几分钟才看到新版。

### 建议 commit message

```text
feat: add subject archive flow for local question search
```

## 2026-07-02 - 最终采用 gh-pages 分支发布

### 本次修改内容

- 删除 `.github/workflows/deploy-pages.yml`，避免后续 push 时触发卡住的 Actions Pages 部署。
- 将 GitHub Pages 保持为从远程 `gh-pages` 分支根目录发布。
- 验证 `https://mmark468.github.io/timemanageapp/` 首页、CSS、JS 均返回 200。

### 修改文件

- `.github/workflows/deploy-pages.yml`
- `CHANGELOG.md`

### 影响范围

- 页面样式：无影响。
- 数据结构：无影响。
- 接口：无影响。
- 依赖：无影响。
- 部署：最终发布源为 `gh-pages` 分支，不再依赖 GitHub Actions workflow。

### 潜在风险

- 之后更新网站时，需要重新运行本地 `npm run build` 并把 `dist/` 推送到 `gh-pages` 分支。
- GitHub Pages 可能有短缓存；手机端若看到旧页面，可等待几分钟或刷新。
- GitHub Pages API 仍可能显示早先 legacy build 的 `errored` 状态，但最终验证中首页、CSS、JS 都已返回 200。

### 建议 commit message

```text
ci: use gh-pages branch for site publishing
```

## 2026-07-02 - 改用 GitHub Actions 发布 Pages

### 本次修改内容

- 新增 `.github/workflows/deploy-pages.yml`，用 GitHub Actions 自动安装依赖、运行 `npm run build`，并把 `dist/` 发布到 GitHub Pages。
- 保留已有 `gh-pages` 静态发布分支作为备用，但后续优先用 Actions 部署。

### 修改文件

- `.github/workflows/deploy-pages.yml`
- `CHANGELOG.md`

### 影响范围

- 页面样式：无影响。
- 数据结构：无影响。
- 接口：无影响。
- 依赖：无影响。
- 部署：新增 GitHub Actions 发布流程，会在备份分支 push 后自动构建网站。

### 潜在风险

- GitHub Actions 首次运行需要等待队列和构建完成，期间网站可能短暂 404。
- Actions 使用 `npm ci`，如果 npm registry 或 GitHub Actions 网络波动，部署可能需要重新运行。

### 建议 commit message

```text
ci: deploy app with GitHub Pages workflow
```

## 2026-07-02 - GitHub Pages 已启用

### 本次修改内容

- 按用户确认，将 GitHub 仓库 `mmark468/timemanageapp` 从 private 改为 public。
- 启用 GitHub Pages，并配置为从远程 `gh-pages` 分支根目录发布。
- 网站地址为 `https://mmark468.github.io/timemanageapp/`，首次启用后 GitHub Pages 会先进入 building 状态。

### 修改文件

- `CHANGELOG.md`

### 影响范围

- 页面样式：无影响。
- 数据结构：无影响。
- 接口：无影响。
- 依赖：无影响。
- 仓库设置：仓库已公开，GitHub Pages 已启用。

### 潜在风险

- 仓库公开后，代码内容可以被互联网访问；本项目 `.gitignore` 已排除本地 CAIE PDF cache 和 SQLite 数据库，但源码和已提交文档是公开的。
- GitHub Pages 首次发布需要等待构建完成，刚启用时手机访问可能短暂显示 404。

### 建议 commit message

```text
docs: record GitHub Pages activation
```

## 2026-07-02 - GitHub Pages 发布准备

### 本次修改内容

- 调整 `scripts/build-preview.mjs` 生成的静态资源路径，从 `/assets/...` 改为 `./assets/...`，让构建产物能在 GitHub Pages 项目子路径下正常加载。
- 使用 `npm ci` 安装依赖并运行 `npm run build`，成功生成 `dist/index.html`、CSS 和 JS。
- 已将构建产物推送到 GitHub 远程 `gh-pages` 分支，作为网站发布分支。
- 尝试启用 GitHub Pages 时，GitHub 返回当前账号方案不支持 private repository 的 Pages，因此网站暂未启用。

### 修改文件

- `scripts/build-preview.mjs`
- `CHANGELOG.md`

### 影响范围

- 页面样式：无设计改动，但发布版资源加载路径改为相对路径。
- 数据结构：无影响。
- 接口：无影响。
- 依赖：未修改 `package.json` 或 `package-lock.json`；本地执行了 `npm ci` 安装被 `.gitignore` 忽略的 `node_modules/`。

### 潜在风险

- `npm ci` 提示当前依赖存在 1 个 high severity vulnerability；本次没有自动运行 `npm audit fix`，避免升级依赖造成额外变化。
- GitHub Pages 未启用的原因是仓库为 private 且当前 GitHub plan 不支持 private Pages。若要用 GitHub Pages 手机访问，需要将仓库改为 public，或升级到支持 private Pages 的方案。
- 远程 `gh-pages` 分支已包含可发布的静态文件；一旦仓库支持 Pages，可直接配置 Pages 从 `gh-pages` 分支根目录发布。

### 建议 commit message

```text
build: prepare GitHub Pages deployment
```

## 2026-07-02

### 本次修改内容

- 新增 `docs/module-design.md`，把项目模块清晰拆成前端 UI、中间搜题程序、后端 database 三层。
- 更新 `README.md`，补充模块设计文档入口，并说明仓库里已经包含 CAIE past-paper 后端原型。
- 新增本 `CHANGELOG.md`，用于记录之后每次项目修改的文件、功能影响、风险和建议 commit message。

### 修改文件

- `docs/module-design.md`
- `README.md`
- `CHANGELOG.md`

### 影响范围

- 页面样式：无影响。
- 数据结构：无影响。
- 接口：无影响。
- 依赖：无影响。

### 潜在风险

- 本次只修改文档，没有业务风险。
- GitHub 远程 `main` 与本地 `main` 不同源，不能直接覆盖远程主分支；本次备份应上传到独立备份分支。

### 建议 commit message

```text
docs: document module architecture and changelog workflow
```
