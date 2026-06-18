# Settings API Duplicate Audit

## 目的

继续用真实接口审计设置页各子页首屏请求，确认是否还有明显重复调用。

## 环境

- 日期：2026-06-18
- 前端入口：`http://127.0.0.1:5173`
- 后端：`http://192.168.63.178:25808`
- 登录：`admin / admin12345678`
- 说明：浏览器插件实测；`4173`/`5173` 均已指向真实后端代理，本轮以 `5173` 为主做页面审计

## 路由与分组说明

根据设置侧栏实现与浏览器实测：

- 实际内置设置页路由：
  - `/settings/agent`
  - `/settings/model`
  - `/settings/assistants`
  - `/settings/capabilities`
  - `/settings/display`
  - `/settings/system`
  - `/settings/about`
- `应用`、`其他` 为分组标题，不是独立路由页
- `webui`、`pet` 已重定向到 `system` 或在 Web 下隐藏

## 采样方法

- 从已登录的 `/guid` 新开标签页进入设置
- 对每个子页记录从点击设置入口到落到目标页这段首屏链路中的 `/api/*` 请求
- 对 `GET/POST + pathname + search` 做计数

## 结果

### `/settings/model`

- `GET /api/extensions/settings-tabs` x1
- `POST /api/extensions/i18n` x1

结论：无明显重复。

### `/settings/capabilities`

- `GET /api/skills` x2
- `GET /api/skills/builtin-auto` x2
- `GET /api/skills/paths` x2
- `GET /api/extensions/settings-tabs` x1
- `POST /api/extensions/i18n` x1

结论：存在稳定重复，重复源集中在 Skills/Capabilities 数据装载链。

### `/settings/display`

- `GET /api/extensions/themes` x2
- `GET /api/extensions/settings-tabs` x1
- `POST /api/extensions/i18n` x1

结论：存在稳定重复，重复源集中在主题列表加载。

### `/settings/system`

- `GET /api/system/info` x1
- `GET /api/extensions/settings-tabs` x1
- `POST /api/extensions/i18n` x1

结论：无明显重复。

### 其他页

增量点击实测中：

- `Agents`：未观察到重复 `/api/*`，仅出现 logo 资源请求
- `助手`：未观察到额外 `/api/*`
- `关于`：未观察到额外 `/api/*`

由于这三页是在已进入设置 shell 后增量切换得到，置信度略低于 fresh-entry 审计，但当前未见高噪声重复调用。

## 当前结论

设置页下仍值得优先处理的重复接口调用有两处：

1. `CapabilitiesSettings`
   - `GET /api/skills`
   - `GET /api/skills/builtin-auto`
   - `GET /api/skills/paths`
   - 均重复 2 次
2. `DisplaySettings`
   - `GET /api/extensions/themes`
   - 重复 2 次

## 后续建议

- 先审 `CapabilitiesSettings` 的 mount 链路、内部 tab 组件与相关 hooks，排查双挂载或并行 hook 读取
- 再审 `DisplaySettings` 的主题列表 hook，优先检查页面 shell 与内容组件是否各自拉取了一次

## 修复后复验

### 复验环境

- 日期：2026-06-18
- 前端入口：`http://127.0.0.1:5173`
- 登录：`admin / admin12345678`
- 方法：Playwright 真实登录态直达目标路由，统计页面加载期间的 `/api/*` 请求

### `/settings/capabilities`

- `GET /api/skills` x1
- `GET /api/skills/paths` x1
- `GET /api/skills/builtin-auto` x1
- `GET /api/extensions/settings-tabs` x1
- `POST /api/extensions/i18n` x1

结论：已从稳定双发收敛为单发。

### `/settings/display`

- `GET /api/extensions/themes` x1

结论：已从稳定双发收敛为单发。

### `/settings/model`

- `GET /api/providers` x1

结论：对照页正常。

### `/settings/system`

- `GET /api/system/info` x1

结论：对照页正常。

## 最终结论

本轮设置页重复请求修复已完成，已确认的 4 组重复业务接口均已降为单次请求。
