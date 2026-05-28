# 库（Space）邀请与成员管理 — 设计与开发文档

本文档描述 `editor/server` 中与 **工作区（Workspace）**、**库（Space）** 相关的邀请、成员角色、级联删除及通知链路的实现，供后续功能扩展与线上问题排查使用。

---

## 1. 文档目的与读者

| 目标 | 说明 |
|------|------|
| 对齐领域语言 | 统一 Workspace / Space / Invite / ACL 的含义与边界 |
| 降低维护成本 | 说明表结构、服务职责、路由入口与数据流 |
| 支撑二次开发 | 标出扩展点（新邀请类型、新角色、新级联规则） |

**读者**：后端开发、DBA、需要对接 API 的前端/客户端、运维（迁移与备份策略）。

---

## 2. 术语与层级关系

```
User
 └── Workspace（租户边界，请求头 X-Workspace-ID）
      ├── WorkspaceUser（工作区成员与角色：owner/admin/member/guest）
      ├── Space（库，一级导航）
      │    ├── SpaceAccess（用户/组对某 Space 的 ACL：owner/admin/editor/viewer）
      │    └── Page（页面树）
      └── Invite（多态：工作区邀请 / 库邀请，表 sys_invite）
```

**关键约束**：

- 所有「工作区内业务接口」在 `WorkspacesAuth` 通过后，当前用户一定是该 `workspace_id` 的 `sys_workspace_user` 成员。
- **库邀请**的受邀人必须是 **工作区成员**；接受后写入的是 `sys_space_access`，**不再**写 `sys_workspace_user`。

### 2.1 分层角色模型（业界对齐）

容易混淆的根源是：**同一套英文角色名（`owner` / `admin` / …）出现在两个不同作用域**，职责并不相同。业界普遍做法是 **按「资源边界」拆三层**，每层只回答一类问题；**Page 另有 `sys_page_access` + `inherit_config` 与父链继承**（见 `PageAccessService.GetUserPageRole`、`RESOURCE_PERMISSION_CHAIN.md`），再与 **Space 有效角色**、**Workspace 角色上限** 合成。

#### 2.1.1 三层分别管什么

| 层级 | 业界常见对象 | 数据落点（本系统） | 回答的问题 |
|------|----------------|-------------------|------------|
| **L1 组织 / 租户** | Notion *Workspace*、Slack *Workspace*、Confluence *Site* | `sys_workspace_user.role` | 我是不是这个「公司/团队」的人？能否进租户、能否管账单/全员、**访客上限**？ |
| **L2 资源 / 协作单元** | Notion *Teamspace*、Confluence *Space*、Drive *Shared drive* | `sys_space_access` + `visibility` + `EffectiveSpaceRole` | 在这个「库」里我是 **谁**？能否管成员与设置、能否改文档？ |
| **L3 内容** | Page / Database / 文档 | `sys_page_access` + `sys_page.inherit_config` + 父链；与 L2 合成 | 单页读写在 **空间准入** 之上再算 **页有效角色**（`GetUserPageRole`）。 |

**设计原则（与常见 SaaS 一致）**：

1. **L2 不替代 L1**：必须先满足「是工作区成员」；库 ACL 只是在成员内部再细分。
2. **L1 可对 L3 设硬顶**：例如 **Workspace `guest`** = 租户级 **只读参与者**，即使将来在某一 Space 被误标为 editor，也应在 **写接口** 上被 L1 拦住（本系统：`PageCtrl.checkPageMutate` 要求 `workspace ≥ member`）。
3. **L2 管「容器内管理权」与「内容权」**：`space owner` 只管 **该库的删除/转让**，不等于 **工作区 owner**；后者管 **租户与级联策略**（如工作区 owner 在库侧 **抬到至少 admin** 以便管理，见 `EffectiveSpaceRole`）。

#### 2.1.2 与业界产品的粗略对照

| 概念 | Notion 系 | Confluence Cloud | 本系统 |
|------|-----------|------------------|--------|
| 租户成员 + 访客 | Workspace members / guests | Site users / guests | `WorkspaceUser`：owner / admin / member / **guest** |
| 子资源管理员 | Teamspace owner / Teamspace member 权限档 | Space admin | `SpaceRole`：owner / admin / editor / viewer |
| 单页是否单独卖权限 | 可链接分享（另一套能力） | 可限制单页 | 有 `sys_page_access`；继承可关（`inherit_config=false` 仅显式页 ACL） |

#### 2.1.3 Page「角色」怎么说才清晰

**不要再说「Page 角色」**，改为两句话对外沟通：

- **「你在该库里的角色」** → 即 **`EffectiveSpaceRole`**（owner / admin / editor / viewer / none）。
- **「你在工作区里的身份」** → 即 **`WorkspaceUser.role`**；其中 **guest** 表示 **全工作区内容默认只读**（在已实现接口上，写页面会再校验 member 以上）。

**页面能力**：**读** 需 **空间准入**（`CheckAccess`）且 **页有效角色 ≥ viewer**（`GetUserPageRole`）；**写结构/写正文** 需 **L1 ≥ member** 且 **页有效角色 ≥ editor**（`PageCtrl.checkPageMutate` / `checkPageCreate`）。

#### 2.1.4 判定顺序（推荐后端/前端统一心智）

```
请求到达（已带 X-Workspace-ID）
  → ① 是否工作区成员？（无则非本租户业务）
  → ② L1：Workspace role 是否允许该类操作？（如 guest 禁止写、admin 才能建库）
  → ③ 是否涉及某一 Space？是则算 EffectiveSpaceRole（含 visibility、ACL、工作区 owner 级联）
  → ④ L2：Space 能力是否 ≥ 该接口要求？（如改库设置要 admin+、改内容要 editor+）
  → ⑤ 是否落到某一 Page？是则再算 `GetUserPageRole`（含 `inherit_config` 与父链）
```

**记忆口诀**：先 **租户身份**，再 **库内角色**，再 **页 ACL/继承**；**访客被租户挡一道**。

#### 2.1.5 产品/UI 命名建议（减少「两个 owner」困惑）

