已为 @carvy/app 增加 Docker 构建与 Nginx 运行配置，并接到现有 editor/server/docker-compose.yml。

新增文件（editor/packages/app）
文件	说明
Dockerfile
在 editor 根目录 为构建上下文：npm ci 后 npm run build --workspace=@carvy/app，多阶段输出 Nginx 镜像
docker/nginx-default.conf
反代 /api/、/oauth/、/uploads/、/static/ → 后端 app:9000，SPA try_files
docker/00-ws-map.conf
WebSocket Connection 映射
src/vite-env.d.ts
声明 VITE_CONTEXT_PATH
配置与代码
src/api/context.ts：构建时若 VITE_CONTEXT_PATH 为空字符串，则 contextPath / imageBasePath 为 ''，请求走相对路径（与 Nginx 同域）；未设置时仍为 http://127.0.0.1:9000 本地开发。
editor/server/docker-compose.yml：增加 web 服务，context: ..（即 editor），dockerfile: packages/app/Dockerfile，端口 ${WEB_PORT:-8080}:80，依赖 app。
editor/.dockerignore：排除各包 node_modules、dist 等，避免把本机依赖打进构建上下文。
server/deploy/config.docker.yaml：CORS 增加 http://localhost:8080 / 127.0.0.1:8080。
server/deploy/.env.example：增加 WEB_PORT=8080。
使用方式
在 editor/server 目录：

docker compose up -d --build
前端：**http://localhost:8080**（或 WEB_PORT）
API 直连：**http://localhost:9000**（调试用；日常经 Nginx 走相对路径即可）
单独构建前端镜像（在 editor 目录）：

docker build -f packages/app/Dockerfile -t doc-space-web .
说明
Dockerfile 中已设置 ENV VITE_CONTEXT_PATH=，打包结果为同域相对 API。
若需打指定后端域名的静态包，可：docker build -f packages/app/Dockerfile --build-arg VITE_CONTEXT_PATH=https://api.example.com（需在 Dockerfile 增加 ARG/ENV 传给构建，当前未加 ARG，可自行扩展）。









仓库里的实际分层说明「怎么用」和「以后怎么扩展」，不另改代码。

1. 体系长什么样
层级	路径	作用
角色枚举 + 权重
src/constants/workspace.ts、space.ts
与后端约定一致的 WorkspaceRole / SpaceRole 及 *Priority（数越大权限越高）。
纯函数能力判断
src/permissions/workspace.ts、space.ts，经 src/permissions/index.ts 聚合
不写 React、不写 Redux，只根据「当前角色」算能不能做某事（如 canManageWorkspaceMembers）。
从 Store / 接口取角色
useCurrentWorkspace、useSpaceSession
工作区角色来自 me() → workspaceSlice；空间角色来自 getSpaceDetail → spaceSlice（按 spaceId）。
组件里顺手封装
useWorkspacePermission、useSpacePermission
把常用 canXxx 绑到当前 role 上，避免到处传 role。
路由级门槛
RequireWorkspaceRole、RequireSpaceRole
不够等级就 Redirect 到 /403（在已登录壳内）。
约定：真正「有没有权」以后端为准；前端做展示与提前拦截，避免弱用户看到按钮再 403。

2. 日常怎么用
路由（整页能不能进）
import { RequireWorkspaceRole } from '@/components/routeGuards';
import { WorkspaceRole } from '@/constants';
<RequireWorkspaceRole minimum={WorkspaceRole.Admin}>
  <YourPage />
</RequireWorkspaceRole>
空间级（需要路由里能拿到 spaceId 时）：

import { RequireSpaceRole } from '@/components/routeGuards';
import { SpaceRole } from '@/constants';
<RequireSpaceRole spaceId={match.params.spaceId} minimum={SpaceRole.Editor}>
  <YourPage />
</RequireSpaceRole>
RequireWorkspaceRole 依赖 Layout 里已 setMe（workspace.initialized）；RequireSpaceRole 依赖 useSpaceSession 拉详情。

页面 / 组件（按钮显隐、是否可调接口）
方式 A — 用 Hook（推荐新业务页）

import { useWorkspacePermission } from '@/hooks';
const { canManageMembers, canEditSettings, canDelete, canChangeRoleOf, canAssignRole } =
  useWorkspacePermission();
import { useSpacePermission } from '@/hooks';
const { canManageMembers, canEditContent, canTransferOwner, canChangeRoleOf } =
  useSpacePermission(spaceId);
方式 B — 与现有一致：直接 @/permissions + useCurrentWorkspace

工作区成员页就是这样：useCurrentWorkspace() 拿 operatorRole，再配合 canAssignWorkspaceMemberRole、canChangeWorkspaceMemberRole 等（见 components/workspace/member/index.tsx）。

方式 C — 只比等级

import { gteWorkspaceRole } from '@/permissions';
import { WorkspaceRole } from '@/constants';
import { useCurrentWorkspace } from '@/hooks';
const { role } = useCurrentWorkspace();
if (!gteWorkspaceRole(role, WorkspaceRole.Member)) { ... }
3. 后面「新增一种权限 / 控制」怎么开发
按由里到外加，避免漏后端或漏权重。

与后端对齐
新能力是「新角色」还是「同一角色下的新能力」？

