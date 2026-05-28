在 Notion、飛書這種扁平化的 SaaS 體系中，這五張表構成了一個「從頂層容器到原子內容」的樹狀結構與「多對多權限」的交叉網絡。
以下是這五者之間的核心關聯邏輯：
1. 核心層級關係（一對多 / 樹狀結構）
   這是數據存放的「物理歸屬」，決定了數據存儲的位置：
   User (用戶)：系統的最小主體。
   Workspace (工作區)：最高級別容器。用戶必須進入一個 Workspace 才能開始工作。
   關聯：一個 User 可以加入多個 Workspace；一個 Workspace 擁有多個成員。
   Group (組/部門)：Workspace 內部的邏輯分組。
   關聯：隸屬於 Workspace。用於批量管理 User 的權限（如：技術部、財務組）。
   Space (空間/項目)：Workspace 下的一級分類。
   關聯：隸屬於 Workspace。通常作為導航欄的一級菜單（如：知識庫、任務看板）。
   Page (頁面)：最底層的內容載體。
   關聯：隸屬於某個 Space，且支持 parent_id 實現無限級嵌套（頁面套頁面）。
2. 權限交叉關係（多對多 / 權限覆蓋）
   這是決定「誰能看什麼」的邏輯網，通常通過中間表實現：
   關聯對象	中間表	業務邏輯
   User ↔ Workspace	sys_workspaces_users	准入制。決定用戶是否能進入該企業/團隊。定義全局角色（Owner, Admin, Member）。
   User ↔ Group	sys_groups_users	組織架構。定義用戶屬於哪些部門（如：張三屬於技術部和管委會）。
   User/Group ↔ Page	sys_page_access	精細授權。當 Page 設為「私有」或「特定人可見」時，記錄哪些用戶或組擁有 View/Edit 權限。
3. 數據庫字段關聯圖解 (SQL 外鍵邏輯)
   為了支持你現在的 扁平化 URL (/docx/:pageId) 方案，字段設計如下：
   sys_workspaces: 獨立存在。
   sys_users: 獨立存在。
   sys_groups:
   workspace_id: 必填（隔離不同企業的組）。
   sys_spaces:
   workspace_id: 必填（隔離不同企業的空間）。
   sys_pages (核心設計):
   workspace_id: 必填 (冗餘)。為了在只有 pageId 的情況下，不連表直接判斷用戶是否有該 Workspace 權限。
   space_id: 必填。標記它屬於哪個一級分類。
   parent_id: 可選。指向另一個 page_id，形成樹狀目錄。
   create_by: 必填。用於判定 「個人私有 (Private)」 權限。
4. 協作場景舉例：
   場景 A (公開協作)：
   用戶訪問 /docx/PAGE_A。
   後端查到 PAGE_A 的 visibility = 'workspace'。
   檢查 sys_workspaces_users，發現用戶在該 workspace_id 下。
   放行。
   場景 B (私密文檔)：
   用戶訪問 /docx/PAGE_B。
   後端查到 PAGE_B 的 visibility = 'private'。
   檢查 create_by 是否等於當前 user_id。
   如果不相等，檢查 sys_page_access 裡有沒有單獨給這個人或他所在的 Group 開權限。
   匹配成功則放行，否則 403。
   💡 開發建議
   先做硬關聯：先完成 User -> Workspace -> Page 的鏈路，這能跑通 80% 的流程。
   後加軟權限：Group 和 sys_page_access（特定人授權）可以等你的基礎 CRUD 穩定後再加，這屬於高級功能。
   你現在打算先從哪一對關係開始編寫 Go Service 邏輯？
   Workspace ↔ User（登錄後獲取空間列表）
   Page ↔ Workspace（進入文檔頁時的安全攔截）
   Group ↔ User（實現部門管理）


## 本地種子帳號（`test.sql` / `demo-ws`）

| 用戶名   | 密碼        | 工作區角色（`sys_workspace_user.role`） |
|----------|-------------|-------------------------------------------|
| owner_u  | Test123456  | owner                                     |
| admin_u  | Test123456  | admin                                     |
| member_u | Test123456  | member                                    |
| guest_u  | Test123456  | guest                                     |

請求頭：`X-Workspace-ID: a0000001-0000-4000-8000-000000000001`（與 `test.sql` 一致）。

---

## 權限矩陣（種子數據 + 當前列表 API 行為）

以下用於對照「庫表 `test.sql`」與「空間列表接口」是否一致；**實際進內容**仍以各接口的校驗為準。

### 知識庫（Space）一覽

| Space ID（簡寫） | 名稱           | `visibility` | 種子中的 `sys_space_access` 要點 |
|------------------|----------------|--------------|-----------------------------------|
| d0000001…001     | 公開知識庫     | workspace    | owner_u → owner；後端組 → viewer（member_u 在組內） |
| d0000002…002     | 僅邀請殼       | invite       | 僅 admin_u → owner；member_u 無行（有待接邀請） |
| d0000003…003     | 私密知識庫     | private      | owner_u → owner；member_u → editor |
| d0000004…004     | 訪客可見私有庫 | private      | owner_u → owner；guest_u → viewer |

### 誰會出現在「空間列表」

| 工作區角色 | d0000001 公開 | d0000002 邀請殼 | d0000003 私密 | d0000004 訪客私 |
|------------|----------------|-----------------|----------------|------------------|
| **owner**（owner_u） | 有；庫級多為 `owner` 或列表聚合角色 | 有（無庫 ACL 時仍列出；屬**工作區 Owner 列表特權**） | 有 | 有 |
| **admin**（admin_u） | 有；多為 `viewer`（workspace 底權） | 有；`owner` | 無（無 ACL） | 無 |
| **member**（member_u） | 有；`viewer`（組繼承） | 有；`role: none` + `invite_shell_only: true`（僅殼） | 有；`editor` | 無 |
| **guest**（guest_u） | 有；`viewer`（**產品約定**：guest 可見 workspace 級公開庫） | **無**（種子註釋：guest 列表不可見） | 無 | 有；`viewer` |

### 工作區 Owner 特權（約定）

- **列表**：工作區 `owner` 可列出本工作區內全部知識庫，即使某庫沒有給該用戶的 `sys_space_access` 行（例如邀請殼的業務 owner 為 admin_u 時，owner_u 仍會看到該庫）。
- **展示角色**：列表裡的 `role` / `access_type` 可能來自「庫 ACL + 可見性規則 + 工作區角色」的聚合，**不必**與 `sys_space_access.role` 字面值一一相同；以接口文檔與集成測試為準。
- **進內容 / 管理成員**：仍以各接口是否校驗庫級 ACL 為準（例如 `can_manage_space_members` 與種子一致時應反映庫 owner）。

### 邀請殼（`invite` + `invite_shell_only`）

- **意義**：用戶可出現在列表（或只看到元數據），但**無庫級有效角色**（如 `none`），進正文前需完成邀請接受等流程。
- **種子**：member_u 對 d0000002 無 ACL，並存在一條待處理 `sys_invite`（invitee = member_u，scope = 該 space）。

### 頁面級（種子中的鏈路驗證）

- 公開庫根頁 `f0000001…001`：`visibility = workspace`，繼承開。
- 子頁 `f0000002…002`：`inherit_config = false` + `sys_page_access` 僅 member_u → editor；用於驗「打斷繼承後僅 ACL 生效」。
