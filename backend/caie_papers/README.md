# CAIE Past-Paper 后端实验

这个模块保存 CAIE past-paper 元数据、PDF 文本索引、页面索引、SQLite FTS 搜索和 OCR 搜索的后端实验。它服务于时间规划 App 的长期搜题能力，用来验证真实试卷资料如何被整理成可搜索的数据层。

## 范围

- 数据来源：Cambridge International 公开 subject pages 中可访问的 past-paper 资源。
- 默认年份：2018 年及以后。
- 配置科目：Chinese、Mathematics、English、Economics、Physics、Chemistry、Computer Science、Biology、Business。
- 资格体系：IGCSE 与 AS / A Level 中已配置的公开资源。
- 边界说明：公开页面只是可访问资源子集；完整学校资源通常需要授权渠道。

## 数据模型

关系型数据保持 3NF 拆分：

- `exam_boards`、`qualifications`、`subjects`、`syllabuses`
- `exam_series`、`paper_components`、`document_kinds`
- `paper_documents`、`document_pages`、`questions`
- `search_chunks` 与 `search_chunks_fts`

`paper_documents.source_url` 保存公开来源 URL，`local_path` 指向本地 PDF。索引层负责把 PDF 文本、页面和题目信息转换成可搜索 chunk。

## CLI 能力

- 初始化 SQLite schema。
- 抓取公开 Cambridge subject page 元数据。
- 下载待处理 PDF。
- 索引 PDF 文本和页面。
- 执行本地 FTS 搜索。
- 启动本地 HTTP API。
- 对本地题目图片执行 OCR 搜索。

## OCR 搜索

- 优先使用 Tesseract 识别本地题目图片。
- 如果环境没有 Tesseract，可通过 `CAIE_TESSERACT` 指向本机二进制。
- PDF 文本索引优先依赖 `pdfplumber`；页面 PNG 渲染可使用 `pdftoppm`。
- OCR 结果会进入搜索管线，与文本索引、题号、paper code 和页面信息一起参与匹配。

## HTTP API

- `GET /health`
- `GET /api/search?q=...&limit=10`
- `POST /api/search/ocr`

搜索结果包含 `image_path`、`question_number`、`paper_number`、`paper_code`、`document_url` 和 `local_pdf_path`，用于前端定位题目来源。

## 变更记录规则

任何影响 schema、抓取范围、索引策略、OCR 搜索或 API 返回结构的修改，都需要纳入下一次阶段性 change 文档或根目录 [CHANGELOG.md](../../CHANGELOG.md)。日常小改不需要立即创建新分支；阶段汇总时先用 50 字内的人话 list 概括变化，再补充细节和相对上一次存档的差异。
