https://www.jq22.com/demojq22ys/jqueryspmoban202005080854/home.html

https://www.jq22.com/demojq22ys/chatmoban202008030025/dark.html

https://www.jq22.com/demojq22ys/job-search-platform-ui202011020030/

https://www.jq22.com/demojq22ys/jqueryWebshejiaomoban202101180005/explore.html

https://www.jq22.com/demojq22ys/jqueryGrjlmoban202102110034/

https://www.jq22.com/demojq22ys/rwglmoban202111092348/

https://fontello.com/

https://svgomg.net/

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


1. 核心权限与组织拓扑 (Core & Org)
这部分定义了“谁”在“哪个空间”以及“属于哪个部门”。
表名	角色/性质	核心关联 (外键逻辑)	说明
sys_user	实体	-	基础用户账号信息
sys_workspace	容器	-	顶层租户空间，所有数据的物理边界
sys_workspace_user	关联/中间层	sys_user + sys_workspace	定义用户属于哪个工作区，及空间内角色(Owner/Admin)
sys_group	组织结构	sys_workspace + parent_id(自引用)	支持无限级部门树
sys_group_user	关联	sys_group + sys_user	定义用户在部门内的身份（组长/组员）
2. 知识库内容拓扑 (Content Hierarchy)
这部分定义了文档的存储层级。
表名	角色/性质	核心关联 (外键逻辑)	说明
sys_space	内容容器	sys_workspace	知识库（类似 Wiki 项目），按可见性隔离内容
sys_page	内容实体	sys_space + parent_id(自引用)	具体的页面数据，支持无限级嵌套页面树
3. 精细化授权拓扑 (Access Control List)
这部分通过“主体-客体”模式，解决了灵活的权限分配。
表名	授权对象	授权主体 (subject_type)	说明
sys_space_access	sys_space (库级)	sys_user 或 sys_group	给特定人员或整个部门分配知识库权限
sys_page_access	sys_page (页面级)	sys_user 或 sys_group	针对单个私密页面进行特许授权
关系拓扑逻辑总结：
垂直隔离：所有业务表（Group, Space, Page）均携带 workspace_id，实现物理层面的租户隔离。
树状结构：sys_group 和 sys_page 通过 parent_id 字段实现递归拓扑（即文件夹套文件夹、部门套部门）。
多对多映射：
用户与工作区、用户与组、用户与页面均通过关联表解耦。
权限表（Access 表）支持 多类型主体（用户或组），这是一种典型的 RBAC（基于角色的访问控制）与 ACL（访问控制列表）的结合设计。

