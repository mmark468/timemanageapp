# 时间规划模块设计

本文按三层梳理 `time-planning-app` 当前代码：前端 UI、中间搜题程序、后端 database。目标是让页面展示、题目检索算法、题库持久化三者边界清楚，后续接真实 API 或扩展题库时不互相缠绕。

## 1. 总体分层

```text
用户
  -> 前端 UI 层
       React Web / 微信小程序
       负责页面、交互、状态展示、本地用户数据缓存
  -> 中间搜题程序层
       OCR、题号解析、关键词拆分、相似题打分、结果 DTO 转换
       当前有浏览器本地版本，也有后端搜索服务版本
  -> 后端 database 层
       CAIE 官方资源采集、PDF 下载、页面/题目索引、SQLite + FTS5 检索
```

当前状态：

- Web 前端仍以 `localStorage` 和本地 seed 题库为主。
- 微信小程序版复用了本地题库搜索思路。
- `backend/caie_papers` 已经有独立 Python + SQLite 后端，但 Web UI 还没有调用 `/api/search`。
- 本地 SQLite 已存在于 `content/cambridge-past-papers/caie_papers.sqlite3`，当前约有 384 个 paper 文档、2590 个页面、4876 道切分题目、7466 个搜索 chunk。

## 2. 前端 UI 层

### 2.1 React Web UI

主要目录：

```text
src/
  App.tsx
  pages/
  components/
  types.ts
  utils/storage.ts
  data/mockData.ts
  styles.css
```

职责：

- 渲染移动端优先的学习规划 App。
- 管理路由、页面切换、底部导航和 toast。
- 管理用户可见状态：个人档案、任务、课表、日历、科目、单元、番茄钟、搜题最近记录。
- 调用搜题程序层，不直接写题库、不直接读 SQLite。

关键文件：

| 文件 | 作用 |
| --- | --- |
| `src/App.tsx` | 应用总入口。负责路由、聚合状态、localStorage 持久化、页面 props 下发。 |
| `src/pages/TodayPage.tsx` | 今天首页，展示倒计时、安排、任务、专注入口和搜题入口。 |
| `src/pages/CalendarPage.tsx` | 学习日历，整合任务、课表、考试、假期。 |
| `src/pages/TimetablePage.tsx` / `SetupTimetablePage.tsx` | 课表设置和课表管理。 |
| `src/pages/SubjectsPage.tsx` / `SubjectDetailPage.tsx` / `UnitDetailPage.tsx` | 科目、单元、进度管理。 |
| `src/pages/QuestionSearchPage.tsx` | 搜题页面，只负责上传图片、OCR 状态、筛选、结果展示。 |
| `src/pages/FocusPage.tsx` | 番茄钟专注。 |
| `src/components/` | 通用 UI：底部导航、卡片、进度、页面头部等。 |
| `src/types.ts` | 前端学习计划领域模型。 |
| `src/utils/storage.ts` | `localStorage` 读写封装。 |
| `src/data/mockData.ts` | 首次进入和本地 MVP 使用的种子数据。 |

前端本地数据：

| storage key | 数据 |
| --- | --- |
| `finished.profile` | 学生档案 |
| `finished.onboarded` | 是否完成课表设置 |
| `finished.tasks` | 学习任务 |
| `finished.timetable` | 学校课表 |
| `finished.timeline` | 今日时间轴 |
| `finished.holidays` | 假期 |
| `finished.unitProgress` | 单元学习/刷题进度 |
| `finished.customSubjects` / `finished.customUnits` | 用户自定义科目和单元 |
| `finished.subjectOverrides` | 考试时间、科目进度等覆盖值 |
| `finished.pomodoros` / `finished.focusTarget` / `finished.focusSettings` | 番茄钟记录、当前目标和设置 |
| `finished.questionSearch.recent` | 最近搜题关键词 |

边界：