| 代码 / API | 建议展示文案 |
|------------|----------------|
| `WorkspaceUser.role == owner` | **工作区所有者** |
| `SpaceAccess.role == owner`（effective） | **库所有者** |
| `WorkspaceUser.role == admin` | **工作区管理员** |
| `SpaceRole == admin` | **库管理员** |

英文界面可用 **Workspace owner** / **Space owner** 区分 scope。

#### 2.1.6 业界常见能力范围（按角色）

以下为 **多数协作 SaaS（Notion / Slack / Confluence / Google Workspace 系）的常见约定**：高角色 **继承** 低角色能力；标 **—** 表示通常不做或产品另有付费项（如账单仅 owner）；标 **◐** 表示常见但各产品略有差异，需在 PRD 里写死。

**A. 工作区角色（L1，`sys_workspace_user.role`）**

| 能力范围 | Owner | Admin | Member | Guest |
|----------|:-----:|:-----:|:------:|:-----:|
| 进入工作区、切换默认工作区 | ✓ | ✓ | ✓ | ✓ |
| 查看 **工作区**成员列表 | ✓ | ✓ | ✓ | **—** |
| 浏览被授权的库与页面（读） | ✓ | ✓ | ✓ | ✓（常限于被分享的库） |
| 编辑库内页面（写） | ✓ | ✓ | ✓ | **—**（业界普遍：访客只读） |
| 创建工作区级资源（如 **新建库**） | ✓ | ✓ | **—** | **—** |
| 修改工作区资料、徽标、域名等设置 | ✓ | ✓ | **—** | **—** |
| 邀请/移除 **工作区**成员、改成员角色 | ✓ | ✓ | **—** | **—** |
| 安全与合规（导出、审计、SSO） | ✓ | ◐ | **—** | **—** |
| 账单、订阅、删 **整个工作区** | ✓ | **—** | **—** | **—** |

**B. 库角色（L2，effective `SpaceRole`，含可见性与 ACL）**

| 能力范围 | Owner | Admin | Editor | Viewer |
|----------|:-----:|:-----:|:------:|:------:|
| 进入该 Space、读页面树与正文 | ✓ | ✓ | ✓ | ✓ |
| 创建 / 移动 / 删除页面、保存正文 | ✓ | ✓ | ✓ | **—** |
| 改库名称、图标、可见性等设置 | ✓ | ✓ | **—** | **—** |
| 查看成员列表、发 **库**邀请、改他人库内角色 | ✓ | ✓ | **—** | **—** |
| 移除成员（非 owner）、踢人出本库 | ✓ | ✓ | **—** | **—** |
| **转让**库所有者 | ✓ | **—** | **—** | **—** |
| **删除**该库（或归档） | ✓ | **—** | **—** | **—** |

**C. 页面（L3）**

| 能力范围 | 条件（业界通式） |
|----------|------------------|
| 读 | 能进入该 Space（`viewer` 起）且满足可见性 |
| 写（含改树、删页、保存块） | **同时**：L1 非 guest（或产品定义的「可写成员」） **且** L2 ≥ `editor` |

**与本系统实现的对应**：工作区 **删租户 / 删库** 仅 **对应 owner**；工作区 **改资料、邀请、移除成员、改成员角色** 为 **admin+**（其中 **授予管理员 / 邀请角色为 admin** 仅 **工作区 owner**）；**工作区成员列表** 为 **member+**（**guest 不可见**）；**建库** 为 **工作区 admin+**；工作区邀请 Body 可带 `role`：`member`（默认）/`guest`，**`admin` 仅 owner 可指定**；库 **改资料 / 邀请 / 成员列表** 为 **库 admin+**；页面 **写** 为 **工作区 member+** 且 **页有效角色 ≥ editor**；页面 **读** 为 **空间准入 + 页有效角色 ≥ viewer**（见 4.4）。

### 2.2 空间可见性对比（产品表 vs 当前后端）

下列 **`sys_space.visibility`** 取值为 `workspace` / `invite` / `private`（代码常量同名）。**产品**列描述目标体验；**当前后端**列对照 `SearchUserSpaces`、`GetSpaceInfoWithAccess`、`EffectiveSpaceRole` 等行为。

| 特性 | 公开 (Workspace) | 仅邀请 (Invite Only) | 私密 (Private) |
|------|------------------|----------------------|------------------|
| **侧边栏 / 列表可见性（产品）** | 全员可见；出现在「可加入」类清单中 | 全员可见，但非成员通常 **只见名称与图标** | **非成员完全不可见**（侧边栏无入口） |
| **进入门槛（产品）** | 自由加入；进入后默认 **Viewer** 级参与 | 需 **申请访问**；由 **Space Admin+** 审批后加入 | **禁入**；须 **Owner/Admin 显式加人** 或 **邀请/专属链接** |
| **搜寻（产品）** | 库内 **内容** 可被工作区全员检索 | 非成员 **仅库名可搜**；**文档内容不可搜** | 对非成员 **不可搜**；内容视为不存在 |
| **Workspace Admin（产品）** | 可 **随意进出与管理** | **可见库存在**；通常 **不默认进内容**（弱于 Member 的「全内容」） | **绝对屏障**：无 ACL 则 **不可见不可进**（**接管**见 `POST .../space/resetOwner`，仅无 ACL Owner 时） |

| 特性 | 当前后端（摘要） |
|------|------------------|
| **列表 `SearchUserSpaces`** | `workspace` / `create_by` / `sys_space_access` 同前；**`invite`**：工作区 **`member`/`admin`/`owner`** 即出现在列表（**`guest` 不出现**）。**`private`**：仍仅 `create_by` 或 ACL。 |
| **列表项 `invite_shell_only`** | `visibility=invite` 且 `EffectiveSpaceRole` 为 **`none`** 时为 `true`，供前端展示「待申请」壳卡片（`BatchFillMemberData` 写入）。 |
| **详情 `GetSpaceInfoWithAccess`** | `invite` 且无库内角色：工作区 **member+** 返回 **200 + 元数据**（`role=none`）；**guest** 与 **private 无 ACL** 仍为 **404**。`CheckAccess` 仍以 `role != none` 为准，**不进正文/树**。 |
| **工作区 Admin vs Private** | **与产品一致**：Private 无 ACL 则 **列表无、详情不可进**。 |
| **工作区 Owner 级联** | 对 **`visibility=workspace`** 的空间，**Workspace Owner** 在 `EffectiveSpaceRole` 中可 **抬到 Space Admin**；**Workspace Admin 无此级联**。 |
| **搜寻** | 列表仍仅 **`name ILIKE`** 于已可见库；全文检索与「Invite 非成员仅搜名」需后续检索服务。 |
| **申请访问** | 邀请流已有；壳卡片可引导 **发邀请 / 调邀请 API**；**一键申请工单** 可再接审批表。 |
| **`GET /space/members`** | 仍须 **库 effective ≥ admin**（含工作区 owner 在公开库级联）；**仅壳**用户 **不可拉成员表**（避免泄露）。 |