若是新角色：后端权重表 + 接口返回的 role 字符串要先定，再在 constants/* 里加枚举项和 *Priority。
若是同一角色上的细分能力（推荐多数业务）：只在 permissions/workspace.ts 或 space.ts 里加纯函数即可。
在 permissions/*.ts 里写纯函数

命名：canXxx / gteWorkspaceRole 组合。
只依赖 WorkspaceRole | SpaceRole 和已有 *Priority，不写副作用。
需要「操作者 vs 被操作者」的，参考 canChangeWorkspaceMemberRole、canAssignWorkspaceMemberRole 的写法。
从 permissions/index.ts 导出（已 export *，一般会自动带上）。

（可选）挂到 Hook
若多处 UI 都要用，在 useWorkspacePermission / useSpacePermission 的 useMemo 里加一项，避免每个页面手写 import。

路由
若整页最低角色变了，改对应 RequireWorkspaceRole / RequireSpaceRole 的 minimum。

接口
敏感写操作仍应由后端校验；前端隐藏按钮只是体验。

4. 和「功能权限 / ABAC」的区别
当前模型本质是 RBAC（角色 + 权重比较）。若以后要「资源级 / 功能开关」：

仍可在 permissions/ 下加纯函数，入参带上 featureFlags 或资源 ACL（从接口来）；
或单独 permissions/features.ts，由 useCurrentWorkspace 扩展字段后在 Hook 里组合。
不必推翻现有 gte* + can* 结构。

5. 小结一句
路由：RequireWorkspaceRole / RequireSpaceRole + WorkspaceRole / SpaceRole。
UI / 业务：useWorkspacePermission / useSpacePermission，或直接 @/permissions + useCurrentWorkspace / useSpaceSession。
扩展：先对齐后端 → constants 或 permissions 纯函数 → 视情况补 Hook → 最后改路由 minimum。
如果你接下来要加的是「某一个具体能力」（例如「仅财务可见导出」），可以说一下规则，我可以按你们现有风格直接补函数和 Hook 字段草稿。

举几例子

下面都是「照着你们现有栈」能直接套的例子（路径、枚举名与仓库一致）。

例子 1：路由 — 只有工作区管理员及以上能进设置页
import { RequireWorkspaceRole } from '@/components/routeGuards';
import { WorkspaceRole } from '@/constants';
<RequireWorkspaceRole minimum={WorkspaceRole.Admin}>
  <Setting />
</RequireWorkspaceRole>
不够等级会跳到 /403（在已登录 Layout 里）。

例子 2：组件 — 用 useWorkspacePermission 控制按钮
import { Button } from '@carvy/ui';
import { useWorkspacePermission } from '@/hooks';
export const WorkspaceDangerZone = () => {
  const { canDelete, canEditSettings } = useWorkspacePermission();
  return (
    <>
      <Button disabled={!canEditSettings}>修改工作区信息</Button>
      <Button color="red" disabled={!canDelete}>
        删除工作区
      </Button>
    </>
  );
};
例子 3：空间 — 有 spaceId 时用 useSpacePermission
import { Button } from '@carvy/ui';
import { useSpacePermission } from '@/hooks';
type Props = { spaceId: string };
export const SpaceToolbar = ({ spaceId }: Props) => {
  const { canEditContent, canManageMembers } = useSpacePermission(spaceId);
  return (
    <>
      <Button disabled={!canEditContent}>新建页面</Button>
      <Button disabled={!canManageMembers}>成员管理</Button>
    </>
  );
};
useSpacePermission 内部会走 useSpaceSession → getSpaceDetail，拉你在该空间的 role。

例子 4：成员列表里「能不能改某人角色」（与 workspace/member 同思路）
import { WorkspaceRole } from '@/constants';
import { useCurrentWorkspace } from '@/hooks';
import { canAssignWorkspaceMemberRole } from '@/permissions';
const RowActions = ({ memberRole }: { memberRole: WorkspaceRole }) => {
  const { role: operatorRole } = useCurrentWorkspace();
  const canSetAdmin = canAssignWorkspaceMemberRole(operatorRole, memberRole, WorkspaceRole.Admin);
  const canSetGuest = canAssignWorkspaceMemberRole(operatorRole, memberRole, WorkspaceRole.Guest);
  return (
    <>
      <button type="button" disabled={!canSetAdmin}>设为管理员</button>
      <button type="button" disabled={!canSetGuest}>设为访客</button>
    </>
  );
};
这里用到了「仅 owner 可授 admin」等你们写在 canAssignWorkspaceMemberRole 里的规则。

例子 5：路由 — 带 spaceId 的空间页（若以后恢复 /space/:id 或新路由）
import { RequireWorkspaceRole } from '@/components/routeGuards';
import { RequireSpaceRole } from '@/components/routeGuards';
import { WorkspaceRole, SpaceRole } from '@/constants';
<Route
  exact
  path="/space/:spaceId/settings"
  render={({ match }) => (
    <RequireWorkspaceRole minimum={WorkspaceRole.Guest}>
      <RequireSpaceRole spaceId={match.params.spaceId} minimum={SpaceRole.Admin}>
        <SpaceSettings spaceId={match.params.spaceId} />
      </RequireSpaceRole>
    </RequireWorkspaceRole>
  )}
/>
先保证「在工作区里」，再保证「在该 space 里至少是管理员」。

例子 6：只比等级、不用 canXxx 辅助函数
import { WorkspaceRole } from '@/constants';
import { useCurrentWorkspace } from '@/hooks';
import { gteWorkspaceRole } from '@/permissions';
export const BillingLink = () => {
  const { role } = useCurrentWorkspace();
  if (!gteWorkspaceRole(role, WorkspaceRole.Member)) return null;
  return <a href="/billing">账单</a>;
};
若要例子贴近你正在写的某个页面（文件名 + 想控的按钮），可以说一下我按那个场景改一版「可直接贴进项目」的片段。