- 前端 UI 可以保存用户个人计划数据。
- 前端 UI 不应该负责维护完整 CAIE 题库。
- 前端 UI 不应该直接打开 `caie_papers.sqlite3`。
- 接真实后端后，`QuestionSearchPage` 应通过搜题服务适配器调用 API。

### 2.2 微信小程序 UI

主要目录：

```text
wechat-miniprogram/miniprogram/
  app.js
  app.json
  app.wxss
  pages/
  data/
  features/question-search/
  utils/
```

职责：

- 提供微信原生页面：今天、日历、科目、课表、搜题。
- 用微信本地 storage 保存 MVP 数据。
- 当前搜题页使用小程序内置 seed 题库和关键词匹配。

边界：

- 小程序 UI 与 React UI 同属前端层。
- 小程序如果接后端，需要新增 `wx.request` 或上传图片 API 适配器。
- 目前后端 OCR 接口接受本机 `image_path`，不适合直接给小程序线上使用；线上版需要文件上传接口或云存储 URL。

## 3. 中间搜题程序层

搜题程序层负责把“图片/文字/卷号线索”变成“可展示的题目结果”。它不负责页面布局，也不负责数据库 schema。

### 3.1 浏览器本地搜题程序

主要目录：

```text
src/features/questionSearch/
  README.md
  types.ts
  cieMathQuestionBank.ts
  textTools.ts
  imageFingerprint.ts
  ocrEngine.ts
  questionSearchEngine.ts
  questionLocator.ts
```

职责拆分：

| 文件 | 作用 |
| --- | --- |
| `types.ts` | 搜题题目、OCR、定位结果、搜索请求/结果类型。 |
| `cieMathQuestionBank.ts` | 当前 Web 端 CAIE Mathematics 9709 seed 题库。 |
| `textTools.ts` | 文本标准化、关键词拆分、`9709/12/M/J/24 Q3` 这类 paper reference 解析。 |
| `imageFingerprint.ts` | 图片 hash，用于 OCR 失败时的近似匹配兜底。 |
| `ocrEngine.ts` | 浏览器内 OCR，返回文本、置信度、逐行结果和预处理预览。 |
| `questionSearchEngine.ts` | 搜题打分、筛选、排序。支持 `local-seed` 与未来 `remote-database` 数据源概念。 |
| `questionLocator.ts` | 题目定位编排：OCR/手输文本 -> paper refs -> 候选题 -> 最可能命中。 |

Web 当前搜题流程：

```text
QuestionSearchPage
  -> 用户输入关键词或上传图片
  -> createImageFingerprint(file)
  -> locateQuestionFromImage(file)
       -> recognizeImageText(file)
       -> locateQuestionFromText(ocrText)
            -> extractPaperReferences(text)
            -> searchCieMathQuestions(request)
  -> 展示 located / candidates / results
  -> 保存 recent searches 到 localStorage
```

当前搜索信号：

- 用户关键词。
- 上传图片文件名。
- 浏览器 OCR 文本。
- 图片指纹。
- paper code、component、series、year、question number。
- component group：`all`、`pure`、`mechanics`、`statistics`。

当前打分逻辑：

- 关键词命中题目搜索文本加分。
- 完整关键词命中加分。
- `9709`、component、年份、考试季、题号命中加分。
- 图片 hash 距离越近分越高。
- 按分数降序输出结果。

### 3.2 微信小程序本地搜题程序

主要目录：

```text
wechat-miniprogram/miniprogram/features/question-search/
  cie-math-question-bank.js
  question-search-engine.js
  text-tools.js
```

职责：

- 复刻 Web 的轻量关键词解析和 seed 题库搜索。
- 支持 `all`、`pure`、`mechanics`、`statistics` 筛选。
- 暂未集成 OCR，也暂未调用后端 API。

### 3.3 后端搜题服务程序

主要目录：

```text
backend/caie_papers/
  api.py
  search.py
  ocr.py
  catalog.py
  cli.py
```

职责：

