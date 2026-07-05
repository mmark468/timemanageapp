# CIE Math 内容目录

这个目录用于保存 CAIE Mathematics 9709 相关的本地内容索引、资源清单和后续导入工具输出。它是搜题能力的数据入口之一，不放测试分发或部署说明。

## 内容范围

- `raw/9709`：本地保存的 question papers、mark schemes、examiner reports 或 specimen PDFs。
- `database`：由导入工具生成的 manifest、索引清单和前端可消费数据。
- 公开抓取只覆盖 Cambridge International 公开 9709 页面中可访问的 PDF。
- 完整五年或更多年份归档通常需要学校授权资源，或由用户 / 学校提供合法 PDF。

## 数据用途

- 支持 A-Level 搜题 MVP 的题库扩展。
- 为后端 `backend/caie_papers` 的 PDF 索引、页面渲染和题目定位提供内容来源。
- 为未来真实题库 API 提供可迁移的数据目录结构。

## 维护原则

- 内容目录只记录合法来源和索引结构，不写外部分发流程。
- 新增资源后应同步更新 manifest，避免前端或后端读取到过期数据。
- 题库结构变化需要和搜题模块的类型定义保持一致。

## 变更记录规则

任何新增资源范围、manifest 结构或内容索引策略的修改，都需要纳入下一次阶段性 change 文档或根目录 [CHANGELOG.md](../../CHANGELOG.md)。日常小改不需要立即创建新分支；阶段汇总时先用 50 字内的人话 list 概括变化，再补充细节和相对上一次存档的差异。
