# Finished 微信小程序版

这个目录是一套可导入微信开发者工具的原生小程序工程。

## 预览

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择 `wechat-miniprogram`。
4. AppID 先用测试号，正式发布时把 `project.config.json` 里的 `appid` 改成你的小程序 AppID。

## 结构

```text
wechat-miniprogram/
  project.config.json
  miniprogram/
    app.json
    app.js
    app.wxss
    data/
    features/
    pages/
    utils/
```

当前小程序版保留了网页 MVP 的核心：今天、日历、科目、课表、CAIE 9709 数学搜题。数据先保存在微信小程序本地 storage，后续可以替换成云开发或自己的后端 API。
