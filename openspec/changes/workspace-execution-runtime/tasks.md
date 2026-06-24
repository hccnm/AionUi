## 1. Runtime API 层

- [x] 1.1 新增 Workspace 文件 API 方法，覆盖 list、read、write、mkdir、rename、delete 和 upload。
- [x] 1.2 新增终端创建 API 方法。
- [x] 1.3 新增 execution API 方法，覆盖 create、list、detail、cancel、redeploy 和 approve-retry。
- [x] 1.4 新增 artifact list 和 download helper。
- [x] 1.5 为 runtime API 增加统一 envelope 解析。

## 2. WebSocket Events

- [x] 2.1 定义 status、logs、artifacts、preview 和 approval states 的 typed execution event model。
- [x] 2.2 新增 execution WebSocket 订阅和清理逻辑。
- [x] 2.3 增加断线重连和遗漏事件 fallback 状态处理。

## 3. 文件与终端 UI

- [x] 3.1 将文件树操作迁移到 `workspace_id` 和 relative path。
- [x] 3.2 将文件编辑器读写迁移到 content API 和 `base_version`。
- [x] 3.3 新增基于 Workspace API 的上传和文件操作流程。
- [x] 3.4 新增基于 Workspace terminal API 的终端启动流程。

## 4. Execution UI

- [x] 4.1 实现 execution 列表和详情视图。
- [x] 4.2 实现 TestRun 创建流程。
- [x] 4.3 实现 PreviewEnv 创建、cancel 和 redeploy 流程。
- [x] 4.4 实现 artifact list/download UI。
- [x] 4.5 实现 AI retry 和 human approval 控制。

## 5. 安全与验证

- [x] 5.1 审计 runtime UI，确认不泄漏内部路径和基础设施标识。
- [x] 5.2 增加 execution event handling 和状态更新测试。
- [x] 5.3 增加文件写入冲突处理测试。
- [x] 5.4 运行 typecheck 和 runtime 相关定向测试。
