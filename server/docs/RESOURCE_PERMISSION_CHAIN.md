# 资源链路、角色与权限（产品规范 + 实现对照）

本文档：**(A)** 汇总产品侧「实体层级—角色—私密屏障—权限计算—成员统计」规范；**(B)** 与当前 Go 实现对照，避免设计与代码脱节。Page **保持现有表字段名**（见 `model/page.go`、`model/pageAccess.go`），不在文档中引入未落地的字段别名。

---

## A. 产品规范（摘录）

### A.1 实体层级定义（Entity Hierarchy）

系统采用 **三级资源嵌套**：

| 层级 | 实体 | 含义 |
|------|------|------|
| **L1** | **Workspace（工作区）** | 物理隔离层，租户最高级。 |
| **L2** | **Space（空间 / 库）** | 逻辑隔离层，隶属于某一 Workspace。 |
| **L3** | **Page（文档）** | 内容承载层，隶属于某一 Space；通过 `parent_id` **支持树形自嵌套**（逻辑上无限层，受产品/性能约束）。 |

### A.2 角色与准入逻辑（Role & Access Logic）

#### A.2.1 Workspace 角色（全局准入）

| 角色 | 能力摘要（产品） |
|------|------------------|
| **Owner** | 唯一；账单、销毁工作区、**强制接管**等最高权力（细则依产品）。 |
| **Admin** | 成员管理、空间创建等；**默认不可见 Private Space**（无 ACL 则不可见）。 |
| **Member** | 正式成员；可创建空间；可访问**对其开放**的公开/工作区内可见空间。 |
| **Guest** | 访客；**默认侧边栏为空**；仅能访问被**显式授权**的 Space / Page。 |

#### A.2.2 Space & Page 角色（资源协作）

| 域 | 角色 | 能力摘要（产品） |
|----|------|------------------|
| **Space** | **Owner** | 空间「生死」、可见性、成员与转让等（业务 Owner = ACL `owner`，与 `create_by` 可分离，见 `SPACE_INVITE_AND_MEMBER_DESIGN.md`）。 |
| **Space / Page** | **Admin / Manager** | 成员管理、内容完全控制（Page 侧实现里 `sys_page_access.role` 与 Space 侧常量对齐，见 `model/pageAccess.go` 注释）。 |
| **Space / Page** | **Editor** | 内容读写、子页面创建（以接口校验为准）。 |
| **Space / Page** | **Viewer** | 只读、评论（若产品开启评论权限）。 |

### A.3 核心机制：绝对私密屏障（Privacy Barrier）

| 可见性（产品名） | 含义（产品） | 代码中的 `sys_space.visibility` 取值 |
|------------------|--------------|-------------------------------------|
| Workspace 级「全员可见」 | 工作区内（除 Guest 策略外）默认可见 | `workspace` |
| **Invite_Only** | 侧边栏可见标题，进入需申请/邀请 | `invite` |
| **Private** | **绝对隔离**：仅 `sys_space_access` 中有记录的用户/组可见；**Workspace Admin 无记录则无权** | `private` |

**侧栏 / 搜寻 / Admin 边界的产品级对照表**（含与列表 SQL 的差异）见 **`SPACE_INVITE_AND_MEMBER_DESIGN.md` 第 2.2 节**。

**死锁解除（Reset_Owner）**：当 Space **无有效 ACL Owner** 时，允许 **Workspace Admin** 在**审计留痕**前提下执行 **Reset_Owner**。**→ 已实现**：`POST /api/workspace/space/resetOwner`（请求头 `X-Workspace-ID`，见 `SpaceCtrl.ResetOwner`、`SpaceAccessService.ResetOwner`），写入 `sys_audit_log.action=SPACE_RESET_OWNER`。

### A.4 权限计算算法（Permission Calculus）

#### A.4.1 继承（Inheritance）

**设计判定路径（目标）**：

`Page_ACL → Parent_Page_ACL（递归）→ Space_ACL → Workspace_Default`

**阻断**：若 **`Page.inherit_config = false`**（产品字段名），则停止向上递归，仅采用**该 Page 的显式 ACL**。

**→ 已实现 `sys_page.inherit_config`（默认 `true`）**；`PageAccessService.GetUserPageRole` 按 **A.4.1** 在父链上递归并与 `GetSpaceInfoWithAccess` 的空间有效角色合并；`POST .../page/updateMeta` 可更新该字段。

#### A.4.2 冲突解决（Conflict Resolution）

- **并集原则**：个人授权 + 组授权同时存在时，取 **最高权重**（Owner > Admin > Editor > Viewer）。与空间侧 `EffectiveSpaceRole`、多 `role` 聚合取权重的思路一致。  
- **覆盖原则**：**越靠近底层**的显式授权，优先级高于上层继承（实现需在 Page 权限解析中逐项核对）。

### A.5 成员统计逻辑（Member Analytics）

