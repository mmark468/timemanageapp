# 项目结构

```text
src/
  components/                 通用界面组件
  pages/                      页面级组件
  features/
    localLibrary/             本地资料库完整领域模块
    questionSearch/           搜题与本地题库模块
  data/                       首次体验用数据
  utils/                      通用存储与日期工具
  App.tsx                     页面路由和应用级状态
backend/caie_papers/          可选的 Python 题库索引实验
content/cie-math/             本地题库清单与内容说明
wechat-miniprogram/           微信小程序适配稿
scripts/                      构建、导出和内容脚本
docs/                         分层项目文档
dist/                         构建产物，不手工修改
```

## 结构原则

- 页面只负责交互与布局，文件和数据库逻辑放在 `features/localLibrary/`。
- 通用视觉组件放在 `components/`，避免页面互相复制。
- Web App 可独立部署；Python 后端是题库实验，不是本地资料库的必需项。
- `dist/`、`share/` 和数据库文件属于产物，不进入源码维护流程。

专业细节见 [内部技术说明](../internal/README.md)。
