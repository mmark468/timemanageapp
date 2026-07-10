# 本地资料库技术说明

## 数据流

```text
页面 → useLocalLibrary → localLibraryService → localLibraryDb → IndexedDB
```

IndexedDB 数据库名为 `finished-local-library`，包含四个 store：

- `subjects`：科目元数据。
- `resources`：文件名、分类、大小、时间和收藏状态。
- `files`：真实文件 Blob，以资料 ID 关联。
- `meta`：首次默认科目写入标记。

文件导入与重复替换使用同一事务；事务中断时不会只留下元数据。删除科目会在同一事务中删除其资料记录和 Blob。

## 固定约束

- `ResourceCategory = "paper" | "study_material"`。
- 单文件上限为 200 MB。
- 支持扩展名：PDF、DOC/DOCX、PPT/PPTX、JPG/JPEG、PNG、WEBP、TXT。
- PDF、图片和 TXT 允许内嵌预览；Office 文件交给系统或导出。
- 重复文件目前按文件名、大小和最后修改时间识别，不是内容哈希。

## 浏览器边界

Web 页面不能长期持有任意系统绝对路径，所以导入时复制 Blob。浏览器拒绝持久存储或空间不足时，界面必须保留明确错误；数据库记录存在但 Blob 缺失时不得崩溃。
