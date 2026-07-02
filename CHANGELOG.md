# CHANGELOG

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
