# Settings API Duplicate Fix Plan

## 目标

把设置页下已确认的 2 处重复接口调用收敛为单次，同时不改变现有页面行为。

## 范围

- `SkillsHubSettings`
- `CssThemeSettings`

## 风险

- 共享缓存若没有显式失效，会把导入/删除后的本地状态滞后
- 主题扩展列表若缓存粒度过大，扩展热更新后可能短暂不可见

## 步骤

1. 给 `SkillsHubSettings` 增加模块级共享加载与失效逻辑。
   - 验证：`/settings/capabilities` 首屏 3 组 skills 请求均变为 1 次。
2. 给 `CssThemeSettings` 增加扩展主题单飞缓存。
   - 验证：`/settings/display` 的 `GET /api/extensions/themes` 变为 1 次。
3. 重跑类型检查、构建和浏览器回归，并回填 research 文档。
   - 验证：`npm run typecheck`、`npm run build` 通过，浏览器抓包结果更新。
