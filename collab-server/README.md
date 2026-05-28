# collab-server（Hocuspocus）

基于 [@hocuspocus/server](https://github.com/ueberdosis/hocuspocus) + Redis，与 Gin（`editor/server`）组成「加载 → 协同 → 持久化」闭环。

## 闭环四阶段（与实现对齐）

1. **初始化加载（Load）**  
   首个客户端连接时 Hocuspocus 触发 **`onLoadDocument`**：请求 Gin **`GET /internal/collab/ydoc/:pageId`**（Header：`X-Collab-Internal-Secret`），拉取 `sys_page.ydoc_state` 原始字节，在 Node 侧 **`applyUpdate`** 写入 Y.Doc。

2. **实时协同（Sync & Awareness）**  
   增量经 WebSocket 进入 Hocuspocus；多节点时由 **Redis** 扩展同步文档内容；光标等 **Awareness** 不写库。

3. **异步持久化（Persistence）**  
   Hocuspocus 内置 **`debounce` / `maxDebounce`**，到期调用 **`onStoreDocument`**：对当前文档 **`encodeStateAsUpdate`**，同时在 Node 侧用 **`yXmlFragmentToProsemirrorJSON`** 导出 **`content`（PM JSON）** 与折叠后的 **`content_text`（检索用纯文本）**。再以 Base64 **`ydoc_base64`** 与上述字段一并 **`POST /internal/collab/persist-ydoc`**。Gin Worker **`UPDATE sys_page`**：同时写入 **`ydoc_state`、`content`、`content_text`**（若仅 webhook 收到二进制且无附带 JSON，Worker 会 **`POST`** **`http://<collab-host>:<PORT>/internal/collab/expand-ydoc`**（与 WebSocket **同一端口**，由 **`onRequest`** 处理），密钥 **`X-Collab-Internal-Secret`**）。

**Load 回退**：`GET /internal/collab/ydoc/:pageId` 若 **`ydoc_state` 有值** 则返回 **二进制**；**否则** 若 **`content`（jsonb）有内容**，返回 **`{"kind":"pm_json","doc":...}`**，collab-server 用与 `@carvy/doc` 相同的 schema 写入 **`prosemirror`** 片段后再协同。

4. **可选：extension-webhook（JSON）**  
   若仍使用 `@hocuspocus/extension-webhook` 走 **`POST /hocuspocus-webhook`**，由 Gin 解析 JSON 异步入队（与二进制归档可同时存在时注意勿重复写）。

## 前置条件

1. **Redis（必须）** — 多实例与广播依赖 Redis。

   ```bash
   docker run -d --name hocuspocus-redis -p 6379:6379 redis:7-alpine
   ```

2. **Gin + 协作密钥** — Go 侧优先读环境变量 **`COLLAB_INTERNAL_SECRET`**，否则使用 **`editor/server/config.yaml`** 里的 **`collab.internal_secret`**。Node 侧优先 **`COLLAB_INTERNAL_SECRET`**，否则读 **`collab.config.json`** 的 **`internalSecret`**。两处默认值已写成同一个 **`doc-space-dev-collab-internal`**（上线请改掉并用环境变量覆盖）。

## JWT 认证（与 Gin、`packages/app` 对齐）

WebSocket 建立后，客户端发送 **与业务登录相同的 JWT**（`localStorage.token`，即 Gin 签发的用户令牌）。`collab-server` 在 **`onAuthenticate`** 中请求 Gin：

- **`POST /internal/collab/verify`**  
  Header：`X-Collab-Internal-Secret`（与 Load/Persist 相同）  
  Body：`{ "token": "<JWT>", "document_name": "<页面 UUID>" }`  

Gin 校验 JWT、页面可读权限，并返回 **`read_only`**（页面角色低于 editor 时为只读协同）。Node 侧把结果写入 Hocuspocus **`connection.readOnly`**，客户端收到只读协同。

仅本地演示、未接登录时，可设 **`COLLAB_ALLOW_VALID_TOKEN=1`**，并仍使用占位串 **`valid-token`** 通过鉴权（**勿用于生产**）。

## 环境变量（均可覆盖配置文件中的默认值）

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | `1234` | WebSocket 监听端口 |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PREFIX` | `127.0.0.1` / `6379` / `hocuspocus` | Redis |
| `GIN_BASE_URL` | 见 `collab.config.json` / `9000` | Gin 根 URL |
| `COLLAB_INTERNAL_SECRET` | 见 `collab.config.json` 与 Go `config.yaml` | 覆盖文件中的开发默认值；须与 Gin 一致 |
| `COLLAB_ALLOW_VALID_TOKEN` | 未设置 | 设为 `1` 时允许演示 token `valid-token`（仅开发） |
| `STORE_DEBOUNCE_MS` | `5000` | `onStoreDocument` 防抖间隔 |
| `STORE_MAX_DEBOUNCE_MS` | `30000` | 对应 Server `maxDebounce` |
| `COLLAB_SKIP_SELF_ECHO` | 默认开启 | 设为 `0` / `false` 时关闭「不向发起连接回传本人发出的文档增量」优化 |

客户端 **`HocuspocusProvider.name`** 须为 **页面 UUID**（与 `document_name` / URL 中 pageId 一致）；演示里若写死 `200` 等非 UUID，会导致 Gin 持久化校验失败。

## 协同层还可考虑的优化

| 方向 | 说明 |
|------|------|
| **不向发起方回传文档增量（已实现）** | `patch-hocuspocus-skip-self-echo.ts` 在 `Server` 启动前打补丁；发起连接本地已含该 update，省略一圈 WS 与客户端无效合并。Awareness 仍广播全员（光标同步依赖）。 |
| **Redis 扩展** | `server.ts` 可启用 `@hocuspocus/extension-redis` 做多实例水平扩展与会房间步；单机可不开。 |
| **持久化防抖** | `STORE_DEBOUNCE_MS` / `STORE_MAX_DEBOUNCE_MS` 权衡写入延迟与 DB 压力；只读会话多时还可依赖 Gin 侧策略减少无效 persist（见应用层）。 |
| **大文档** | 拆分 fragment、或服务端分页加载子树等非 Hocuspocus 单体能力，需在业务 schema/Y.Doc 结构上做。 |
| **带宽** | 弱网可配合客户端 `forceSyncInterval`；服务端可考虑网关压缩 WebSocket（依部署）。 |

## 启动

开发默认已写在 `collab.config.json`，与 Go `config.yaml` 中 `collab.internal_secret` 一致，可直接：

入口为 **`server.ts`**（`tsx` 运行，便于加载 `packages/doc` 的 schema 做 JSON 回退）。

```bash
cd collab-server
npm start
```

覆盖密钥或 Gin 地址时再设置环境变量即可。

## 与 `packages/app` / `@carvy/doc` 客户端

- **`VITE_COLLAB_WS_URL`**：WebSocket 根地址，如 `ws://127.0.0.1:1234`。未设置时：页面为 **`http`** 则用 **`ws://{hostname}:1234`**，页面为 **`https`** 则用 **`wss://{hostname}:1234`**（须在网关或本机为协同端口配置 TLS，否则 Safari 等浏览器会拦截混合内容，表现为**一端改动永远不同步**）。
- **`VITE_COLLAB_FORCE_SYNC_MS`**（可选）：正整数毫秒，启用 Hocuspocus 周期性 `forceSync`，弱网或 Safari 后台节流时可减轻漏同步（略有额外流量）。
- **`HocuspocusProvider` `documentName`**：等于 **`sys_page.id`**（路由 `/page/:pageId`）
- **`token`**：优先 **`localStorage.token`**（与调用 Gin `/api/...` 相同 JWT）；仅开发演示可在设置 **`COLLAB_ALLOW_VALID_TOKEN=1`** 时使用 **`valid-token`**

### Safari 与 Chrome 互相看不到修改？

1. **HTTPS 页面仍连 `ws://`**：已在客户端按协议切换 `wss`；生产请在反向代理上暴露 **`wss`**，或显式设置 **`VITE_COLLAB_WS_URL`**。
2. **Gin 返回 `read_only: true`**（页面角色低于 editor）：Hocuspocus 会拒绝该连接的 Yjs 写入，其它端看不到修改；两端须用**同一 JWT** 且角色均为可编辑。
3. 仍异常时可临时设置 **`VITE_COLLAB_FORCE_SYNC_MS=20000`** 试是否缓解漏更新。