- `api.py`：HTTP API，对前端提供搜索能力。
- `search.py`：SQLite FTS5 搜索、LIKE 兜底、OCR job 搜索记录。
- `ocr.py`：PDF 文本抽取、PDF 页面渲染、Tesseract OCR。
- `catalog.py`：输出科目/大纲目录，供前端做筛选。
- `cli.py`：本地命令入口，便于初始化、下载、索引、搜索、启动服务。

现有 HTTP API：

| API | 作用 |
| --- | --- |
| `GET /health` | 健康检查 |
| `GET /api/search?q=...&limit=10` | 文本搜索已索引题库 |
| `GET /api/catalog/subjects` | 获取科目和 syllabus catalog |
| `POST /api/search/ocr` | 对本机图片路径 OCR 后搜索 |

当前 `POST /api/search/ocr` 请求体：

```json
{
  "image_path": "/absolute/path/to/question.png",
  "languages": "eng+chi_sim",
  "limit": 10
}
```

前端接入建议：

- 新增 `src/features/questionSearch/questionSearchApi.ts`。
- 用 `VITE_CAIE_API_BASE_URL` 控制是否调用远程后端。
- 后端可用时优先走 `/api/search`，不可用时回退本地 seed 搜索。
- Web 图片搜题如果要走后端，需要新增 multipart upload 接口；现在的 `image_path` 只适合本机 CLI 或本地调试。

推荐前端适配器接口：

```ts
export interface QuestionSearchGateway {
  searchText(request: {
    query: string;
    syllabusCode?: string;
    componentCode?: string;
    limit?: number;
  }): Promise<QuestionSearchResult[]>;

  searchImage?(request: {
    file: File;
    languages?: string;
    limit?: number;
  }): Promise<QuestionSearchResult[]>;
}
```

## 4. 后端 database 层

后端 database 层由 `backend/caie_papers/schema.sql` 和 `content/cambridge-past-papers/caie_papers.sqlite3` 承担。

主要目录：

```text
backend/caie_papers/
  schema.sql
  config.py
  db.py
  models.py
  parsers.py
  downloader.py
  indexer.py
  search.py
  api.py
  cli.py

content/cambridge-past-papers/
  caie_papers.sqlite3
  raw/
  page-images/
```

### 4.1 数据表分组

基础字典表：

| 表 | 作用 |
| --- | --- |
| `exam_boards` | 考试局，例如 CAIE |
| `qualifications` | 资格体系，例如 IGCSE、AS_A_LEVEL |
| `subjects` | 科目主表 |
| `subject_aliases` | 中英文别名，用于搜索和展示 |
| `syllabuses` | 大纲，例如 9709、9708、9618 |
| `document_kinds` | 文档类型，例如 question paper、mark scheme |
| `exam_series` | 年份和考试季 |
| `paper_components` | paper/component，例如 11、21、31 |

资源采集表：

| 表 | 作用 |
| --- | --- |
| `ingestion_batches` | 一次官方资源采集任务 |
| `paper_documents` | 官方 PDF 文档元数据、来源 URL、本地路径、校验值 |

索引内容表：

| 表 | 作用 |
| --- | --- |
| `document_pages` | PDF 每页文本和渲染图片路径 |
| `questions` | 从页面文本中切出的题目 |
| `search_chunks` | 可搜索文本块，分 page 和 question |
| `search_chunks_fts` | SQLite FTS5 全文索引 |

OCR 搜索审计表：

| 表 | 作用 |
| --- | --- |
| `ocr_search_jobs` | 一次图片 OCR 搜索任务 |
| `ocr_search_matches` | OCR 搜索命中的 chunk 排名和分数 |

### 4.2 后端数据流

官方资源采集：

```text
config.SYLLABUS_SOURCES
  -> downloader.discover_official_resources()
  -> parsers.extract_pdf_resources()
  -> db.upsert_*()
  -> paper_documents / exam_series / paper_components
```

PDF 下载：

```text
paper_documents.source_url
  -> downloader.download_pending_documents()
  -> content/cambridge-past-papers/raw/...
  -> paper_documents.local_path / checksum / file_size
```

