# Settings API Duplicate Fix Result

## 变更概览

- `src/aionui/renderer/pages/settings/SkillsHubSettings.tsx`
  - 加入模块级 in-flight promise、`5s` 短时缓存与请求代际保护
  - 导入、删除、刷新时显式失效缓存
- `src/aionui/renderer/pages/settings/DisplaySettings/CssThemeSettings.tsx`
  - 加入扩展主题缓存、共享订阅、in-flight promise 与请求代际保护
  - 监听扩展状态变化并失效后立即重拉
- `src/aionui/renderer/utils/theme/themeCssSync.ts`
  - 增加扩展主题同步缓存清空能力，避免失效后继续解析旧主题

## 请求次数对比

### `/settings/capabilities`

- `GET /api/skills`：`2 -> 1`
- `GET /api/skills/paths`：`2 -> 1`
- `GET /api/skills/builtin-auto`：`2 -> 1`
- `GET /api/extensions/settings-tabs`：维持 `1`
- `POST /api/extensions/i18n`：维持 `1`

### `/settings/display`

- `GET /api/extensions/themes`：`2 -> 1`

### 对照页

- `/settings/model`
  - `GET /api/providers`：`1`
- `/settings/system`
  - `GET /api/system/info`：`1`

## 验证

- `npm run typecheck`：通过
- `npm run build`：通过
- Playwright 真实登录态复验：通过

## 结论

本阶段已消除设置页下已确认的业务接口重复调用，未扩大改动范围，现有功能保持不变。

## 后续优先级

- `src/aionui/renderer/hooks/mcp/useMcpServers.ts`
  - MCP catalog 初始化链路仍缺少 single-flight，且有并发重复导入风险
- `src/aionui/renderer/components/settings/SettingsModal/contents/channels/ChannelModalContent.tsx`
  - Channels 页当前仍可能形成成簇首屏读请求，收益高于继续做零散低频点