---

## 3. 数据模型

### 3.1 `sys_invite`（多态邀请表）

由历史表 `sys_workspace_invite` 演进而来；新库见 `sql.sql`，存量库见 `migrations/001_sys_invite_and_space_access.up.sql`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid | 主键；与 `sys_notification.related_id` 关联 |
| `workspace_id` | uuid NOT NULL | 租户隔离；Space 邀请同样必填 |
| `scope_type` | varchar | `workspace`：邀请加入工作区；`space`：邀请加入库 |
| `scope_id` | uuid NOT NULL | `workspace` 时等于 `workspace_id`；`space` 时为 `space_id` |
| `inviter_id` | uuid | 邀请人 |
| `invitee_id` | uuid | 站内受邀用户（当前实现以站内用户为主） |
| `email` | varchar | 预留邮箱邀请 |
| `token` | varchar | 链接邀请预留 |
| `role` | varchar | 接受后写入成员表的角色：工作区为 member 等；库为 admin/editor/viewer |
| `status` | smallint | 0 待处理 / 1 已接受 / 2 已拒绝 / 3 已过期（逻辑与 model 常量一致） |
| `expire_time` | timestamptz | 过期时间 |
| `delete_time` | timestamptz | 软删 |

**索引（设计意图）**：

- `idx_invite_scope`：按 `scope_type + scope_id` 清理、查询。
- `idx_invite_pending_unique`：**部分唯一索引** — `(scope_type, scope_id, invitee_id)` 在 `status = 0` 且未删时唯一，用于「同一对象对同一人的待处理邀请」幂等与更新（业务上表现为刷新角色与过期时间）。

**Go 模型**：`model.Invite`（`model/invite.go`），`TableName() = sys_invite`。

### 3.2 `sys_space_access`（库 ACL）

| 字段 | 说明 |
|------|------|
| `space_id`, `subject_type`, `subject_id` | 与 `delete_time IS NULL` 组合唯一，支持 **Upsert**（`GrantAccess`、邀请接受） |
| `role` | `owner` / `admin` / `editor` / `viewer` |

**索引**：

- `idx_space_access_unique`：未删除行上 `(space_id, subject_type, subject_id)` 唯一。
- `idx_space_access_owner_unique`：每个 Space 至多一条 `role = owner` 且 `subject_type = user` 的未删除记录，防止双 Owner。

**迁移注意**：必须先 **回填** 存量 Space 的 owner ACL（`create_by` → `owner`），再创建 `owner` 部分唯一索引，否则可能因历史重复数据失败。脚本见 `migrations/001_sys_invite_and_space_access.up.sql`。

### 3.3 与通知表的关系

- `sys_notification.related_id` → `sys_invite.id`
- `sys_notification_receiver`：按 `receiver_id` 与 `notification_id` 维护已读等状态。

通知列表查询见 `services/notificationService.go`：`LEFT JOIN sys_invite`，并对 `msg_type` 为 `invite` 与 `space_invite` 计算 `invite_status`（含过期视为 expired 语义）。

---

## 4. 角色与权限计算（Space）

### 4.1 角色枚举与权重

定义于 `model/space.go`：

| 角色 | 权重 | 说明 |
|------|------|------|
| `owner` | 4 | 唯一业务所有者；转让见 `TransferOwner` |
| `admin` | 3 | 管理成员、改设置、发邀请等（与接口约定一致） |
| `editor` | 2 | 编辑内容 |
| `viewer` | 1 | 只读 |
| `none` | 0 | 无访问权 |

`GetRoleByWeight` / `GetSpaceRoleWeight` 与 `EffectiveSpaceRole` 配套使用。

### 4.2 `EffectiveSpaceRole` 合成规则

函数：`model.EffectiveSpaceRole(space, userID, aclRoles, workspaceUserRole)`。

1. **可见性基线**：`visibility = workspace` 时，至少 `viewer`。
2. **创建者兜底**：`userID == create_by` 时，至少 `viewer`（迁移期无 ACL 时不致完全失权）。
3. **ACL 取高**：`sys_space_access` 中用户直连 + 用户所在组的授权，取 **最高权重**。
4. **工作区 Owner 级联**：若 `workspaceUserRole == owner`，则至少提升到 **space `admin`**（Notion 类产品常见行为：租户 Owner 可管理所有库）；**工作区 Admin 不自动升级**，避免破坏私有库边界。

列表与详情在 `SpaceService` 中会查询当前用户在工作区的 `role`，传入 `EffectiveSpaceRole`。

### 4.3 与 Controller 校验的关系

- **列表/详情/更新**：仍可在 Controller 用 `GetSpaceInfoWithAccess` + 权重做快速校验。
- **删除库**：权限下沉至 `SpaceService.SoftDelete(..., operatorID)`，仅 **effective role ≥ owner**（即必须为 space owner）可删。
- **成员操作**：`SpaceAccessService` 内用 `EffectiveSpaceRoleInTx` 在事务内再算一遍，避免并发下与 UI 不一致。

### 4.4 工作区 × 库 × 页面 — 权限矩阵（产品约定）

概念分层与业界对照见 **第 2.1 节**；下表为 **当前后端实现** 的速查。

