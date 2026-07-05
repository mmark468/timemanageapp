# 时间规划微信小程序适配稿

这个目录保存时间规划 App 的原生微信小程序适配稿。它用于验证 Web MVP 的核心学习规划体验能否迁移到小程序环境，不承担发布部署说明。

## 模块定位

- 保留学生每天会用到的主路径：今天、日历、科目、课表和 CAIE 9709 数学搜题。
- 使用小程序本地 storage 暂存数据，逻辑上对应 Web 版 localStorage。
- 页面结构尽量贴近 Web MVP，方便后续把同一套产品能力迁移到统一 API 或云端数据层。

## 技术结构

```text
wechat-miniprogram/
  project.config.json
  miniprogram/
    app.json
    app.js
    app.wxss
    data/
    features/
      question-search/
    pages/
      today/
      calendar/
      subjects/
      subject-detail/
      timetable/
      question-search/
    utils/
```

## 已同步功能

- 今日页：学习安排、任务概览和核心入口。
- 日历页：学习日程与考试事项展示。
- 科目页：科目列表、科目详情和单元进度入口。
- 课表页：课程安排查看。
- 搜题页：CAIE Mathematics 9709 本地题库搜索逻辑。

## 设计边界

- 当前小程序目录是产品适配稿，不写测试分发、上线发布或后台配置流程。
- 数据层仍是本地存储，后续可以替换为云开发、自建后端或与 Web 版共用 API。
- 视觉与信息结构应继续跟随根目录 Web MVP 的黑白浅灰、移动端优先方向。

## 变更记录规则

涉及小程序页面、数据结构或搜题逻辑的改动，需要纳入下一次阶段性 change 文档或根目录 [CHANGELOG.md](../CHANGELOG.md)。日常小改不需要立即创建新分支；阶段汇总时先用 50 字内的人话 list 概括变化，再补充细节和相对上一次存档的差异。
