# 运行项目

## 本地开发

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址。

## 检查与测试

```bash
npm run typecheck
npm test
npm run build
```

- `typecheck`：检查 TypeScript。
- `test`：运行本地资料库基础测试。
- `build`：先检查类型，再生成 `dist/` 部署文件。

## 预览构建结果

```bash
npm run preview
```

资料库文件保存在当前浏览器的 IndexedDB。换浏览器、换域名或清除站点数据后，不会自动带到新环境。