| 能力 | 工作区 guest | 工作区 member+ | 说明 |
|------|----------------|----------------|------|
| 删除工作区 / 删除库 | — | **仅对应 owner** | `WorkspaceCtrl.Delete` / `SpaceService.SoftDelete` |
| 查看 **工作区**成员列表 | **禁止** | **member 及以上** | `WorkspaceCtrl.GetMembers` |
| 修改工作区信息、工作区邀请（含指定受邀为 member/guest；admin 仅 owner 可指定） | — | **admin 及以上** | `WorkspaceCtrl.Update` / `Invite` |
| 创建库 | — | **admin 及以上** | `SpaceCtrl.Create`：`WorkspaceUser.role ≥ admin` |
| 修改库信息、发库邀请、成员搜索、**查看成员列表** | — | 需在库侧 **admin 及以上**（含工作区 owner 级联为 space admin） | `SpaceCtrl.Update` / 邀请与 `UserService` 搜索；`GET .../space/members` 与邀请同级 |
| 查看库页面树 / 页面详情 | 有空间 **读**权即可（`CheckAccess`）；**页面详情/读正文**另需 **页有效角色 ≥ viewer** | 同左 | `Tree`：`CheckAccess`；`Detail` 等：`checkPageReadFull`（`GetUserPageRole`） |
| 创建 / 移动 / 删除页面、**全文保存**、**增量 savePatch**、**恢复快照** | **禁止** | 工作区 **member 及以上**，且 **页有效角色 ≥ editor**（父级创建时另校验父页） | `PageCtrl.checkPageMutate` / `checkPageCreate` |
| 查看页面快照列表 / 单版本正文 | 有空间读 + **页有效角色 ≥ viewer** | 同左 | `ListRevisions` / `GetRevision`：`checkPageReadFull` |

工作区 **guest** 在库内通常只有 **viewer** 级有效角色，因此只能浏览页面，不能改结构或内容。

### 4.5 成员构成（三个维度、名单合成与 UI 建议）

本节把「谁算成员、名单从哪拼、和接口是否一致」说清楚，便于 **计费 / 审计 / 成员管理 UI** 对齐。

#### 4.5.1 维度一：身份来源（谁在工作区「主名单」里）

| 类型 | 产品语义 | 本系统数据 | 权限与体验（摘要） |
|------|----------|------------|-------------------|
| **内部成员 (Internal)** | 企业员工等，常对应企业邮箱域 | `sys_workspace_user`，`role ∈ {member, admin, owner}` | 默认可参与 **visibility=workspace** 的公开库（`EffectiveSpaceRole` 底权）；**建库**等需 `admin+`（见 4.4）。**按邮箱域名（如 `@company.com`）自动标「内部」** 若要做计费/合规，需在 **账号或企业配置** 层扩展，**当前仅 role 无域名模型**。 |
| **外部访客 (Guests)** | 伙伴、外包、客户 | `sys_workspace_user.role = guest` | **零起点**：须有 **空间或页面** 显式授权后才有内容；工作区成员列表对 guest **403**；侧边栏策略由前端配合「可见空间集合」渲染。 |

#### 4.5.2 维度二：授权路径（权限是怎么来的）

| 路径 | 说明 | 空间侧 | 页面侧 |
|------|------|--------|--------|
| **直接授权 (Direct)** | 在成员面板搜人并添加 | `sys_space_access`，`subject_type = user` | `sys_page_access`，`subject_type = user` |
| **组继承 (Group)** | 个人不在面板单独出现，但其所在组被授权 | `sys_space_access`，`subject_type = group` → 经 `sys_group_user` 展开为用户 | 同上，`sys_page_access` + `sys_group_user` |
| **层级继承 (Hierarchy)** | 因父级或空间而「顺带」拥有本页能力 | 不适用（空间无父级 ACL 继承） | **`GetUserPageRole`**：页 ACL → 父页链（受 `inherit_config` 阻断）→ **`EffectiveSpaceRole`**；**无单独「页面成员表」接口**，不在成员面板逐条列出「继承来人」 |

#### 4.5.3 维度三：空间「成员管理」名单的合成（产品矩阵 vs `GET /space/members`）

管理员在 **库成员页** 看到的列表，产品期望是 **去重后的用户集合**；后端 **`SpaceService.GetMemberList`** 当前合成逻辑如下（与注释「合并 create_by」一致）。

| 构成类型 | 加入方式（产品） | 权限来源（产品） | **当前 API 是否返回该行** | 是否可在此面板单独移除（产品 / 实现） |
|----------|------------------|------------------|----------------------------|----------------------------------------|
| **空间创建者（原始建库人）** | 创建空间自动 | `sys_space.create_by`（SQL 中合并为一条 **user** 行，`is_original_creator=true`，`role` 为 `owner` 用于展示兜底） | **是** | **否**：业务 Owner 转让走 `TransferOwner`；仅审计意义的 `create_by` 不应用 removeMember 当「踢 owner」 |
| **显式受邀者** | 手动添加 / 接受邀请 | `sys_space_access`（`subject_type = user`） | **是** | **是**：`removeMember` 软删个人行（owner 需先转让） |
| **所属组关联者** | 整组进库 | `sys_space_access`（`subject_type = group`）→ 展开用户 | **是**（`subject_type` 可为 `group`，表示该展示行来自组） | **否单独移人**：须 **改组 ACL** 或 **把用户移出组** |
| **工作区全员（公开库底权）** | `visibility = workspace` 自动 | `EffectiveSpaceRole` 的 **viewer 底权**，**无** `sys_space_access` 行 | **否**：名单 **只含 ACL 展开 + create_by**，**不含**「纯公开底权、无 ACL」用户（与列表里的 `role` 可能仍为 viewer **并存**，见 `can_manage_space_members`） |

**`member_source`（API）**：`GET /space/members` 返回的 `SpaceMemberDTO.member_source` 为 **`original_creator`** | **`direct_user`** | **`group`**（组展开行 UI 可标「组授权」）。

**页面**：暂无 `GET /page/members`；「层级继承」只影响 **鉴权**，不产生与空间成员页同构的名单。若产品要在 UI 展示 **继承自空间/父页** 的说明，需 **前端根据** `EffectiveSpaceRole` / 父链 **推导文案**，或后续增加只读「有效协作者」查询接口。

#### 4.5.4 UI 展示建议（直属 vs 继承）

与产品一致的可视拆分（**空间成员管理**）：

