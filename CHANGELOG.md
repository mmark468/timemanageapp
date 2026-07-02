# CHANGELOG

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
