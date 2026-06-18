# Settings API Duplicate Fix Spec

## 背景

设置页真实接口审计确认两处稳定重复请求：

- `/settings/capabilities` 首屏会重复拉取 skills 相关 3 个接口
- `/settings/display` 首屏会重复拉取扩展主题接口

两处都属于 SaaS Web 设置链路中的直接性能损耗，会增加首屏等待和后端噪声。

## 目标

在不改变现有设置页功能和交互的前提下，把已确认的重复业务请求收敛为单次请求。

## 非目标

- 不改设置页路由结构
- 不重构 `SettingsPageWrapper`
- 不处理未被真实审计证实的其他页面
- 不引入新的全局状态管理方案

## 设计约束

- 仅做与重复请求直接相关的最小改动
- 保持已有页面行为和现有 IPC 调用契约不变
- 必须兼容开发态严格模式下的 effect 双执行
- 用户主动刷新或数据源变化后必须可失效缓存

## 方案

### SkillsHubSettings

- 增加模块级 in-flight 合并与短时缓存对象
- 增加模块级 in-flight promise，合并并发首屏加载
- 首屏与重复挂载优先复用同一批请求结果
- 通过短时缓存避免跨页面长期持有旧 skills 列表
- 对失效后的旧响应增加代际保护，避免旧数据回写
- 在导入、删除、手动刷新时显式清空缓存后重拉

### CssThemeSettings

- 对扩展主题接口增加模块级缓存与 in-flight promise
- 首屏重复挂载共用同一请求结果
- 监听 `extensions.stateChanged` 事件并在变更时失效缓存、立即重拉
- 对失效前飞行中的请求增加代际保护，避免旧数据回写
- 保持现有封面 URL 归一化和主题缓存同步逻辑

## 验收标准

- `/settings/capabilities` 的以下请求均为单次：
  - `GET /api/skills`
  - `GET /api/skills/paths`
  - `GET /api/skills/builtin-auto`
- `/settings/display` 的 `GET /api/extensions/themes` 为单次
- `npm run typecheck` 通过
- `npm run build` 通过
- 设置页关键路由可正常打开