1. **直属成员**：`sys_space_access` 中 **user** 主体 + **group** 主体（组可展示为一条，操作「编辑组权限 / 移除组授权」）。  
2. **继承成员（只读区）**：对 **仅** 因 **`visibility=workspace`** 拥有底权、**无 ACL 行** 的用户，当前 **API 不返回**；若要在 UI 展示「另 N 人可读公开库」，需 **单独接口或工作区维度统计**，避免与 `GET /space/members` 混淆。  
3. **创建者行**：建议标签区分 **原始建库人**（`is_original_creator`）与 **业务 Owner**（`business_owner_id` / ACL owner），与 **2.1** 的命名建议一致。

---

## 5. 邀请子系统架构

### 5.1 `InviteService`（`services/invite_service.go`）

职责：

- `Send(opts *InviteSendOpts)`：创建或 **更新** 待处理邀请、维护/更新关联 `sys_notification`、事务成功后 **WebSocket** `Emit` 到受邀人。
- `Accept(inviteID, userID)`：行锁读 invite → 按 `scope_type` 分发 **Acceptor** → 更新 invite 状态 → 标记通知已读。
- `Reject`：同上，拒绝 + 标记已读。

**依赖**：`IWebSocketManager`（与 `WorkspaceService` 一致，由 `ws.Manager` 实现）。

### 5.2 Acceptor 策略

| 实现 | Scope | Validate | OnAccept |
|------|-------|----------|----------|
| `WorkspaceInviteAcceptor` | `workspace` | 已是工作区成员则 `ErrAlreadyMember` | 插入 `sys_workspace_user` |
| `SpaceInviteAcceptor` | `space` | 非工作区成员 / 已在 space_access 则错误 | Upsert `sys_space_access` |

注册位置：`router/router.go` 在 `SetupRouter` 内 `inviteSrv.Register(...)`。

### 5.3 Space 邀请发送前校验（Guard）

`inviteSrv.SetSpaceSendGuard(...)` 内串联：

1. `SpaceService.AssertCanInviteToSpace`：邀请人在该 Space 上 **effective ≥ admin**。
2. `SpaceService.ValidateSpaceInviteTarget`：受邀人是工作区成员且 **尚无** 该 Space 的 **个人** `space_access`，且 **未** 仅通过 **组** 已拥有该 `space_id` 的访问行（与 `SearchForSpaceInvite` 过滤一致，避免「已是成员仍可发邀请」）。

工作区邀请 **不** 设置 Guard（与历史行为一致：由路由挂在已认证工作区成员组内，业务上可自行再加校验）。

### 5.4 `WorkspaceService` 与邀请的衔接

`WorkspaceService` 持有 `*InviteService`，`SendInvite` / `AcceptInvite` / `RejectInvite` 为 **薄封装**，避免重复事务与推送逻辑。

---

## 6. HTTP API 一览

**约定**：除「全局工作区」组外，下列 `/api/workspace/...` 均需 **JWT** + 请求头 **`X-Workspace-ID`**（`middleware.WorkspacesAuth`）。

### 6.1 工作区（既有 + 行为变化）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/workspaces/acceptInvite` | 接受 **工作区**邀请；错误响应可用 `SendErr` 映射 404 等 |
| POST | `/api/workspaces/rejectInvite` | 拒绝工作区邀请 |
| GET | `/api/workspace/members` | **工作区 member 及以上**可见；**guest** 返回 403（`ErrWorkspaceGuestNoMemberList`） |
| POST | `/api/workspace/invite` | Body：`invitee_id`，`role` 可选 `member`（默认）\|`guest`\|`admin`（**仅 owner** 可指定 admin）；**仅工作区 admin 或 owner** 可调用 |

邀请落库表均为 **`sys_invite`**，`scope_type=workspace`，`scope_id=workspace_id`。

### 6.2 库 Space（新增/启用）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workspace/space/members` | Query：`space_id`，`search` 可选（匹配 **username / real_name / email / mobile / code**）；结果仅 **`workspace_id` 与当前头一致** 的 `space`；**仅库 admin 或 owner** |
| POST | `/api/workspace/space/invite` | Body：`space_id`, `invitee_id`, `role`（admin/editor/viewer） |
| POST | `/api/workspace/space/acceptInvite` | Body：`invite_id` |
| POST | `/api/workspace/space/rejectInvite` | Body：`invite_id` |
| POST | `/api/workspace/space/removeMember` | Body：`space_id`, `target_user_id` |
| POST | `/api/workspace/space/updateRole` | Body：`space_id`, `target_user_id`, `new_role` |
| POST | `/api/workspace/space/transferOwner` | Body：`space_id`, `new_owner_id` |
| DELETE | `/api/workspace/space/delete` | Body：`id`（space_id）；**仅 space owner** |

请求体 DTO 定义见 `playload/space.go`（如 `SpaceInviteReq`、`InviteIdReq` 等）。

### 6.3 用户搜索（邀请前 / 成员检索）

**权限约定**：

- **工作区**「可邀请用户」搜索（`searchForWorkspaceInvite`）：仅 **工作区 admin 或 owner** 可调用；与 `POST /workspace/invite` 一致。
- **库**「可邀请用户」与「当前成员」搜索：仅该库 **admin 或 owner**（含工作区 owner 在库侧级联为 admin）可调用。

| 方法 | 路径 | Query | 说明 |
|------|------|-------|------|
| GET | `/api/workspace/searchForWorkspaceInvite` | `keyword` | 工作区内**还不是**工作区成员的用户（邀请工作区用） |
| GET | `/api/workspace/searchForSpaceInvite` | **`space_id` 必填**；`keyword` **可选**；`limit` 可选（默认 50，最大 200） | 工作区成员且 **`space` 属于当前工作区**；**排除**已有 **个人** `space_access`、已 **通过组** 拥有该空间访问的用户（**不再**按 `create_by` 排除，避免与「原始建库人 ≠ 业务 owner」语义冲突）；其余与 `keyword` 模糊字段同上 |
| GET | `/api/workspace/searchForSpaceMembers` | `keyword`（可空）, `space_id` | 当前库成员：创建者、个人授权、组授权展开的用户；`keyword` 为空时按 `limit` 返回一批成员 |

