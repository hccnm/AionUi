# SaaS Web Runtime Optimization Tasks

## 1. Runtime Residue

- [ ] 1.1 盘点 `renderer/main.tsx`、`Layout.tsx`、`vite.config.ts` 中的 Electron / 本地壳层残留
- [ ] 1.2 标记哪些逻辑在 web 中应直接移除，哪些改为 no-op，哪些必须保留
- [ ] 1.3 调整 web 启动链，去掉默认进入的桌面专属副作用
- [ ] 1.4 验证登录、guid、conversation、settings 的基础可用性未回归

## 2. Request Budget

- [ ] 2.1 记录当前首页与设置页关键请求来源
- [ ] 2.2 移除非关键的默认预取或将其延后到具体页面
- [ ] 2.3 为可复用数据补共享缓存或复用已有 SWR key
- [ ] 2.4 对比优化前后的请求数量和首屏阻塞链

## 3. UI Symmetry

- [ ] 3.1 修正侧栏 section header、列表项、分隔线的节奏不一致
- [ ] 3.2 修正设置页分组标题与选中态容器的不对称样式
- [ ] 3.3 对照截图复核 web 展示结果

## 4. Interaction Performance

- [ ] 4.1 排查列表区、侧栏、全局 context 的重复渲染热点
- [ ] 4.2 删除无效副作用并减少无意义状态联动
- [ ] 4.3 运行 typecheck / test / build，记录剩余风险
