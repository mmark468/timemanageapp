# 时间规划

面向中国国际学生和 A-Level 学生的学习时间管理前端 MVP。当前版本可以作为本地可用的网页 App 试用：个人档案、任务、课表、今日时间轴、放假时间、单元进度、A-Level 搜题记录和番茄钟记录都会保存在浏览器 localStorage。

## 技术栈

- React + Vite
- TypeScript
- Tailwind CSS
- lucide-react
- localStorage 本地保存个人档案、任务、课表、今日时间轴、放假时间、单元进度、搜题记录和番茄钟记录

## 本地运行

如果电脑已经安装 Node.js / npm：

```bash
npm install
npm run dev
```

开发地址通常是 `http://localhost:5173`。

生产构建：

```bash
npm run build
npm run preview
```

如果使用当前项目里自动准备好的本地 Node/npm 环境：

```bash
scripts/dev-local.sh
```

## 微信小程序版

项目里已经新增一套原生微信小程序工程：

```text
wechat-miniprogram/
```

用微信开发者工具选择“导入项目”，项目目录选 `wechat-miniprogram`。正式发布前，把 `wechat-miniprogram/project.config.json` 里的 `appid` 从 `touristappid` 改成你自己的小程序 AppID。

## 发给别人测试

最简单的在线测试方式：

1. 运行 `npm run build`
2. 打开 Netlify Drop：https://app.netlify.com/drop
3. 把 `dist` 文件夹拖进去
4. 把生成的链接发给别人

也可以把整个项目发给技术同学，对方运行：

```bash
npm install
npm run dev
```

注意：这是纯前端本地 MVP，没有账号和云同步。不同测试者的数据会分别存在各自浏览器的 localStorage 中。

## 项目结构

```text
src/
  App.tsx               # 应用状态、页面切换和核心交互
  components/           # 通用 UI 组件
  data/mockData.ts      # 首次打开时使用的示例学科、任务、课表、错题和番茄钟数据
  pages/                # 各产品页面
  types.ts              # 数据结构类型
  utils/                # localStorage 与日期工具
```

## 已实现的 MVP 交互

- 欢迎页进入个人档案设置页，选择姓名、年级、课程体系、考试局和科目
- 首次进入会让用户自己设置每门课的每周次数、星期、开始时间、结束时间和教室
- 5 个固定底部 Tab：今天、日历、科目、课表、搜题
- 今日首页展示考试倒计时、今日安排、今日任务和专注状态
- 学习日历按月查看事项，点击时间块进入独立编辑页
- 添加学习任务后可同步进入学习日历、今日时间轴、学校课表或番茄钟目标
- 学习任务支持添加、完成、编辑、删除和加入番茄钟
- 课表支持学校周/自定义计划、A/B 周、课程总量 List、批量编辑和单节微调
- 今日时间轴按持续时间显示长度，点击事件进入独立编辑页
- 科目卡片进入科目详情，单元进入单元进度详情
- 单元学习进度和刷题进度可由用户手动调整并保存
- 单元可加入番茄钟，专注页会显示当前学习目标
- 番茄钟支持开始、暂停、重置和完成本轮
- A-Level 搜题页支持按科目、Paper、知识点和关键词搜索本地 mock 题库

## MVP 边界

首版没有登录、云同步、支付、AI 计划、真实考试数据库、通知推送或后端服务。所有数据都保存在浏览器本地，便于后续替换成真实 API。