实现见 `UserService.SearchForWorkspaceInvite` / `SearchForSpaceInvite` / `SearchSpaceMembers`（含 `requireWorkspaceAdminOrAbove`、`requireSpaceAdminOrAbove`）。

### 6.4 Page 文档版本、增量（JSON Patch）与快照

#### 6.4.1 数据与版本语义

- **`sys_page`**：`content`（jsonb）、`version`（整数乐观锁，从 1 递增）。
- **`sys_page_revision`**（快照 / 历史）：每次成功将 `sys_page.version` 从 **`V` → `V+1`** 前，先把 **当前整份 `content`** 写入一行快照，字段 **`page_version = V`**。语义：**该行的正文是「页面版本号仍为 V、尚未 bump 之前」的完整快照**。
- **唯一约束**：`(page_id, page_version)` 唯一，避免同一版本重复归档。
- **迁移**：`migrations/002_page_revision.up.sql`；全新建库见根目录 **`sql.sql`** 中 `sys_page_revision` 段。

**表字段（`sys_page_revision`）**

| 字段 | 说明 |
|------|------|
| `id` | uuid 主键 |
| `page_id` / `workspace_id` / `space_id` | 租户与归属，便于按工作区清理与鉴权 |
| `page_version` | 对应归档时的 `sys_page.version`（旧版号） |
| `content` | jsonb，该版完整正文 |
| `create_by` / `create_time` | 触发本次版本前进的用户与时间 |

**模型**：`model/page_revision.go`（`PageRevision`）。

#### 6.4.2 既有 Page 接口（与权限）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workspace/page/tree` | Query：`space_id`；需 Space **可读** |
| GET | `/api/workspace/page/detail` | Query：`id`；需 Space **可读** |
| POST | `/api/workspace/page/create` | 创建页；`checkPageMutate` |
| POST | `/api/workspace/page/move` | 树拖拽；`checkPageMutate` |
| DELETE | `/api/workspace/page/delete` | Query：`id`；`checkPageMutate` |

权限与 L1/L2/L3 关系见 **第 4.4 节**（写正文/树 = 工作区 member+ 且 **页有效角色 ≥ editor**）。

#### 6.4.3 保存、增量与恢复（HTTP）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/workspace/page/save` | **全文**保存。Body：`id`, `content`, `version`（必须与当前 `sys_page.version` 一致）。事务内：`SELECT ... FOR UPDATE` → 写 **`sys_page_revision`（`page_version = version`）** → 更新 `content` 且 `version+1`。冲突 **409** `ErrPageContentConflict`。 |
| POST | `/api/workspace/page/savePatch` | **RFC 6902** 增量。Body：`id`, `version`, `patch`（JSON 数组，作用于根文档 **`sys_page.content`**）。库：`github.com/evanphx/json-patch/v5`。成功响应含 **`version`**（新版本号）与合并后的 **`content`**（bytes）。补丁解码/应用失败 **400** `ErrPagePatchInvalid`。 |
| GET | `/api/workspace/page/revisions` | Query：`page_id`，`limit`（默认 50，最大 200）。响应：`{ "current_version", "revisions": [ { "page_version", "create_by", "create_time" } ] }`。仅元数据、**不含**大字段 `content`。需对该页所属 Space **可读**（`checkPageRead`）。 |
| GET | `/api/workspace/page/revision` | Query：`page_id`, `page_version`。响应含该版 **`content`** 及 `create_by` / `create_time`。需 **可读**。无该版快照 **404** `ErrPageRevisionNotFound`。 |
| POST | `/api/workspace/page/restoreRevision` | 将某历史快照写回为**最新一版**（先按当前头再归档一行，再写入快照正文并 `version+1`）。Body：`page_id`, `source_page_version`（要恢复的 `page_revision.page_version`）, `base_version`（当前页乐观锁，须等于 `sys_page.version`）。需 **`checkPageMutate`**（与 `save` 同级写权限）。 |

#### 6.4.4 请求体 DTO（`playload/page.go`）

| 结构体 | 用途 |
|--------|------|
| `MovePageReq` | 页面树拖拽 |
| `PageSavePatchReq` | `id`, `version`, `patch` |
| `PageRestoreRevisionReq` | `page_id`, `source_page_version`, `base_version` |
| `PageRevisionMetaDTO` | 快照列表单项（列表接口不返回 `content`） |

#### 6.4.5 响应与错误码（`errs` + `SendErr`）

| Sentinel | HTTP | 说明 |
|----------|------|------|
| `ErrPageContentConflict` | **409** | 乐观锁失败，需重新拉取 `detail` 再提交 |
| `ErrPagePatchInvalid` | **400** | `patch` 非法或应用后与合法 JSON 不符 |
| `ErrPageRevisionNotFound` | **404** | 请求的 `page_version` 无对应快照 |
| `ErrPageNotFound` | **404** | `page_id` 不存在或不属于当前工作区 / 已删 |

实现入口：**`services/pageService.go`**（`SaveContent`、`ApplyContentPatch`、`ListPageRevisionMeta`、`GetPageRevision`、`RestoreFromRevision`、`insertPageRevision`）、**`controller/pageCtrl.go`**（`Save`、`SavePatch`、`ListRevisions`、`GetRevision`、`RestoreRevision`）、路由 **`router/router.go`** `pageRg`。

#### 6.4.6 `savePatch` 请求示例（根 `content` 为数组时）

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "version": 3,
  "patch": [
    { "op": "add", "path": "/0", "value": { "type": "paragraph", "id": "blk_1" } }
  ]
}
```

`patch` 必须符合 [RFC 6902](https://datatracker.ietf.org/doc/html/rfc6902)；路径相对于 **`content` 根**（若根为对象则路径以 `/` 起始于对象属性）。

---

## 7. 服务与依赖关系（简图）

```
router.SetupRouter
  ├─ NewInviteService(db, wsm)
  │    ├─ Register(workspace, WorkspaceInviteAcceptor{db})
  │    ├─ Register(space, SpaceInviteAcceptor{db})
  │    └─ SetSpaceSendGuard(spaceSrv.Assert... + Validate...)
  ├─ NewSpaceService(db)
  ├─ NewSpaceAccessService(db, wsm, spaceSrv)
  ├─ NewPageService(db)          // 含 sys_page 与 sys_page_revision 写入/查询
  └─ NewWorkspaceService(db, wsm, inviteSrv)
