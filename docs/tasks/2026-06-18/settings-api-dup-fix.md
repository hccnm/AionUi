# Settings API Duplicate Fix Task

## 目标

修复设置页中已确认的重复接口调用：

- `/settings/capabilities`
  - `GET /api/skills`
  - `GET /api/skills/builtin-auto`
  - `GET /api/skills/paths`
- `/settings/display`
  - `GET /api/extensions/themes`

## 范围

- `src/aionui/renderer/pages/settings/SkillsHubSettings.tsx`
- `src/aionui/renderer/pages/settings/DisplaySettings/CssThemeSettings.tsx`
- 与上述重复请求直接相关的最小共享加载逻辑

## 非目标

- 不调整设置页整体路由结构
- 不顺手重构 `SettingsPageWrapper` / `Tabs` 结构
- 不处理与当前重复请求无关的其他页面

## 假设

- 当前重复主要来自 React 19 开发态严格模式下的 effect 双执行
- 使用模块级共享缓存与 in-flight promise 即可消掉重复请求，同时保持现有行为

## 验证

- 浏览器插件真实接口回归：
  - `/settings/capabilities`
  - `/settings/display`
- `npm run typecheck`
- `npm run build`

## 风险

- Skills Hub 的导入/删除/刷新需要正确失效缓存
- 扩展主题缓存若不刷新，可能让扩展状态变化后的主题列表延迟更新

## 实施结果

- `SkillsHubSettings` 已改为模块级 single-flight + 短时缓存读取
- `CssThemeSettings` 已改为扩展主题 single-flight + 缓存读取
- Skills 导入、删除、手动刷新会显式失效缓存
- Skills 列表增加代际保护，避免旧请求在失效后回写
- 扩展主题缓存会在 `extensions.stateChanged` 时失效并立即重拉
- 扩展主题同步解析缓存会同步清空，避免已移除主题继续参与 CSS 解析

## 验证结果

- `npm run typecheck`：通过
- `npm run build`：通过
- 浏览器真实接口复验：
  - `/settings/capabilities`
    - `GET /api/skills`：`2 -> 1`
    - `GET /api/skills/paths`：`2 -> 1`
    - `GET /api/skills/builtin-auto`：`2 -> 1`
  - `/settings/display`
    - `GET /api/extensions/themes`：`2 -> 1`

## 遗留风险

- 当前只处理已确认的重复请求，不扩展到其他无证据的设置页逻辑调整
- `SkillsHubSettings` 目前使用 `5s` 短时缓存来兼顾去重与跨页新鲜度，若后续要彻底解决跨入口变更广播，仍需统一 skills 变更事件
- 构建仍有既有 chunk size warning，但与本次修复无直接关系