PDF 索引：

```text
paper_documents.local_path
  -> indexer.index_downloaded_documents()
       -> ocr.extract_pdf_pages_text()
       -> ocr.render_pdf_pages()
       -> indexer.split_questions_from_page_text()
  -> document_pages
  -> questions
  -> search_chunks
  -> search_chunks_fts
```

文本搜索：

```text
GET /api/search?q=...
  -> search.search_text()
       -> search_fts()
       -> search_like() fallback
  -> SearchResult.to_dict()
  -> 前端结果卡片
```

OCR 搜索：

```text
POST /api/search/ocr
  -> search.search_image_ocr_with_job()
       -> create_ocr_search_job()
       -> ocr.ocr_image()
       -> search_text()
       -> record_ocr_search_matches()
       -> complete_ocr_search_job()
  -> OCR 文本 + 搜索结果
```

### 4.3 后端命令

`package.json` 已封装：

```bash
npm run caie:init-db
npm run caie:fetch-official
npm run caie:download-pending
npm run caie:index-pdfs
npm run caie:search -- "stationary point trigonometric"
npm run caie:serve
```

直接 Python 命令：

```bash
python3 -m backend.caie_papers.cli init-db
python3 -m backend.caie_papers.cli fetch-official --dry-run
python3 -m backend.caie_papers.cli download-pending
python3 -m backend.caie_papers.cli index-pdfs
python3 -m backend.caie_papers.cli serve --port 8765
```

## 5. 推荐目标边界

### 5.1 前端 UI 只做三件事

- 收集输入：文字、图片、筛选条件、用户学习计划。
- 展示输出：候选题、答案摘要、paper 信息、PDF 链接、OCR 状态。
- 保存用户个人数据：计划、课表、进度、最近搜索。

### 5.2 搜题程序做转换和匹配

- 输入清洗：OCR 文本、文件名、手输题号。
- 线索解析：syllabus、component、series、year、question number。
- 搜索策略：本地 seed、后端 FTS、OCR 搜索、图片 hash 兜底。
- 结果归一化：把后端 `SearchResult` 转成 UI 可用 `QuestionSearchResult`。

### 5.3 Database 只通过 API 暴露

- SQLite、PDF、page image 都留在后端。
- 前端不读取数据库文件。
- API 返回稳定 JSON，避免 UI 被 schema 变化影响。
- 后端记录 OCR job 和 match，便于后续改进召回率。

## 6. 下一步拆分建议

优先级 1：接通 Web 搜题 API。

- 新建 `src/features/questionSearch/questionSearchApi.ts`。
- `QuestionSearchPage` 保持 UI 不变，只把 `searchCieMathQuestions` 调用替换为 gateway。
- 设置后端地址，例如 `VITE_CAIE_API_BASE_URL=http://127.0.0.1:8765`。
- 后端不可用时自动回退 `localCieMathQuestionSource`。

优先级 2：升级图片搜题后端协议。

- 新增 `POST /api/search/ocr-upload`。
- 支持 `multipart/form-data` 文件上传。
- 后端保存临时图片，运行 OCR，返回统一结果。
- Web 和小程序都调用同一套线上接口。

优先级 3：统一题目结果 DTO。

- 前端 `CieMathQuestion` 是 seed 题库模型。
- 后端 `SearchResult` 是数据库检索模型。
- 需要一个中间 `QuestionResultDTO`，字段包含：
  - `id`
  - `score`
  - `subjectName`
  - `syllabusCode`
  - `paperCode`
  - `questionNumber`
  - `title`
  - `matchedText`
  - `imagePath`
  - `documentUrl`
  - `localPdfPath`

优先级 4：把用户学习数据后端化。

- 新增用户账号后，再把 `finished.*` localStorage key 迁移到后端。
- 在此之前，学习计划数据和 CAIE 题库数据应继续分开，不要混在同一个 SQLite schema 里。