```

**注意**：`SpaceAccessService` 依赖 `SpaceService` 的 `EffectiveSpaceRoleInTx`，**不要**构造 `SpaceService → SpaceAccessService → SpaceService` 的循环依赖；当前仅为单向依赖。

---

## 8. 通知与 WebSocket

### 8.1 通知类型

- `model.MsgTypeInvite`：工作区邀请。
- `model.MsgTypeSpaceInvite`：库邀请（`link_url` 形如 `/space_invite/accept/{invite_id}`，前端需路由对接）。

### 8.2 推送

- 邀请发送成功：`InviteService.Send` 在事务提交后对 `invitee_id` 所在房间 `Emit(..., "notification", payload)`。
- 成员变更：`SpaceAccessService` 在 Remove / UpdateRole / Transfer 成功后 `Emit` 自定义事件名（如 `space:removed`、`space:role_changed`、`space:demoted`、`space:promoted_owner`），payload 含 `space_id`、`workspace_id` 等。前端可按需订阅。

---

## 9. 级联软删（维护必读）

### 9.1 删除工作区 `WorkspaceService.SoftDelete`

在软删 workspace / workspace_user / space / page 之外，额外处理：

- `sys_invite`：`workspace_id` 命中行软删。
- `sys_notification` / `sys_notification_receiver`：通过 `related_id` 关联到上述 invite 的记录软删（避免孤儿通知）。
- `sys_space_access`：通过 `sys_space.workspace_id` 关联到该工作区下 **未删 space** 的 access 行软删。

### 9.2 删除库 `SpaceService.SoftDelete`

顺序上需处理依赖 `invite` / `notification` 的数据，再删 access、space、page（实现见代码内 `UPDATE ... FROM sys_invite` 等）。

### 9.3 工作区退群 / 踢人 `Leave` / `RemoveMember`

对 **目标用户** 软删其在该 `workspace_id` 下 **所有 space** 的 `sys_space_access`（直连 user 行），避免已非工作区成员仍保留库 ACL。

---

## 10. 错误处理规范

### 10.1 `app/errs`

集中定义可比较的业务错误（`errors.Is`），如 `ErrForbidden`、`ErrInviteNotFound`、`ErrAlreadyMember`、`ErrOnlySpaceOwnerDeletes` 等。

**页面版本与增量**（与 **第 6.4 节** 对齐）：`ErrPageContentConflict`、`ErrPagePatchInvalid`、`ErrPageRevisionNotFound`、`ErrPageNotFound`。

### 10.2 `playload.SendErr`

根据错误类型映射 HTTP 状态：

- 401 / 403 / 404 / 400 / **409**（如 `ErrPageContentConflict`）等，便于前端统一处理。

**建议**：新增业务错误时 **先在 `errs` 定义**，再在 `SendErr` 中补充映射分支。

---

## 11. 数据库迁移操作指南

### 11.1 全新环境

直接使用仓库内 **`sql.sql`** 建库即可（已含 `sys_invite`、`sys_space_access` 相关索引，以及 **`sys_page_revision`**）。

### 11.2 已有环境（从旧表升级）

1. 备份数据库。
2. 按 **`migrations/001_sys_invite_and_space_access.up.sql`** 顺序执行（若某步已执行过，需人工跳过或改写为幂等版本）。
3. 执行 **`migrations/002_page_revision.up.sql`**，创建 **`sys_page_revision`** 及索引（页面快照与增量保存依赖该表）。
4. 重点验证：
   - `sys_invite` 存在且旧数据 `scope_id` 已回填。
   - 每个未删除 Space 的创建者有一条 **`owner`** `space_access`（或等价迁移结果）。
   - 部分唯一索引 `idx_space_access_owner_unique` 创建成功（无重复 owner）。
   - `sys_page_revision` 存在，且 `(page_id, page_version)` 唯一约束生效。

### 11.3 应用与数据库版本对齐

部署顺序建议：**先迁移 DB，再发布依赖新表/新索引的后端版本**，避免运行期写入失败。

---

## 12. 开发规范与扩展点

### 12.1 新增一种 Invite Scope（例如「页面协作邀请」）

1. 在 `model` 中增加 `InviteScopeXxx` 常量。
2. 实现 `InviteAcceptor`：`Validate` + `OnAccept`。
3. `inviteSrv.Register(scope, acceptor)`。
4. 若发送前需额外校验，可仿照 `SetSpaceSendGuard` 增加专用 guard 或扩展 `InviteSendOpts`。
5. 通知：`MsgType` 扩展 + `notificationService` 中 `invite_status` 的 CASE 如需区分则同步修改。

### 12.2 新增 Space 角色

1. 修改 `model.SpaceRoleWeight` 与 `GetRoleByWeight`。
2. 全文搜索 `SpaceRole`、`sys_space_access`、`CASE WHEN role` 的 SQL（如 `GetMemberList`）。
3. 校验邀请/改角接口的 `binding:"oneof=..."` 与业务规则。

### 12.3 代码位置速查

| 主题 | 主要文件 |
|------|-----------|
| 邀请发送/接受/拒绝 | `services/invite_service.go` |
| 工作区邀请封装 | `services/workspaceService.go` |
| Space 权限与列表 | `services/spaceService.go` |
| Space 成员 CRUD / 转让 | `services/spaceAccessService.go` |
| Page 树/全文保存/增量/快照 | `services/pageService.go`，`controller/pageCtrl.go`，`model/page_revision.go`，`playload/page.go` |
| 路由与 DI | `router/router.go` |
| Space HTTP | `controller/spaceCtrl.go` |
| 通知列表 SQL | `services/notificationService.go` |
| Sentinel 错误 | `errs/errors.go`，`playload/response.go` |

---

## 13. 测试与验收清单（建议）

- [ ] 工作区邀请：发送 → 通知列表 → 接受 / 拒绝 → 成员表与邀请状态一致。
- [ ] 库邀请：Guard 拒绝非 admin 发送；受邀人非工作区成员拒绝；已是成员拒绝。
- [ ] 重复邀请：同一 scope + invitee 待处理记录被 **更新**（角色/过期时间），通知可更新。
- [ ] 接受后 `sys_space_access` Upsert 正确；唯一索引无冲突。
- [ ] `TransferOwner` 后旧 owner 为 admin，新 owner 唯一；并发转让行为符合预期（行锁 + 唯一约束）。
- [ ] `RemoveMember` / `UpdateRole` 对 owner 的保护规则。
- [ ] 删除 Space / Workspace 后无「仍可点的死链通知」。
- [ ] 用户被踢出工作区后，其在该工作区下所有 Space 的 ACL 被清理。
- [ ] Page：`save` / `savePatch` 成功后 `sys_page.version` 递增，且 **`sys_page_revision`** 出现对应 **`page_version`** 的快照行。
- [ ] Page：`save` / `savePatch` 在错误 `version` 时返回 **409**，客户端重拉 `detail` 后可再次提交。
- [ ] Page：`revisions` / `revision` 只读权限与 `detail` 一致；`restoreRevision` 与 `save` 写权限一致。
- [ ] Page：`savePatch` 非法 `patch` 返回 **400**，不污染 `sys_page`。

---

## 14. 常见问题（FAQ）

**Q：`GrantAccess` 以前报错或行为怪异？**  
A：历史上缺少 `idx_space_access_unique`，PostgreSQL 的 `ON CONFLICT` 不生效。迁移后应正常。

**Q：工作区 Owner 为何能管所有库？**  
A：由 `EffectiveSpaceRole` 中对工作区 `owner` 的 **级联 admin** 实现；若产品改为不级联，只改该函数及相关说明即可。

**Q：`create_by` 还是库「所有者」吗？**  
A：**否。`create_by` ≠ 当前业务所有者。**  
- **原始创建者**：`sys_space.create_by`（恒不变，审计/兜底至少 Viewer）。  
- **当前业务所有者**：`sys_space_access` 中 `subject_type=user` 且 `role=owner` 的那条主体；**转让所有权只改 ACL，不改 `create_by`。**  
`GET .../space/:id` 与 **`GET .../space/list` 每条**均返回 `original_creator_id`（= `create_by`）与 `business_owner_id`（ACL owner 的 user id），避免前端混用；`space/list` 在有条目时**始终**走批量填充（与 `with_members` 无关），以便 `role`、`can_manage_space_members`、成员预览等口径一致。

**Q：列表里 `role` 是 admin，为什么不在 `GET .../space/members` 里？**  
A：`role` 使用 `EffectiveSpaceRole`，含**工作区 owner**在开放式库上的**级联空间 admin**（无 `sys_space_access` 行也会出现）。成员接口只统计 **ACL 个人/组展开 + create_by 兜底**，不含纯级联。列表与详情增加 **`can_manage_space_members`**：仅当当前用户对**该库**存在 **sys_space_access 个人或组**命中且有效角色不低于 admin 时为 `true`，用于「添加成员」等与成员表一致的 UI；发邀请等接口仍可按原 `role` / 服务端校验处理。

**Q：成员管理列表里「创建者」和角色标签怎么显示？**  
A：仅**本接口返回的成员行**（即已在库成员口径内）渲染。  
- **实际角色**：`role` 为合法空间角色且非 `none` 时显示角色标签。  
- **创建者**：`is_original_creator === true` 时显示「创建者」灰标。  
同一人既是原始创建者又是 ACL owner 时**两个标签都显示**；转让后原创建者降为管理员等时，保留「创建者」+ 其实际 `role` 标签（若有）。

**Q：前端如何区分两类邀请？**  
A：使用 `notification.msg_type`：`invite` vs `space_invite`，`link_url` 路径不同。

**Q：`sys_page_revision` 里会不会有「当前 `sys_page.version`」那一行？**  
A：**不会自动存当前头**。表中每一行是某次版本前进时归档的**旧版**；当前正文始终在 **`sys_page`**。列表接口里的 `current_version` 来自 **`sys_page.version`**。

**Q：第一次保存（version 1→2）快照里存的是哪一版？**  
A：归档 **`page_version = 1`** 时的整份 `content`，然后页面变为 `version = 2`。

**Q：库「成员管理」里邀请成功，为什么人数还是 1？**  
A：**发送邀请 ≠ 对方已加入**。`POST .../space/invite` 成功只表示待处理邀请已发出；`member_count` 与 `GET .../space/members` 统计的是 **已进入库的成员**（创建者 + `sys_space_access` 个人/组展开），**不含**仅持「待处理邀请」的人。对方在通知里 **接受** `space_invite` 并写入 `sys_space_access` 后，人数才会增加；前端应在 `acceptInvite` 成功后再拉 `space/list` 或 `space/:id` 与 `members`。

**Q：通知里「工作区加入邀请」已同意，为什么某个库成员还是 1？**  
A：**工作区邀请**与 **库邀请** 是两条线：同意工作区邀请只会写入 `sys_workspace_user`，**不会**自动加入任一库；库人数只随 **`scope_type=space` 的邀请接受** 或管理员直接授权变化。

**Q：点「同意」提示「已是成员」？**  
A：常见于 **重复点击**、**已通过其他入口加入** 或 **通知列表里混有已处理邀请**。`InviteService.Accept` 在 `Validate` 返回 `ErrAlreadyMember` 时，会将该条待处理邀请 **标记为已接受** 并 **标记通知已读**，避免同一通知反复报错；若邀请已处于「已接受」状态再次调用 `Accept`，**幂等成功**（不报错）。

---

## 15. 文档维护

- 本文档路径：`editor/server/docs/SPACE_INVITE_AND_MEMBER_DESIGN.md`。
- 重大行为变更（新 scope、级联策略变更、API 变更、**Page 版本/快照**）请 **同步更新** 本文档与 `sql.sql` / `migrations`（含 **`002_page_revision`**）目录说明。

---

*文档对应实现版本：以仓库内 `sys_invite`、`InviteService`、`SpaceRoleOwner`、`sys_page_revision`、`PageService`（`SaveContent` / `ApplyContentPatch` / 快照查询与恢复）及上述文件为准。*
