# CHANGELOG

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