- **去重**：同一用户在同一资源内通过多组展开时，计 **1 人**。  
- **身份穿透**：统计空间成员时包含 `sys_space_access` 的 **User** 主体，以及 **Group** 主体在 `sys_group_user` 下展开的所有 UserID（与 `BatchFillMemberData` / `GetMemberList` 的 UNION 思路一致）。

**成员构成（身份来源 / 授权路径 / 名单矩阵与 UI 拆分）** 的完整叙述见 **`SPACE_INVITE_AND_MEMBER_DESIGN.md` 第 4.5 节**。

---

## B. 与当前实现对照（摘要）

### B.1 空间可见性枚举

产品表 **Invite_Only / Private** 与代码常量 **`invite` / `private`** 对应；**Workspace 默认可见**对应 **`workspace`**（`model/space.go`）。

### B.2 Workspace Admin 与 Private

**`private`**：`SearchUserSpaces` 仍须 **`create_by` 或 ACL**。**`invite`**：工作区 **member/admin/owner** 即可出现在列表（壳）；**guest** 不可见。详见 `SPACE_INVITE_AND_MEMBER_DESIGN.md` 第 2.2 节。

### B.3 工作区 Owner 级联 vs 成员名单、`can_manage_space_members`

- **`role`（列表/详情）**：`EffectiveSpaceRole` 可对 **Workspace Owner** 在 **`visibility=workspace`** 的空间上给出 **Space Admin** 级权重（级联），**不要求**其出现在 `GET /space/members` 中。  
- **`can_manage_space_members`**：仅当当前用户对该 Space 存在 **`sys_space_access` 个人或组**命中且有效角色 ≥ Admin 时为 `true`，与「成员管理」UI 及成员表口径一致。  
- **Reset_Owner**：**已实现**（见 A.3）；须 **Workspace Admin 及以上**，且当前无任何 `sys_space_access.role=owner` 活跃行。

### B.4 Page 继承与字段

- **`inherit_config`**：已落库（`model/page.go`）；已有 PostgreSQL 实例可执行 `scripts/add_page_inherit_config.sql`。  
- **读写 API**：`Detail` / `Save` / `SavePatch` / `ListRevisions` 等在空间准入后调用 **`GetUserPageRole`**（父链 + 阻断 + 空间 `EffectiveSpaceRole`）；**`/page/tree`** 仍为空间级列表，未按页逐条过滤（避免 N+1）。

### B.5 Space Owner vs `create_by`

业务 Owner = **`sys_space_access` 中 user 且 `role=owner`**；原始建库人 = **`sys_space.create_by`**；API 已暴露 **`business_owner_id` / `original_creator_id`**（见 `playload/space.go`）。

---

## C. 历史表格（资源—表—角色速查）

| 层级 | 资源 | 关键表 / 关联 | 关键 Role | 核心逻辑 | 穿透 / 隔离 |
|------|------|----------------|-----------|----------|-------------|
| 1 | Workspace | `sys_workspace_user` | Owner, Admin, Member, Guest | 租户准入 | Owner 不可被 Admin 移除；Guest 受限 |
| 2 | Group | `sys_group_user` | Leader, Member | 组授权展开 | 多组取高 |
| 3 | Space | `sys_space`、`sys_space_access`、`create_by` | Owner, Admin, Editor, Viewer | 可见性 + ACL + `EffectiveSpaceRole` | 业务 Owner ≠ 仅 `create_by` |
| 4 | Page | `sys_page`、`sys_page_access` | 与模型注释一致（Admin/Editor/Viewer） | 页 ACL + 父链 + 空间上下文 | 与 Space 可部分脱钩 |

---

## D. 业务动作与资源流向（简表）

| 动作 | 表（摘要） | 说明 |
|------|------------|------|
| 创建空间 | `sys_space` + `sys_space_access` | `CreateWithAccess` |
| 移动文档 | `sys_page`（`parent_id`、`space_id`） | 权限随目标空间重算 |
| 邀请专家 | `sys_workspace_user` + ACL | Guest/Member + Space/Page access |
| 离职 | `sys_workspace_user` + 级联软删空间个人 ACL | `workspaceUserService` |

---

## E. 三道防火墙（产品叙事）

1. **工作区**：谁能进门、Member vs Guest。  
2. **空间**：ACL + 可见性；业务 Owner 与 `create_by` 分离。  
3. **文档**：页 ACL +（规划中的）继承阻断。

---

## F. 相关代码索引

- `model/space.go` — `EffectiveSpaceRole`，`SpaceVisibility*`  
- `services/spaceService.go` — `SearchUserSpaces`、`BatchFillMemberData`、`GetSpaceInfoWithAccess`  
- `playload/space.go` — `can_manage_space_members`、`business_owner_id`、`original_creator_id`  
- `SPACE_INVITE_AND_MEMBER_DESIGN.md` — 邀请、成员、转让细则  

**维护**：改 `EffectiveSpaceRole`、可见性或 Reset_Owner 时，请同步更新 **B** 节与前端对 `role` / `can_manage_space_members` 的说明。