![alt text](7752d9c4633ad32fe82c294d9fb62a9.png)
一、 用户与工作区 (核心账户体系)
1. sys_user (用户表)
存储用户的基本账号信息、个人资料及状态。
id: 唯一标识 (UUID)
username: 登录名 (唯一)
password: 加密后的密码
real_name: 真实姓名
code: 工号/编号
sex: 性别 (0:男, 1:女)
role_code: 全局角色编码 (用于系统管理级权限)
identity_card: 身份证号
birthday: 出生日期
address: 联系地址
head_sculpture: 头像 URL
status: 账号状态 (1:正常, 0:禁用)
email / mobile: 邮箱与手机号
login_time: 最后登录时间
create/update/delete_time: 审计时间戳 (支持软删除)
2. sys_workspace (工作区/租户表)
最高层级的容器，实现多租户隔离。
id: 唯一标识
name: 空间名称
description: 空间简介
logo: 空间图标
slug: 唯一路径标识 (用于 URL，如 ://work.com)
custom_domain: 自定义域名
settings: 空间配置 (JSONB 格式，如主题、语言)
email_domains: 允许加入的邮箱后缀 (JSONB)
default_space_id: 默认选中的知识库 ID
create/update/delete_time: 审计时间戳
3. sys_workspace_user (工作区-用户关联表)
定义用户在特定工作区内的身份。
workspace_id / user_id: 关联的工作区和用户
role: 在该工作区的角色 (owner:所有者, admin:管理员, member:成员, guest:访客)
status: 成员在该空间的状态
is_default: 是否为该用户的默认工作区
last_access_time: 在该空间的最后活跃时间
join_time: 加入时间
二、 组织架构 (部门/小组)
4. sys_group (组/部门表)
name: 部门名称
workspace_id: 所属工作区
parent_id: 父级 ID (用于实现无限级部门树)
create_by: 创建者 ID
5. sys_group_user (组-用户关联表)
group_id / user_id: 关联的组和用户
role: 组内职务 (leader:组长, member:组员)
join_time: 入组时间
三、 内容管理 (知识库与页面)
6. sys_space (知识库表)
类似项目、Wiki 库。
workspace_id: 所属工作区
name: 知识库名称
icon: 图标
visibility: 可见性 (workspace:全员可见, private:仅授权可见)
create_by: 创建者 ID
7. sys_page (页面表)
具体的文档内容。
workspace_id: 冗余字段，用于快速跨表隔离查询
space_id: 所属知识库
parent_id: 父页面 ID (用于实现无限级页面嵌套)
title: 标题 (默认“未命名”)
content: 内容主体 (JSONB，适配 Block 编辑器数据)
visibility: 页面可见性 (workspace/private)
share_enabled / share_token: 外部链接分享开关及令牌
create_by / update_by: 创建人与最后修改人
四、 权限授权 (ACL 访问控制)
8. sys_space_access (知识库授权表)
针对“私密知识库”给特定人员或部门开门。
space_id: 目标知识库
subject_type: 授权主体类型 (user:个人, group:整个部门)
subject_id: 对应 UserID 或 GroupID
role: 权限等级 (admin:管理, editor:编辑, viewer:只读)
expired_time: 授权到期时间 (支持临时访问)
9. sys_page_access (页面授权表)
针对“特定页面”的精细化权限覆盖。
page_id: 目标页面
subject_type / subject_id: 授权给谁 (人或组)
role: 权限等级 (manager/editor/viewer)
expired_time: 到期时间
字段设计亮点：
JSONB 使用：settings 和 content 使用 JSONB，方便未来扩展功能而无需频繁修改表结构。
软删除支持：所有核心表都有 delete_time，配合唯一索引中的 WHERE delete_time IS NULL，保证了数据可恢复性。
灵活授权：通过 subject_type 将用户和部门统一抽象为“授权主体”，这是构建复杂权限系统的标准做法。



1. Workspace Home (工作区概览/主页)
这是用户登录后的“第一落脚点”，侧重于跨空间的信息聚合。
核心功能组件：
最近访问 (Recently Accessed)： 从 sys_workspace_user.last_access_time 和 sys_page.last_access_time 取前 5-10 条记录。
待办/动态 (Activities)： 聚合当前用户所属所有 Space 的更新（基于 sys_page.update_time）。
快速入口 (Quick Links)：
“我创建的页面” (Filter: create_by = current_user)。
“我的收藏/星标” (建议在 sys_page 基础上增加一个 sys_favorite 关联表)。
空间列表 (All Spaces)： 展示该 Workspace 下所有 visibility = 'workspace' 的空间，以及用户有权访问的 private 空间。
2. Space Home (知识库主页)
当用户点击进入某个具体的 sys_space 后，侧重于该空间的结构化呈现。
左侧导航菜单设计：
顶部： 空间名称 + 图标（取自 sys_space.icon）。
树形结构： 递归查询 sys_page (其中 parent_id IS NULL 为一级页面)。
空间成员： 快速查看谁有权限（关联 sys_space_access）。
主内容区 (Home Dashboard) 建议：
空间公告/简介： 在 sys_space 增加一个 description 字段作为空间简介。
页面分类索引： 自动列出该空间下的一级页面标题。
权限概览： 提示当前用户是 admin、editor 还是 viewer（来自 sys_space_access.role）。

如果你希望产品体验更好，建议在 UI 上做如下区分：
Workspace Home (全局主页)：展示用户最常去的几个 Space 卡片，或者所有 Space 的列表。
Space Home (空间主页)：点击进入某个空间后，默认展示该空间下 parent_id IS NULL 的所有一级页面。
一个微小的表结构优化建议：
既然 sys_space 是平级的，你可以在 sys_space 表里加一个 sort_order (integer) 字段。
理由：用户通常希望手动调整空间在左侧菜单的先后顺序（比如把“核心文档”排在第一位），如果没有排序字段，数据库默认只能按创建时间或名称排序。

3. 菜单层级 UI 结构参考

[Workspace Selector] (切换不同 sys_workspace)
---------------------------
🏠 Home (Workspace 概览)
🕒 最近访问
⭐ 个人收藏

[Spaces 分组] (从 sys_space_access 和 sys_space 查询)
├─ 📂 研发中心 (Space Home)
│  ├─ 📄 开发规范 (Page)
│  └─ 📁 架构设计 (Parent Page)
│     └─ 📄 数据库 Schema (Child Page)
├─ 📂 产品文档 (Space Home)
└─ ➕ 创建新空间 (Create Space)

---------------------------
⚙️ 工作区设置 (Admin Only)
👤 个人中心

4. 关键交互逻辑提示
权限隔离：
在加载菜单时，必须根据 sys_space_access 过滤掉用户不可见的私有空间。
如果 sys_space.visibility = 'workspace'，则该工作区所有成员默认可见（Role 默认为 viewer）。
默认空间：
用户首次登录应跳转到 sys_workspace_user.is_default = true 的工作区。
面包屑导航 (Breadcrumbs)：
在 Space Home 内部移动时，需要根据 sys_page.parent_id 向上递归生成路径：空间名 / 父页面 / 当前页面。


1. 查询当前用户有权访问的“空间列表”
这个查询结合了“全员可见（workspace）”和“私有授权（private）”两种逻辑。
sql
-- 假设当前用户 ID 为 :current_user_id，当前工作区为 :workspace_id
SELECT DISTINCT s.*, 
       COALESCE(sa.role, 'viewer') as user_role -- 如果是空间全员可见但没单独授权，默认为访客/查看者
FROM sys_space s
LEFT JOIN sys_space_access sa ON s.id = sa.space_id 
    AND ((sa.subject_type = 'user' AND sa.subject_id = :current_user_id)
         OR 
         (sa.subject_type = 'group' AND sa.subject_id IN (
             SELECT group_id FROM sys_group_user WHERE user_id = :current_user_id AND delete_time IS NULL
         )))
WHERE s.workspace_id = :workspace_id
  AND s.delete_time IS NULL
  AND (
    s.visibility = 'workspace'  -- 全员可见
    OR sa.id IS NOT NULL        -- 或者在授权表中能找到记录（个人或所属组）
  );
请谨慎使用此类代码。

2. 递归查询某个空间下的“页面树结构”
为了前端方便渲染左侧菜单，通常需要一次性查出层级关系。这里使用 PostgreSQL 的 WITH RECURSIVE。
sql
-- 假设当前操作的空间 ID 为 :space_id
WITH RECURSIVE page_tree AS (
    -- 1. 定位根页面（没有父页面的页面）
    SELECT 
        id, parent_id, title, icon, space_id, 1 as level,
        ARRAY[title] AS path -- 用于排序，防止同层级乱序
    FROM sys_page
    WHERE space_id = :space_id 
      AND parent_id IS NULL 
      AND delete_time IS NULL

    UNION ALL

    -- 2. 递归关联子页面
    SELECT 
        p.id, p.parent_id, p.title, p.icon, p.space_id, pt.level + 1,
        pt.path || p.title
    FROM sys_page p
    JOIN page_tree pt ON p.parent_id = pt.id
    WHERE p.delete_time IS NULL
)
SELECT * FROM page_tree 
ORDER BY path; -- 按路径排序，保证父子关系在视觉上连续
请谨慎使用此类代码。

3. 开发建议（避坑指南）
性能优化：如果页面数量上万，不要每次点开 Space 都递归查询全量树。建议初始只查 parent_id IS NULL 的一级页面，用户点击展开时，再按需加载下一级。
权限穿透：在查询页面树时，通常遵循“空间有权限，其下页面皆可见”的逻辑。但如果你在 sys_page_access 里设置了更细的权限，记得在递归查询中加入 sys_page.visibility 的判断。
Breadcrumbs（面包屑）：
当用户直接访问某个深层页面 ID 时，反向递归 parent_id 直到 NULL，即可拼出 空间 / 文件夹 A / 文件夹 B / 当前页面 的路径。



1. 准备工作与核心材料
公司名称：格式通常为“杭州 + 字号 + 行业 + 有限公司”。
注册地址：需提供租赁合同或房产证明。若无办公场所，可咨询财务公司使用园区挂靠地址。
注册资本：现行法律实行认缴制，无需即时实缴。
人员身份信息：包括法定代表人（可由股东兼任）、财务负责人、监事（注意： 一个人公司也需要设一名监事，不能与法人为同一人）。 
2. 注册流程
核名（名称预先核准）：登录 浙江企业号 或“浙里办”搜索“企业开办”，提交拟定名称进行系统查重。
提交申请材料：在线填写经营范围、注册资本、股东信息等，并上传地址证明材料。
电子签名：所有相关人员（股东、法人、监事等）通过手机进行身份核验和电子签名。
审核与领证：工商部门审核（通常 1-3 个工作日），审核通过后，营业执照可选择邮寄到家或现场领取。 
浙江省企业之家网
浙江省企业之家网
3. 后续事项
刻章：杭州大部分地区提供“开办礼包”，首套公章（公章、财务章、法人章、发票章）通常由政府免费赠送。
银行开户：预约银行办理企业基本存款账户，需法人到场。
税务报到：领证后 30 天内，需在电子税务局进行信息采集，并按月或季度进行纳税申报。 
💡 特别提醒
数量限制：一个自然人全国范围内只能投资设立 1 个“一人有限责任公司”。
连带责任：如果股东不能证明公司财产独立于股东自己的财产，需对公司债务承担连带责任。 


文件：
支持 表情 (Emoji/Sticker)、图标 (Icon)、头像 (Avatar)、文件 (File) 的多种上传场景，sys_files 的设计需要兼顾 “公共快速访问” 与 “私有安全隔离”。
建议通过 RelatedType 和 Visibility 的组合来区分处理。以下是针对不同类型的具体配置建议：
1. 前端如何传？
在调用 Upload、CheckChunks 或 MergeChunks 接口时，前端必须在 FormData 或 URL 参数中携带 related_type。
头像上传：传 related_type: "avatar"
表情上传：传 related_type: "emoji"
页面附件：传 related_type: "page"，同时传 related_id: "当前页面ID"
聊天图片：传 related_type: "chat"
2. 后端如何区别并设置权限？
后端不依赖前端传“权限等级”（防止前端伪造），而是通过我们在代码中定义的 TypeConfigMap 进行映射。
业务声明 (RelatedType)	对应的文件性质	后端自动设置的权限 (Visibility)	后端存储子路径 (SubPath)
avatar	用户头像	public (所有人可见)	/public/avatars
emoji	表情包	public (全空间可见)	/public/emojis
icon	空间图标	public (全空间可见)	/public/icons
page	文档附件/图片	inherit (跟随页面权限)	/attachments/pages
chat	聊天文件	inherit (跟随频道权限)	/attachments/chats
3. 代码实现逻辑
在你的 MergeChunks 或 Upload 控制器中，利用这个变量化的 Map：
go
// 1. 拿到前端传来的类型
relType := params.RelatedType // 例如 "avatar"

// 2. 从变量化配置中查表
config, ok := model.TypeConfigMap[relType]
if !ok {
    return errors.New("非法上传类型")
}

// 3. 这里的 config.Visibility 和 config.SubPath 就决定了它的命运
m := model.Files{
    RelatedType: relType,
    Visibility:  config.Visibility, // 自动变量化设置：如果是 avatar 则是 public
    Path:        filepath.Join(basePath, config.SubPath, filename),
    // ...
}
请谨慎使用此类代码。
4. 访问时的区别对待
权限变量化后，下载接口（或 Nginx）的处理逻辑就清晰了：
静态直连 (针对 public)：
配置 Nginx 直接代理 /uploads/public/ 目录。前端直接通过 https://cdn.com 访问，无需后端鉴权。
鉴权下载 (针对 inherit)：
前端访问 /api/files/download/{id}。后端查库发现 visibility = 'inherit'，则去校验用户是否有 related_id (如页面) 的查看权限，通过后才读取文件流。


1. 不同业务场景的给值建议
场景	related_type (前端传)	related_id (前端传)	说明
上传头像	"avatar"	当前用户的 user_id	文件将存入 public/avatars，权限为 public
上传空间 Logo	"icon"	当前空间的 workspace_id	文件将存入 public/icons，权限为 public
页面内插入图片	"page"	当前编辑的 page_id	权限设为 inherit，只有能看该页面的用户才能看图
聊天发送文件	"chat"	当前会话的 chat_id	权限设为 inherit，跟随聊天会话权限
表情包上传	"emoji"	000...000 (或忽略)	表情通常是全局或空间共享，ID 可传空 UUID
2. 前端请求示例 (JavaScript/Axios)
前端在调用接口时，应根据当前操作的模块动态填充这两个参数：
javascript
// 示例：在 ID 为 "p-12345" 的页面中上传附件
const formData = new FormData();
formData.append('file', fileFile);
formData.append('hash', fileHash);
formData.append('related_type', 'page');    // 声明这是页面附件
formData.append('related_id', 'p-12345');   // 声明所属页面 ID

axios.post('/api/files/upload', formData);
请谨慎使用此类代码。
3. 后端 Service 层赋值逻辑
在抽离后的 SaveFileRecord 方法中，你应该这样处理这两个值：
go
func (s *FileService) SaveFileRecord(ctx context.Context, params playload.MergeChunksRequest, res *MergeResult, user *model.User, wsID uuid.UUID) (*model.Files, error) {
    // 1. 验证 related_id 是否为合法 UUID
    relID, err := uuid.Parse(params.RelatedID)
    if err != nil {
        // 如果是头像且没传 ID，可以默认设为用户 ID
        if params.RelatedType == model.TypeAvatar {
            relID = user.ID
        } else {
            return nil, errors.New("无效的关联 ID")
        }
    }

    // 2. 从变量化配置映射表中获取该类型的权限 (Visibility)
    cfg := model.TypeConfigMap[params.RelatedType]

    // 3. 构造记录
    fileRecord := &model.Files{
        ID:          uuid.New(),
        WorkspaceID: wsID,
        RelatedType: params.RelatedType, // 来自参数：如 "page"
        RelatedID:   relID,              // 来自参数：如 页面ID
        Visibility:  cfg.Visibility,     // 自动匹配变量化权限：如 "inherit"
        
        Name:        params.FileName,
        Path:        res.PhysicalPath,   // 来自物理合并结果
        Size:        res.Size,           // 来自物理合并结果
        Status:      1,                  // 写入即成功
        // ... 其他审计字段
    }

    return fileRecord, s.Dao.DB.WithContext(ctx).Create(fileRecord).Error
}
请谨慎使用此类代码。
4. 关键点：如果 related_id 还没生成怎么办？
有些场景下，用户是“先传文件，后点保存”。例如发朋友圈，图片还没传完，帖子 ID 还没生成：
方案 A (推荐)：前端先生成一个 客户端 UUID，上传时带着这个 ID，保存帖子时后端也用这个 ID。
方案 B (临时态)：上传时 related_id 传空（或 0），此时文件 status = 0。等到业务数据（如 Page）保存成功后，再反向更新 sys_files 的 related_id 和 status。
总结
related_type：前端必须明确传（用于确定存储路径和权限变量）。
related_id：前端根据当前业务模块传。
提供一个 后端验证逻辑，用来确保用户传的 related_id 确实属于他所在的 workspace_id？（防止越权关联）


Visibility 的给值绝不能由前端直接传值（防止用户伪造请求将私密文件设为 public）。它应该由后端根据 RelatedType 在变量化配置表中自动匹配。
以下是 Visibility 的赋值逻辑和具体实现：
1. 自动映射逻辑
在你的 model/constants.go 中，我们已经定义了配置矩阵。Visibility 的值直接从这里取：
业务类型 (RelatedType)	自动匹配的 Visibility	含义
avatar / icon / emoji	public	存放在 uploads/public，所有人直接通过 URL 可看。
page / space / chat	inherit	存放在 uploads/attachments，必须通过后端接口校验业务权限。
user_private (可选)	private	只有上传者本人能看。
2. 在 SaveFileRecord 中赋值
在入库方法中，根据前端传来的 RelatedType 查表获取 Visibility：
go
func (s *FileService) SaveFileRecord(ctx context.Context, params playload.MergeChunksRequest, res *MergeResult, user *model.User, wsID uuid.UUID) (*model.Files, error) {
    
    // 1. 从预设的变量化配置中获取权限
    // 这里的 model.TypeConfigMap 是我们在 constants.go 中定义的 map
    cfg, ok := model.TypeConfigMap[params.RelatedType]
    if !ok {
        return nil, errors.New("不支持的业务类型，无法分配权限")
    }

    // 2. 解析 RelatedID
    relID, _ := uuid.Parse(params.RelatedID)

    // 3. 构造模型，Visibility 自动设为配置值
    fileRecord := &model.Files{
        ID:          uuid.New(),
        WorkspaceID: wsID,
        RelatedType: params.RelatedType,
        RelatedID:   relID,
        
        // 关键点：这里是变量化赋值，不是由前端传参决定的
        Visibility:  cfg.Visibility, 
        
        Path:        res.PhysicalPath,
        Size:        res.Size,
        Status:      1, // 已完成
        CreateBy:    user.ID,
        // ...
    }

    return fileRecord, s.Dao.DB.WithContext(ctx).Create(fileRecord).Error
}
请谨慎使用此类代码。
3. 为什么要这样设计？（安全性）
权限隔离：如果前端恶意发送一个请求，尝试上传一份敏感合同但 RelatedType 设为 avatar。后端会将该文件存入 public/avatars 目录。虽然它变公开了，但由于物理路径也变了，攻击者无法通过猜测 attachments/pages 的路径来批量扫描敏感文件。
业务一致性：所有“页面附件”统一都是 inherit，所有“头像”统一都是 public。维护人员只需看一眼配置表就能确认系统的权限模型，不会因为前端传错参数导致权限漏洞。
4. 特殊情况：手动覆盖
如果你确实需要某个特定的 page 附件是对外公开的（比如公开的文档），建议的做法是：
在 sys_page 表里设置 share_enabled = true。
当用户请求文件时，后端检查该文件所属的 page 是否开启了分享，而不是修改 sys_files 表里的 Visibility 字段。
总结：
Visibility 是后台静默赋值。前端传 related_type，后端通过 TypeConfigMap 自动翻译成对应的 Visibility。
你现在的 TypeConfigMap 已经定义好了吗？如果需要，我可以为你写一个更稳健的 map 查找函数。 [1, 3, 5]


在文件上传目录中引入这些 ID 作为路径，主要目的是实现物理级别的租户隔离、提高系统可伸缩性以及简化运维管理。
建议方案：必须包含 workspace_id，建议包含 related_type，可选包含 related_id。
1. 推荐的目录结构
text
./uploads
├── temp/                          # 临时分片目录（仅以 Hash 命名）
│   └── {hash}/                    # 0, 1, 2... 分片文件
├── {workspace_id}/                # 第一级隔离：工作区（租户）
│   ├── public/                    # 公共资源（头像、图标）
│   │   ├── avatars/               # {file_id}.png
│   │   └── emojis/
│   └── attachments/               # 私有附件（页面、聊天）
│       ├── pages/                 # 建议增加：{page_id}/{file_id}.pdf
│       └── chats/                 # {chat_id}/{file_id}.jpg
请谨慎使用此类代码。
2. 为什么要加这些 ID？
A. 必须加 workspace_id (租户隔离)
物理隔离：确保 A 公司的数据和 B 公司的数据在磁盘文件夹层面是分开的。
容灾与迁移：如果某个大客户（Workspace）想要导出所有数据或独立部署，你只需要打包对应的文件夹即可，不需要在数百万文件中进行过滤。
配额统计：通过计算文件夹大小，可以极快地得出某个工作区消耗了多少存储空间。
B. 建议加 related_type (逻辑分类)
权限分流：方便 Nginx 配置。例如：location /uploads/{ws_id}/public/ 直接直连，而 attachments 路径则不配置静态映射，强制走后端鉴权。
C. 可选加 page_id 或 related_id (业务归口)
清理便利性：当一个页面（Page）被彻底删除时，你可以快速定位并删除该路径下的所有附件。
避免单目录文件过多：Linux 文件系统（如 Ext4）在单个目录下文件超过几万个时，性能会大幅下降。加入 page_id 层级可以天然分散压力。
3. 实现时的注意事项
路径深度限制：目录层级不宜过深（建议控制在 5 层以内），否则会增加 IO 开销。
RelatedID 游离问题：
由于你采用了“先上传、后绑定”的策略，上传时可能还没有 page_id。
解决方案：如果上传时没有 page_id，先存放在 {workspace_id}/attachments/uncategorized/ 下。等到绑定时，不移动物理文件（移动文件开销大），仅在数据库记录 related_id 即可。
4. 代码中的动态路径生成示例
go
func getSaveDir(basePath string, wsID string, relType string, relID string) string {
    cfg := model.TypeConfigMap[relType]
    
    // 基础路径: ./uploads/{workspace_id}/{sub_path}
    dir := filepath.Join(basePath, wsID, cfg.SubPath)
    
    // 如果是页面附件且有 ID，增加一层 page_id 目录
    if relType == "page" && relID != "" && relID != uuid.Nil.String() {
        dir = filepath.Join(dir, relID)
    }
    
    return dir
}
请谨慎使用此类代码。
总结
workspace_id：必须加，解决“谁的东西”的问题。
related_type：必须加，解决“什么权限”的问题。
page_id：推荐加，解决“性能和运维”的问题。


related_id 具有多重身份（既可以是空间 ID、用户 ID，也可以是页面 ID），那么在使用时必须遵循 “类型 + ID”双重绑定 的原则。
在数据库中，related_type 是身份说明书，related_id 是具体证件号。
1. 业务上的具体用法
根据前端传入的 related_type，后端对 related_id 进行不同的逻辑处理：
业务场景	related_type	related_id 填什么	存储路径示例
修改头像	avatar	userId	uploads/{ws_id}/public/avatars/{userId}.png
修改空间Logo	icon	workspaceId	uploads/{ws_id}/public/icons/{ws_id}.png
页面附件	page	pageId	uploads/{ws_id}/attachments/pages/{pageId}/{file_id}.zip
表情包	emoji	workspaceId	uploads/{ws_id}/public/emojis/{file_id}.webp
2. 代码层面的路径生成逻辑
在 MergeChunks 或 PhysicalMerge 中，利用这两个字段动态构建物理路径。这样可以确保文件在磁盘上的存放是有序且可控的。
go
func (s *FileService) GetPhysicalPath(basePath string, wsID uuid.UUID, relType string, relID *uuid.UUID) string {
    cfg := model.TypeConfigMap[relType]
    
    // 基础隔离：./uploads/{workspace_id}/{public|attachments}/{category}
    pathParts := []string{basePath, wsID.String(), cfg.SubPath}

    // 特殊逻辑：如果是页面或聊天，增加二级目录防止单目录文件过多
    if relID != nil && (relType == "page" || relType == "chat") {
        pathParts = append(pathParts, relID.String())
    }

    return filepath.Join(pathParts...)
}
请谨慎使用此类代码。
3. 权限控制的判定逻辑
当用户尝试查看文件时，后端通过 related_type 决定去哪张表校验 related_id 的权限：
go
func (s *FileService) CheckAccess(userID uuid.UUID, file model.Files) bool {
    // 1. 公开资源直接放行
    if file.Visibility == "public" {
        return true
    }

    // 2. 私有资源根据类型去对应的业务表查权限
    switch file.RelatedType {
    case "page":
        // 校验 userID 是否在 sys_page_access 中对 file.RelatedID (pageId) 有查看权
        return s.checkPageAccess(userID, *file.RelatedID)
    case "chat":
        // 校验 userID 是否在聊天会话成员中
        return s.checkChatAccess(userID, *file.RelatedID)
    case "avatar":
        // 头像通常是公开的，但如果是私密头像，校验 userID == file.RelatedID
        return userID == *file.RelatedID
    }
    
    return false
}
请谨慎使用此类代码。
4. 为什么这样设计（核心价值）
物理隔离透明化：
如果你要删除整个 Workspace，直接 rm -rf ./uploads/{workspace_id}。
如果你要清理某个页面的所有附件，直接 rm -rf .../pages/{page_id}。
避免单文件夹瓶颈：
如果所有图片都存放在一个文件夹，当文件达到 10 万个时，读取速度会极慢。通过 page_id 或 user_id 做子目录，能有效分散文件压力。
多态关联：
一个 sys_files 表就能支持全系统的文件管理（头像、文档、背景图、聊天文件），不需要为每个业务模块单独建文件表。
5. 注意事项：
空值处理：由于你之前将 RelatedID 改为了指针 *uuid.UUID，在使用前一定要做 nil 判断。
先上传后绑定：如果是先上传，RelatedID 为 nil，此时路径可以先放在 temp 或 uncategorized 目录下，等到绑定时再更新数据库记录。物理文件通常不需要移动（为了性能），除非你对磁盘目录整洁度有极高要求。
总结建议：
前端传 related_type 和 related_id。后端根据 类型 决定 权限和存放位置，根据 ID 决定 具体的归属对象。


由于 RelatedID 具有多态性（对应不同的业务表），在 SQL 层面无法直接通过一个 JOIN 搞定所有情况。
建议在 Service 层 实现一个分流鉴权逻辑：首先查出文件信息，然后根据其 RelatedType 决定去关联哪张权限表。
1. 核心权限查询 SQL (GORM 风格)
这里的逻辑是：如果是页面附件，去校验 sys_page_access；如果是知识库，去校验 sys_space_access。
go
func (s *FileService) CheckUserAccess(ctx context.Context, userID uuid.UUID, file *model.Files) (bool, error) {
	// 1. 基础校验：如果是公开资源，直接放行
	if file.Visibility == model.VisPublic {
		return true, nil
	}

	// 2. 身份校验：如果是上传者本人，直接放行
	if file.CreateBy == userID {
		return true, nil
	}

	// 3. 空间管理校验：如果是该 Workspace 的 Owner 或 Admin，直接放行
	var role string
	err := s.Dao.DB.WithContext(ctx).Table("sys_workspace_user").
		Select("role").
		Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", file.WorkspaceID, userID).
		Scan(&role).Error
	if err == nil && (role == "owner" || role == "admin") {
		return true, nil
	}

	// 4. 业务多态校验：根据 RelatedType 穿透到对应的权限表
	if file.RelatedID == nil {
		return false, nil // 未绑定的私密文件，非本人不可见
	}

	var count int64
	switch file.RelatedType {
	case model.TypePage:
		// 检查用户是否有该页面的访问权 (sys_page_access)
		s.Dao.DB.WithContext(ctx).Table("sys_space_access"). // 实际逻辑通常先看Space再看Page
			Table("sys_page_access").
			Where("page_id = ? AND subject_id = ? AND delete_time IS NULL", file.RelatedID, userID).
			Count(&count)

	case model.TypeSpace:
		// 检查用户是否有该知识库的访问权 (sys_space_access)
		s.Dao.DB.WithContext(ctx).Table("sys_space_access").
			Where("space_id = ? AND subject_id = ? AND delete_time IS NULL", file.RelatedID, userID).
			Count(&count)

	case "chat":
		// 检查用户是否在聊天成员表中
		s.Dao.DB.WithContext(ctx).Table("sys_chat_user").
			Where("chat_id = ? AND user_id = ? AND delete_time IS NULL", file.RelatedID, userID).
			Count(&count)
	}

	return count > 0, nil
}
请谨慎使用此类代码。
2. 列表查询时的“权限过滤” SQL
如果你需要展示文件列表，且只想展示“用户有权看的文件”，可以使用以下联表过滤查询：
go
func (s *FileService) FindAccessibleFiles(ctx context.Context, userID uuid.UUID, wsID uuid.UUID) ([]model.Files, error) {
	var files []model.Files
	
	// 使用 UNION 或 EXISTS 逻辑处理多态权限
	err := s.Dao.DB.WithContext(ctx).Raw(`
		SELECT f.* FROM sys_files f
		WHERE f.workspace_id = ? AND f.delete_time IS NULL
		AND (
			f.visibility = 'public'             -- 1. 公开的
			OR f.create_by = ?                 -- 2. 自己传的
			OR EXISTS (                         -- 3. 属于我有权访问的页面
				SELECT 1 FROM sys_page_access pa 
				WHERE pa.page_id = f.related_id 
				AND f.related_type = 'page' 
				AND pa.subject_id = ?
			)
			OR EXISTS (                         -- 4. 属于我有权访问的知识库
				SELECT 1 FROM sys_space_access sa 
				WHERE sa.space_id = f.related_id 
				AND f.related_type = 'space' 
				AND sa.subject_id = ?
			)
		)
	`, wsID, userID, userID, userID).Scan(&files).Error

	return files, err
}
请谨慎使用此类代码。
3. 实现要点说明：
分流 (Switch-Case)：因为 RelatedID 对应的是不同表的 PK，在 Go 代码层面做分流是最灵活的，方便后续增加 RelatedType。
空间管理员特权：代码中加入了 sys_workspace_user 的角色校验。通常空间的 owner 应该有权查看空间内所有文件，这能减少很多琐碎的授权操作。
NULL 判定：由于 RelatedID 是指针，如果它是 nil（游离文件），则逻辑上默认只有创建者和空间管理员能看。
索引优化：
sys_files 必须有 (related_id, related_type) 的复合索引。
各权限表（sys_page_access 等）必须有 (相关ID, subject_id) 的唯一或复合索引。


在文件查看和下载的场景中，文件流和预签名 URL 对应不同的存储架构。如果你目前是存储在本地服务器磁盘，使用文件流；如果你未来迁移到对象存储（如阿里云 OSS、MinIO、S3），则使用预签名 URL。
以下是两种方案的详细实现代码：
1. 文件流实现 (适用于本地磁盘存储)
这种方式由后端 Go 程序读取磁盘文件，并以流的形式转发给浏览器。
优点：实现简单，不依赖第三方服务，安全性完全由后端控制。
缺点：消耗后端服务器的带宽和 CPU。
go
func (c *FileCtrl) StreamFile(ctx *gin.Context) {
    fileID := ctx.Param("id")
    userID := utils.GetUserID(ctx)

    // 1. 获取数据库记录
    var file model.Files
    if err := c.FileSrv.GetByID(ctx, fileID, &file); err != nil {
        ctx.JSON(404, "文件记录不存在")
        return
    }

    // 2. 权限校验 (调用之前写的分流鉴权逻辑)
    hasAccess, _ := c.FileSrv.CheckUserAccess(ctx, userID, &file)
    if !hasAccess {
        ctx.JSON(403, "无权访问该私有文件")
        return
    }

    // 3. 检查物理文件是否存在
    if _, err := os.Stat(file.Path); os.IsNotExist(err) {
        ctx.JSON(404, "磁盘物理文件缺失")
        return
    }

    // 4. 返回文件流
    // 设置 Content-Disposition: 
    // - inline: 浏览器尝试在线预览 (图片/PDF)
    // - attachment: 强制弹出下载框
    mode := ctx.DefaultQuery("mode", "inline")
    ctx.Header("Content-Disposition", fmt.Sprintf("%s; filename=%s", mode, file.Name))
    
    // Gin 内置的流式分发方法，支持断点续传 (Range 请求)
    ctx.File(file.Path)
}
请谨慎使用此类代码。
2. 预签名 URL 实现 (适用于 OSS/MinIO 存储)
这种方式后端不处理文件数据，只负责生成一个“有时效性的令牌链接”给前端，前端直接从云存储下载。
优点：零带宽消耗，性能极高。
缺点：需要集成云服务 SDK。
以 MinIO/S3 为例：
go
func (c *FileCtrl) GetPresignedURL(ctx *gin.Context) {
    fileID := ctx.Param("id")
    userID := utils.GetUserID(ctx)

    // 1. 获取并校验权限 (同上)
    var file model.Files
    c.FileSrv.GetByID(ctx, fileID, &file)
    if access, _ := c.FileSrv.CheckUserAccess(ctx, userID, &file); !access {
        ctx.JSON(403, "Forbidden")
        return
    }

    // 2. 调用 SDK 生成签名 URL (有效期 15 分钟)
    // 假设 file.Path 存储的是 OSS 里的 ObjectKey
    reqParams := make(url.Values)
    reqParams.Set("response-content-disposition", "attachment; filename=\""+file.Name+"\"")

    // minioClient 是预先初始化好的 SDK 实例
    presignedURL, err := minioClient.PresignedGetObject(ctx, "your-bucket-name", file.Path, time.Minute*15, reqParams)
    if err != nil {
        ctx.JSON(500, "生成签名失败")
        return
    }

    // 3. 返回给前端，前端直接跳转或放入 <img src>
    ctx.JSON(200, gin.H{
        "url": presignedURL.String(),
        "expire_at": time.Now().Add(time.Minute * 15).Unix(),
    })
}
请谨慎使用此类代码。
3. 前端如何使用这两个接口？
图片在线展示：
html
<!-- 如果是 public 资源，走 Nginx 直连 -->
<img src="/uploads/public/avatars/abc.png" />

<!-- 如果是私密资源，走后端流接口 -->
<img src="/api/files/stream/uuid?token=xxx" />
请谨慎使用此类代码。
文件点击下载：
javascript
async function download(id) {
    // 方案 1: 如果是文件流
    window.open(`/api/files/stream/${id}?mode=attachment`);

    // 方案 2: 如果是预签名
    const res = await axios.get(`/api/files/presigned/${id}`);
    window.location.href = res.data.url;
}
请谨慎使用此类代码。
总结建议
如果你是初创项目或内网工具，存储在本地，直接用 ctx.File(path) 文件流。它最快能跑通。
如果你是公网高并发应用，建议用 MinIO（私有化部署）或 阿里云 OSS，并采用 预签名 URL。
关键提示： 在 ctx.File 模式下，如果文件很大，Gin 会自动处理分段传输（HTTP 206），支持播放器拖动进度条。


不考慮自定義 SVG，且頭像只有一個字段，業界最穩定、好用的設計是 「類型前綴 + 內容標識」。
這種設計能讓你在一個 varchar 字段裡，完美區分這三種完全不同屬性的資源。
1. 數據庫存儲格式設計
類型	數據庫存儲範例	說明
Emoji (💪)	emoji:💪	直接存 Unicode 字符，簡單直接
內置 SVG	svg:logo-01	不存代碼，只存前端預設的 Key
上傳圖片	img:public/avatars/uuid.png	存儲你分片上傳合併後的物理相對路徑
2. 前端 React 渲染器組件
這是讓這套設計「動起來」的核心。組件內部根據前綴分流，保證安全性。
tsx
// 內置 SVG 庫定義
const SVG_LIB = {
  'logo-01': <svg>...</svg>,
  'user-default': <svg>...</svg>,
};

const AvatarRenderer = ({ data }: { data: string }) => {
  if (!data) return <DefaultAvatar />;

  // 1. 拆分前綴與內容
  const colonIndex = data.indexOf(':');
  const type = data.substring(0, colonIndex);
  const content = data.substring(colonIndex + 1);

  // 2. 分類渲染
  switch (type) {
    case 'emoji':
      return <span className="avatar-emoji">{content}</span>;
    
    case 'svg':
      // 直接從本地對象取，不使用 dangerouslySetInnerHTML，絕對安全
      return <div className="avatar-svg">{SVG_LIB[content] || <DefaultIcon />}</div>;
    
    case 'img':
      // 拼接後端靜態目錄路徑
      return <img src={`/uploads/${content}`} className="avatar-img" alt="avatar" />;
    
    default:
      return <DefaultAvatar />;
  }
};
请谨慎使用此类代码。
3. 上傳與寫入流程
你的 React 圓環進度組件 只需要負責 img: 這一種情況：
用戶選了 Emoji/內置 SVG：
直接調用 api.updateUser({ avatar: 'emoji:💪' })。秒級完成。
用戶選了本地圖片：
啟動 uploader.start()。
經歷：校驗（藍圈） -> 上傳（綠圈） -> 合併。
onSuccess 拿到 res.path（如 public/avatars/xxx.png）。
調用 api.updateUser({ avatar: 'img:' + res.path })。
4. 為什麼這樣設計更好用？
物理空間極省：Emoji 和內置 SVG 只有幾十個字節，不產生磁盤碎片文件。
安全性最高：數據庫不存 SVG 代碼，徹底杜絕 XSS 攻擊。
邏輯解耦：
sys_file 只管 img: 的物理文件。
業務表（用戶表/工作區表）只管這個 avatar 標記。
體驗流暢：
選 Emoji/SVG 是「瞬間」更新。
上傳圖片有你的「圓環動畫」支撐，用戶體驗一致。



role，role_name，visibility是什么关系
这三个字段共同构成了协作系统的权限与展示体系。在原子化设计下，它们的关系可以概括为：Visibility 决定“谁能进”，Role 决定“进门后能干啥”，RoleName 是为了驱动 UI 渲染出的“身份标签”。
具体关系如下：
1. 语义定义
visibility (空间性格/准入规则)
定义： 空间本身的物理属性（公开还是私有）。
取值： workspace (开放), invite (受邀), private (私有)。
作用： 决定了非成员是否能搜到该空间，以及加入时是否需要审批。
role (操作权限/职能)
定义： 用户在该空间内的实权。
取值： admin, editor, viewer, none。
作用： 决定用户能不能写文档、能不能删空间、能不能改设置。
role_name (UI 展现/视觉 Key)
定义： 后端计算后传给前端的“显示标识”。
取值： 在原子化结构下，它直接取 visibility 的值（或 role 的值）。
作用： 前端拿着这个 Key 去 RenderConfig 里找图标（地球、锁、人头）和标签颜色。
2. 核心关系图：如何互相影响
在你的 batchFillMemberData 逻辑中，它们是这样“合流”的：
用户身份	空间 Visibility	最终 Role (计算权重)	返回给前端的 RoleName	UI 表现
创建者	任何	admin (权重3)	item.Visibility	显示为“私有”或“开放”
普通成员	invite	editor (权重2)	item.Visibility	显示为“仅限邀请”
未加入的员工	workspace	viewer (保底权重1)	item.Visibility	显示为“开放式”
3. 为什么需要三个字段共存？
Visibility 是静态的：存在 sys_space 表里，全公司看这个空间都一样。
Role 是动态的：根据“当前登录人”是谁而变化（你是管理员，我是访客）。
RoleName 是聚合的：它是后端计算后的结果展示。比如在空间列表页，用户最关心的不是自己是 editor 还是 viewer，而是这个空间“因何对我开放”（是因为它是开放空间，还是因为我被私下邀请了）。
总结
Visibility 是空间的属性。
Role 是人与空间关系的属性。
RoleName 是前端 UI 的属性（在你的代码里，它透传了 Visibility，让前端显示空间的准入类型）。


为了支持系统消息（如：系统维护、功能更新、或者由系统自动触发的权限变更通知），我们需要对消息表做一点微调，使其能够区分“个人对个人”的消息和“系统对全体/特定群体”的消息。
在 Schema 设计上，核心在于 sender_id 是否为空，以及 type 的分类。
1. 完善后的消息表设计
sql
-- 10. 消息中心表 (主体内容)
CREATE TABLE sys_notification (
  id uuid PRIMARY KEY,
  workspace_id uuid,          -- 所属工作区 (系统级全局消息可为 NULL)
  sender_id uuid,             -- 发送者 ID (NULL 表示系统发送)
  title varchar(255) NOT NULL,
  content text,
  msg_type varchar(20),       -- 'system':系统, 'notice':公告, 'event':协作事件(如被@)
  priority smallint DEFAULT 1, -- 1:普通, 2:紧急
  link_url varchar(512),      -- 消息关联的业务跳转地址
  create_time timestamptz NOT NULL DEFAULT now()
);

-- 11. 消息接收与状态表 (处理已读未读)
CREATE TABLE sys_notification_receiver (
  id uuid PRIMARY KEY,
  notification_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_time timestamptz,
  delete_time timestamptz     -- 用户删除/忽略消息
);

-- 索引：优化未读消息统计
CREATE INDEX idx_noti_unread_stat ON sys_notification_receiver(receiver_id, is_read) 
WHERE delete_time IS NULL;
请谨慎使用此类代码。
2. 不同场景的业务逻辑
场景 A：系统自动触发的协作消息
动作：用户 A 将用户 B 加入了“知识库 X”。
处理：
往 sys_notification 插入一条记录，sender_id 为用户 A，msg_type 为 event。
往 sys_notification_receiver 插入一条指向用户 B 的记录。
场景 B：工作区全体公告（系统消息）
动作：管理员发布“工作区周末维护通知”。
处理：
往 sys_notification 插入一条记录，sender_id 为空（或指定管理员），msg_type 为 system。
批量写入：查询该工作区下所有 sys_workspace_user，为每个活跃用户在 sys_notification_receiver 中生成一条记录。
优化建议：如果用户量极大，可以使用“拉取模式”，即不预先生成 receiver 记录，而是用户登录时对比 last_login_time 拉取最新的系统消息。
3. 常用查询示例
查询我的未读消息（区分系统消息）：
sql
SELECT n.title, n.msg_type, n.create_time, nr.is_read
FROM sys_notification n
JOIN sys_notification_receiver nr ON n.id = nr.notification_id
WHERE nr.receiver_id = :my_id 
  AND nr.is_read = false
  AND nr.delete_time IS NULL
ORDER BY n.priority DESC, n.create_time DESC;
请谨慎使用此类代码。
4. 成员管理逻辑小贴士
在添加/删除成员时，建议触发以下系统消息：
入库通知：当用户被添加进 sys_space_access 时，系统自动发送：“你已被加入 [知识库名称]，点击查看详情”。
权限变更：当 role 从 viewer 变为 editor 时，发送：“你在 [工作区名称] 的权限已提升为编辑者”。
移除警告：当用户被从工作区移除时，可以发送一封邮件通知（因为此时应用内消息他可能已经看不到了）。


“直接加入”（直接塞进空间）和“邀请加入”（需确认）是两个不同的业务流。
为了支持确认机制，我们需要引入一张 “邀请/申请表”，作为加入 sys_workspace_user 之前的缓冲区。
1. 增加邀请表设计
sql
-- 12. 邀请记录表
CREATE TABLE sys_workspace_invite (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  inviter_id uuid NOT NULL,      -- 谁发出的邀请
  email varchar(100),            -- 针对邮箱邀请（用户可能还没注册）
  invitee_id uuid,               -- 针对站内用户邀请
  token varchar(64) UNIQUE,      -- 链接邀请码
  status smallint DEFAULT 0,     -- 0: 待处理, 1: 已接受, 2: 已拒绝, 3: 已过期
  role varchar(20) DEFAULT 'member', -- 预设加入后的角色
  expire_time timestamptz,       -- 过期时间
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invite_email ON sys_workspace_invite(email) WHERE status = 0;
请谨慎使用此类代码。
2. 带“确认”环节的业务流
第一步：发起邀请
管理员输入对方邮箱或选择站内用户。
后端在 sys_workspace_invite 插入记录，生成一个唯一 token。
发消息：
站内：往 sys_notification 插入一条类型为 invite 的消息，link_url 带上这个 token。
站外：发邮件，链接也是带这个 token。
第二步：用户点击“接受”
用户点击消息中的“确认加入”按钮：
校验：检查 token 是否有效、是否过期、是否已被使用。
入库：向 sys_workspace_user 插入正式的关联记录。
更新：将 sys_workspace_invite 的状态改为 1 (已接受)。
清理：将对应的系统消息 is_read 设为 true。
3. 两种邀请模式的实现差异
模式	场景	实现细节
精准邀请	知道对方 ID/邮箱	消息直接发给 receiver_id。用户登录后在“消息中心”看到“同意/拒绝”按钮。
链接邀请	发在群聊或文档里	任何人点击链接 -> 登录/注册 -> 触发确认逻辑 -> 加入空间。
4. 为什么要这么设计？
防止骚扰：用户可以选择“拒绝”，避免被莫名其妙拉进垃圾空间。
拉新逻辑：如果邀请的是非注册邮箱，用户点击链接跳转到注册页，注册成功后根据 token 自动绑定空间。
审计追踪：你可以清楚地查到谁在什么时候邀请了谁，以及对方什么时候通过的。


为了保证“接受邀请”的安全性与一致性，必须使用数据库事务（Transaction）。这样可以确保：要么用户成功加入并标记邀请失效，要么全部回滚，防止出现“邀请已消耗但没加进空间”的尴尬。
以下是实现“接受邀请”逻辑的 SQL 事务示例：
sql
BEGIN; -- 开启事务

-- 1. 锁定并校验邀请记录（防止并发重复点击）
-- 假设前端传回了 invite_id 和当前处理人的 user_id
UPDATE sys_workspace_invite 
SET status = 1, -- 标记为已接受
    update_time = now()
WHERE id = '邀请记录ID' 
  AND status = 0 
  AND expire_time > now()
RETURNING workspace_id, role; 

-- 注意：如果上面的 UPDATE 影响行数为 0，说明邀请无效/过期，程序应抛出异常并 ROLLBACK

-- 2. 正式加入工作区关联表
INSERT INTO sys_workspace_user (
  id, 
  workspace_id, 
  user_id, 
  role, 
  status, 
  is_default, 
  join_time
) VALUES (
  gen_random_uuid(), 
  '从第一步获取的workspace_id', 
  '当前登录用户的user_id', 
  '从第一步获取的role', 
  1, 
  false, -- 如果该用户之前没空间，逻辑上可以设为 true
  now()
)
ON CONFLICT (workspace_id, user_id) 
DO UPDATE SET delete_time = NULL, status = 1; -- 处理曾经删除过又重新加入的情况

-- 3. (可选) 如果有默认知识库，自动授予基础查看权限
-- INSERT INTO sys_space_access ...

-- 4. 更新相关的系统消息状态
UPDATE sys_notification_receiver 
SET is_read = true, 
    read_time = now()
WHERE receiver_id = '当前用户的user_id' 
  AND notification_id IN (
      SELECT id FROM sys_notification WHERE link_url LIKE '%邀请记录ID%'
  );

-- 5. 给邀请人发一个反馈通知
INSERT INTO sys_notification (id, workspace_id, title, content, msg_type)
VALUES (
  gen_random_uuid(), 
  '工作区ID', 
  '邀请已接受', 
  'XXX 已接受你的邀请加入了工作区', 
  'system'
);

COMMIT; -- 提交事务
请谨慎使用此类代码。
关键点说明：
幂等性处理：使用 ON CONFLICT 处理“离职后再入职”或重复点击的情况。
安全校验：在 UPDATE 邀请表时，务必带上 status = 0 和时间校验，这是防止重放攻击的核心。
Token 机制：如果是通过链接邀请（非指定用户），在事务开始前，应先通过 token 查出 invite_id。
接下来建议：
默认空间：当用户接受邀请后，如果他是第一次加入任何空间，你可能需要一个逻辑去更新他的 is_default = true。
自动清理：可以写一个简单的定时任务（Cron），每天清理 status = 0 且已过期的 sys_workspace_invite 记录。


要在海量消息中实现快速统计已读/未读，且保证在高并发（比如全员公告）时数据库不卡顿，我建议从索引优化、查询策略和统计冗余三个层面来做：
1. 索引优化：部分索引 (Partial Index)
普通的索引会包含所有消息。但用户通常只关心“未读”消息。我们可以利用 PostgreSQL 的部分索引功能，只索引未读的部分，体积更小，速度极快。
sql
-- 创建一个只针对“未读且未删除”消息的索引
CREATE INDEX idx_unread_notification_count 
ON sys_notification_receiver (receiver_id) 
WHERE is_read = false AND delete_time IS NULL;
请谨慎使用此类代码。
效果：当你运行 SELECT count(*) 统计未读数时，数据库会直接扫描这个精简后的索引，而不需要遍历几百万条历史已读记录。
2. 高级查询技巧：按类型分组统计
在 UI 上，我们通常需要展示“全部 10，系统 5，协作 5”。为了避免写多次 count 触发多次扫描，建议用 过滤聚合 (Filtered Aggregates)：
sql
SELECT 
    COUNT(*) AS total_unread,
    COUNT(*) FILTER (WHERE n.msg_type = 'system') AS system_unread,
    COUNT(*) FILTER (WHERE n.msg_type = 'event') AS event_unread
FROM sys_notification_receiver nr
JOIN sys_notification n ON nr.notification_id = n.id
WHERE nr.receiver_id = :user_id 
  AND nr.is_read = false 
  AND nr.delete_time IS NULL;
请谨慎使用此类代码。
3. 性能进阶方案：冗余计数表（可选）
如果你的系统日后用户量非常大（例如万级 DAU），频繁 count 依然会产生压力。这时可以引入一个计数缓存表。
sql
-- 13. 用户消息计数冗余表
CREATE TABLE sys_user_msg_stats (
  user_id uuid PRIMARY KEY,
  unread_count int DEFAULT 0,
  update_time timestamptz DEFAULT now()
);
请谨慎使用此类代码。
逻辑：
当新消息插入 sys_notification_receiver 时，给对应的 unread_count +1。
当用户点击“已读”时，-1。
查询：直接 SELECT unread_count FROM sys_user_msg_stats。这是 O(1) 级别的查询，瞬间完成。
4. 批量已读的 SQL 处理
用户经常需要“一键已读”。为了性能，不要在循环里一条条 update。
sql
-- 批量更新该工作区下所有未读消息为已读
UPDATE sys_notification_receiver nr
SET is_read = true, 
    read_time = now()
FROM sys_notification n
WHERE nr.notification_id = n.id
  AND nr.receiver_id = :user_id
  AND n.workspace_id = :workspace_id
  AND nr.is_read = false;
请谨慎使用此类代码。
5. 最后的架构建议：
冷热分离：消息记录表会增长得非常快。建议定期（如半年）将 delete_time IS NOT NULL 的记录迁移到备份表。
推送配合：查询优化只是为了让用户“看”得快。为了让红点“弹”得快，记得后端在事务提交后发一个 WebSocket 通知前端自增本地计数。


3. 完整的「邀請發送」業務邏輯 (Service 層)
當你調用 Invite 接口時，後端會執行以下操作：
寫入 sys_workspace_invite：記錄邀請詳情（權限、過期時間、Token）。
寫入 sys_notification：生成一條告知用戶的消息。
寫入 sys_notification_receiver：讓用戶在界面上看到紅點。
發送實時消息：通過 wsm.Emit 讓用戶在線時立刻彈窗。
4. 總結
sys_workspace_invite：數據核心，用於最終的權限校驗。
sys_notification：展現層，用於提醒用戶。
這就像「借條」與「提醒簡訊」的關係：簡訊告訴你有這件事，但最後還錢（入庫）得看借條。


在設計協作系統時，「權限實體」與「通訊實體」既要解耦，又要能通過權限點進行關聯。
以下是業界（如 Lark/飛書、Slack）主流的設計模式：
1. 設計核心：將「通訊頻道」視為「實體」的附屬屬性
不要嘗試把 Workspaces、Space 和 Page 都變成「群組」，而是反過來：任何協作實體都可以擁有一個或多個 RoomID。
數據關聯設計：
Workspace (工作區)：擁有一個「全員大群」，RoomID 直接等於 WorkspaceID。成員資格與 sys_workspace_user 表綁定。
Space (知識庫)：可以選擇性開啟「討論區」，RoomID 等於 SpaceID。成員資格與 sys_space_access 綁定。
Page (文檔)：文檔內的即時評論或協作流，RoomID 等於 PageID。成員資格與文檔的 ACL 權限綁定。
2. 邀請與加入的連動邏輯
當你邀請一個成員加入 Workspace 時，會觸發連鎖反應：
管理層面：在 sys_workspace_user 插入記錄（持久化權限）。
通訊層面：
主動推播：後端通過 WSManager.Emit(userID, "notification", ...) 發送邀請通知。
自動進群：當用戶點擊「接受」後，前端 WS 自動執行 JoinRoom(workspace_id)，此後該用戶就能收到該工作區大群的消息。
3. 推薦的數據模型架構
A. 成員關係表 (管理權限)
sys_workspace_user: 決定誰能進這家「公司」。
sys_space_access: 決定誰能進這個「辦公室」。
sys_chat_group_user: 決定誰在某個「臨時討論組」。
B. 消息表 (通訊內容)
你的 sys_chat_message 表中的 room_id 是一個枚舉/多態字段：
如果 room_id 類型是 workspace 
 查詢 sys_workspace_user 校驗權限。
如果 room_id 類型是 space 
 查詢 sys_space_access 校驗權限。
如果 room_id 類型是 group 
 查詢 sys_chat_group_user 校驗權限。
4. 具體場景：文檔邀請與聊天的關聯
場景：你在 Page A 邀請了用戶 B。
關聯點：用戶 B 被加入 Page A 的權限表。
通訊表現：
用戶 B 的「消息中心」收到通知。
如果 Page A 開啟了「實時協作」，用戶 B 進入頁面後，WS 連接到 Room(PageID)。
用戶 B 在文檔下方的「評論區」發言，room_id 記錄為 PageID。
5. 總結建議
權限決定通訊：在 WebSocket 的 ReadPump 發消息前，根據 room_id 的類型，去對應的權限表（Workspace/Space/Page）查一下發送者是否有權。
不要重複造輪子：聊天群（Group）只用於「沒有實體依託」的純聊天場景（如：私聊、自建小群）。其餘場景直接複用 Workspace/Space 的 ID 作為 room_id。



首先一步，A用户发送邀请 -> B用户收到邀请消息，同意/拒绝 ->A收到消息反馈
要实现这个完整的“邀请-反馈”闭环，你需要结合 数据库事务、业务状态机 和 WebSocket 实时推送。
这里是分步骤的实现逻辑：
第一步：A 发送邀请 (持久化 + 推送)
这部分你已经基本完成了。核心是在 WorkspaceService 中创建一个事务。
入库：在 sys_workspace_invite 存入邀请记录（状态：待处理）。
入库：在 sys_notification 和 receiver 存入通知。
推送：调用 wsm.Emit(B_ID, "notification", payload)。
第二步：B 处理邀请 (同意/拒绝)
在 WorkspaceCtrl 中增加一个 AcceptInvite 或 RejectInvite 的接口。
核心代码：处理“同意”的事务逻辑
go
// services/workspace_service.go

func (s *WorkspaceService) AcceptInvite(ctx context.Context, inviteID uuid.UUID, inviteeID uuid.UUID) error {
	return s.Dao.DB.Transaction(func(tx *gorm.DB) error {
		// 1. 校验邀请合法性并加锁（防止重复操作）
		var invite model.WorkspaceInvite
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND invitee_id = ? AND status = 0", inviteID, inviteeID).
			First(&invite).Error; err != nil {
			return errors.New("邀请不存在或已处理")
		}

		// 2. 更新邀请状态为“已接受” (status=1)
		tx.Model(&invite).Update("status", 1)

		// 3. 正式将用户加入工作区成员表 (sys_workspace_user)
		member := model.WorkspaceUser{
			ID:          uuid.New(),
			WorkspaceID: invite.WorkspaceID,
			UserID:      inviteeID,
			Role:        invite.Role, // 延用邀请时设定的角色
			IsDefault:   false,
		}
		if err := tx.Create(&member).Error; err != nil {
			return err
		}

		// 4. 将通知标记为已读
		tx.Table("sys_notification_receiver").
			Where("receiver_id = ? AND notification_id IN (SELECT id FROM sys_notification WHERE link_url LIKE ?)", 
				inviteeID, "%"+inviteID.String()+"%").
			Update("is_read", true)

		// 5. 异步反馈给 A (邀请人)
		// 事务提交后执行推送
		defer func() {
			s.WSM.Emit(invite.InviterID.String(), "notification", map[string]interface{}{
				"type": "invite_feedback",
				"status": "accepted",
				"workspace_id": invite.WorkspaceID,
				"msg": "对方已接受您的邀请",
			})
		}()

		return nil
	})
}
请谨慎使用此类代码。
第三步：A 收到消息反馈
前端 A 的 onmessage 逻辑中会捕获到 type: "invite_feedback"。
前端展示：A 的界面弹出 Toast：“用户 B 已加入工作区”。
数据刷新：如果 A 正在查看成员列表页，前端可以触发一次自动刷新，此时 B 就会出现在列表中。
关键设计细节：
幂等性：使用 status = 0 (待处理) 作为查询条件并配合 SELECT FOR UPDATE 锁，确保 B 如果狂点“同意”按钮，后端只会处理一次。
拒接逻辑：如果 B 点击“拒绝”，只需执行 status = 2 (已拒绝) 的更新，无需操作 WorkspaceUser 表，但同样要给 A 发送一个 Emit 反馈。
过期处理：在查询邀请时，记得判断 expire_time > now()。
总结
A -> B (推送通知)：由 WSManager 负责。
B 操作 (改变数据库状态)：由 Service 事务负责。
B -> A (反馈结果)：再次由 WSManager 通过 Emit 推回给 A。


workspace的用户和space用户是否为包含关系？
这是一个非常经典的设计问题。在成熟的协作系统（如 Notion、飞书、Slack）中，它们确实是包含关系，但这种包含是有层级和逻辑区别的。
简单来说：Workspace（工作区）决定了“谁能进来”，Space（知识库/空间）决定了“进来后能看什么”。
1. 逻辑层级：父子包含
Workspace（大圈子）：类似于一家“公司”。只有加入工作区的成员，才拥有在这个工作区内活动的基础身份。
Space（小圈子）：类似于公司里的“部门”或“项目组”。它必须属于某个工作区。
2. 成员关系的包含逻辑
Space 用户 ⊆ Workspace 用户：通常情况下，一个人必须先是工作区的成员，才能被邀请进该工作区下的某个私有 Space。
权限继承：
如果 Space 设置为 “开放式” (Workspace Visibility)：那么所有工作区成员自动“包含”在内，都可以查看。
如果 Space 设置为 “私有” (Private/Invite Only)：那么只有工作区成员中的“一部分人”被授权包含在内。
3. 为什么不直接用一张表？
因为两者的角色（Role）通常是不同的：
他在 Workspace 里的身份可能是 “普通成员”（负责交钱或基础协作）。
他在某个具体的 Space 里的身份可能是 “管理员”（负责该项目的文档编排）。
4. 架构设计建议
在数据库层面，你应该有两张关系表：
sys_workspace_user：
字段：workspace_id, user_id, role (Admin/Member)。
意义：全局通行证。
sys_space_access（这就是你之前写的权限表）：
字段：space_id, subject_id (UserID), role (Editor/Viewer)。
意义：局部入场券。
5. 特殊情况：外部协作
业界有一种例外：“单空间访客”。
比如你只想邀请一个外部顾问看某一个 Space，不想让他看到整个 Workspace 的其他信息。
实现方式：在 sys_space_access 里直接添加他的 UID，但在 sys_workspace_user 里不给他记录。
注意：这需要在你的 AccessCheck 逻辑里做特殊判断。
总结
是包含关系。 工作区用户是“底座”，知识库用户是“上层建筑”。







以下是已落地的 Page 增量保存 + 快照 能力说明。

数据：sys_page_revision
每次 version 从 V → V+1 前，先把当前整份 content 写入快照，page_version = V（表示「页面还是第 V 版时的正文」）。
迁移：editor/server/migrations/002_page_revision.up.sql；sql.sql 已同步建表。
接口（均在 X-Workspace-ID 工作区组下）
方法	路径	作用
POST
/api/workspace/page/save
行为增强：在原有乐观锁全文保存基础上，先写入快照再 version++。冲突走 ErrPageContentConflict → HTTP 409。
POST
/api/workspace/page/savePatch
Body：id, version, patch（RFC 6902 JSON 数组，作用在根 content）。成功返回 version + 合并后的 content。
GET
/api/workspace/page/revisions
Query：page_id，limit（默认 50，最大 200）。返回 current_version + revisions（仅元数据，无大字段）。需对该页所在 Space 可读。
GET
/api/workspace/page/revision
Query：page_id, page_version。返回该版完整 content。需 可读。
POST
/api/workspace/page/restoreRevision
Body：page_id, source_page_version, base_version。把某历史快照写回为最新版（先归档当前头）。需 checkPageMutate（可编辑）。
错误码（SendErr）
ErrPageContentConflict → 409
ErrPagePatchInvalid → 400
ErrPageRevisionNotFound / ErrPageNotFound → 404
依赖
github.com/evanphx/json-patch/v5（已写入 go.mod）
文档
SPACE_INVITE_AND_MEMBER_DESIGN.md §6.4 已补充上述约定与路径。
Patch 示例
若根 content 为 []，在前面插入一块可传：

{
  "id": "页面uuid",
  "version": 3,
  "patch": [
    { "op": "add", "path": "/0", "value": { "type": "paragraph", "id": "x1" } }
  ]
}
部署后请执行迁移以创建 sys_page_revision 表。若你需要「按时间自动淘汰旧快照」或「与 Yjs/OT 二进制更新」对接，可以再说一下格式我帮你接一版协议。











结合仓库里已有能力，结论可以概括成三句话：底层有一块可用的「聊天消息 + WS + 异步入库」骨架，但离「可上线的 IM（单聊/群聊/好友）」还差一整层领域模型与鉴权；MVP 属于中等体量、可分期做；架构上可以用「会话 + 成员关系 + 与 Invite/通知 同构」的方式做得比较可扩展。

现有基础（你不必从零造轮子）
消息落库：sys_chat_message + ChatService.SaveChatMessage / GetChatHistory，model 里已有 RoomTypePrivate / RoomTypeGroup 常量（尚未形成完整业务闭环）。
实时通道：ws.Manager + 用户默认进 userId 个人房（与 InviteService / 通知的 Emit 模式一致），ReadPump 里对 TypeChat 会 广播到 room_id 房间 并 Worker 入库。
通知：sys_notification + 接受/拒绝邀请等成熟链路，可类比做「好友申请」的站内信 + WS 推送。
当前缺口（要做 IM 必须补的）
没有「会话」实体
只有 room_id 字符串，没有：单聊会话如何生成/查找、群聊如何创建/解散、成员何时加入/退出。

鉴权几乎为空（上线前必须修）
GET /api/chat/history?room_id=... 未校验「当前用户是否属于该 room」；WS 也未校验「是否允许进该 room」。要做 IM，必须先会话成员校验，否则 room_id 泄露即读历史。

群成员、好友关系
好友申请 / 同意 / 拒绝需要 状态机 + 唯一约束（与你们的 sys_invite 思路很像）；群需要 成员表（可类比 sys_space_access）。

多房间在线模型
现在客户端默认只注册在个人通知房；单聊/多群需要 订阅多个 room 或 统一下行协议里带 conversation_id（两种都可扩展，需定一种）。

改动量级（粗估）
范围	内容	体量
MVP（可演示）
会话表、成员表（含单聊 2 人、群 N 人）、好友申请表 + HTTP 发/收/同意/拒绝、历史与发消息 全部带成员校验、WS 增加「加入会话房间」或等价协议、好友事件走通知 + Emit
中等：若干新表 + 1～2 个新 Service + 扩展 ChatCtrl/WS，约数天～两周量级（视联调与前端而定）
生产级
已读/未读、多端同步、离线推送、消息撤回、禁言、搜索、文件/图片合规、群管理、审计、限流与反垃圾
大：往往 多迭代，部分能力可后置
「好友」若做成 **仅站内用户 + 与 workspace 无关的全局关系」，表结构更简单；若要求 按工作区隔离好友，则要在会话/关系上挂 workspace_id，和现有 X-Workspace-ID 模型对齐，字段多一层但扩展清晰。

能否健壮扩展？可以，建议这样定边界
以「会话 Conversation」为第一公民
所有消息带 conversation_id（内部再映射到 room_id 或直接废弃裸 room_id 猜谜）。单聊 = 一种会话类型 + 2 条成员；群聊 = 另一种类型 + 成员表。以后加「频道/客服会话」只是加 type。

好友与聊天解耦
Friendship（或 ContactRequest）只管关系与状态；同意后再创建或打开单聊会话，避免「不是好友也能发」的歧义由产品规则在一个地方判断。

复用你们已验证的模式

好友申请：类似 InviteService（待处理唯一、过期、通知、SendErr）。
群系统通知：类似 Space 成员变更 + Emit。
消息：继续 Worker 入库，逐步加索引（会话 + 时间）、冷热分表等，而不推翻 WS 结构。
WS 协议版本化
给每条下行/上行 JSON 加 v 或 schema 字段，新业务（正在输入、引用消息）不破坏旧客户端。

与 Workspace 的关系写进 PRD
IM 是 全局 还是 租户内，决定是否在 sys_chat_message 强制 workspace_id、以及会话列表 API 是否挂在 WorkspacesAuth 下；一旦选定，扩展空间都足够。

小结
改动大不大：做一个 安全、可用的 MVP 是 中等；要做成 完整商业 IM 是 大工程，应分期。
能否健壮扩展：能——关键是引入 会话 + 成员 + 鉴权，好友走 独立关系域，消息与实时层 协议版本化，并 复用 Invite/通知/Worker 这些已存在的扩展点。
若你确定产品形态（例如：好友是否全局、群是否必须属于某工作区、单聊 room_id 是否用「有序 user id 对」生成），可以再往下拆一版 表结构清单 + API 列表 落到 doc 里当迭代蓝图。




workspace工作区的成员管理：
    owner: 显示”删除工作区“按钮，成员列表中成员（除owner外）授权按钮（管理员，普通用户，访客，移除按钮）及显示“添加成员“按钮。
    admin：不显示”删除工作区“、“退出工作区”按钮，成员列表中成员（除owner,admin外）授权按钮（普通用户，访客，移除按钮）及显示“添加成员“按钮。
    member：不显示”删除工作区“按钮，显示“退出工作区”，成员列表中成员不显示授权按钮（管理员，普通用户，访客，移除按钮），不显示“添加成员“按钮。
    guest：不显示”删除工作区“按钮，显示“退出工作区”，成员列表中成员不显示授权按钮（管理员，普通用户，访客，移除按钮），不显示“添加成员“按钮。

space空间的成员管理：
    owner: 显示”删除知识库“按钮，成员列表中成员（除owner外）授权按钮（管理员，编辑者，阅读者，移除按钮）及显示“添加成员“按钮。
    admin：不显示”删除知识库“、“退出知识库”按钮，成员列表中成员（除owner,admin外）授权按钮（编辑者，阅读者，移除按钮）及显示“添加成员“按钮。
    editor：不显示”删除知识库“按钮，显示“退出知识库”，成员列表中成员不显示授权按钮（管理员，编辑者，阅读者，移除按钮），不显示“添加成员“按钮。
    viewer：不显示”删除知识库“按钮，显示“退出知识库”，成员列表中成员不显示授权按钮（管理员，编辑者，阅读者，移除按钮），不显示“添加成员“按钮。
    none: 不可见