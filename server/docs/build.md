# 前端与后端 Docker 部署详细流程

本文说明如何将 **editor/packages/app**（Vite + React）与 **editor/server**（Go + Gin）通过仓库内已有编排部署到单机（含云服务器）。编排入口在 **`editor/server/docker-compose.yml`**。

---

## 一、架构说明

| 服务名 | 镜像/构建 | 作用 |
|--------|-----------|------|
| **web** | `packages/app/Dockerfile`（构建上下文为 **`editor`**） | Nginx 托管静态页；反代 `/api/`、`/oauth/`、`/uploads/`、`/static/` 到后端 |
| **app** | `server/Dockerfile`（上下文 **`editor/server`**） | Go API（默认监听容器内 **9000**） |
| **db** | `postgres:16-alpine` | PostgreSQL，库名默认 **doc** |
| **redis** | `redis:7-alpine` | 预留；配置见 `deploy/config.docker.yaml` 的 `redis`，业务接入后使用 |

**访问路径（默认端口）**

- 浏览器访问前端：**`http://<主机>:8080`**（`WEB_PORT` 可改）。
- API 容器同时映射 **`http://<主机>:9000`**（`APP_PORT`），便于调试；生产可只暴露 **web** 的 80/443，由外层网关反代，不再对公网开放 9000。

前端构建时设置 **`VITE_CONTEXT_PATH=`**（空），接口为**相对路径**（`/api/...`、`/oauth/...`），由 **web** 内 Nginx 转到 **app:9000**，无需在浏览器里写死后端域名。

---

## 二、服务器前置条件

1. **操作系统**：Linux（如 Ubuntu 22.04 LTS）。
2. **Docker**：Docker Engine 20.10+，且已安装 **Docker Compose v2**（命令为 `docker compose`，不是旧版 `docker-compose`）。
3. **资源**：建议至少 2 vCPU、4GB RAM；磁盘视上传与数据库增长预留。
4. **网络**：
   - 最小验证：安全组放行 **`WEB_PORT`（默认 8080）**、可选 **`APP_PORT`（默认 9000）**。
   - 生产：只放行 **80 / 443**，在宿主机或 SLB 上做 HTTPS 与反代（见下文「域名与 HTTPS」）。

---

## 三、获取代码

### 3.0 本地有代码，第一步要不要「整工程拷贝」到云？

**一般不需要**用 U 盘 / `scp` 把整个工程目录原样拷过去（尤其不要依赖拷贝本机的 **`node_modules`**，平台不同会导致构建失败）。

更常见、也更推荐的做法是：

1. **本地**把改动提交并推送到 **Git 远程仓库**（GitHub、GitLab、阿里云 Codeup、Gitee 等）。
2. **云服务器**上安装 **Git**，执行 **`git clone`**，只拉取仓库里的源码与锁文件；再在服务器上执行 **`docker compose build`**，由 Docker 在 Linux 里重新安装依赖并编译。

这样「本地写代码 → 推送 → 云上拉最新 → 构建部署」流程清晰，也方便回滚与协作。

若暂时**没有**远程 Git 仓库，才考虑：

- **`scp` / `rsync`**：从本机同步整个 `doc-space` 目录到服务器（排除 `.git` 可选；仍建议尽快建远程仓改用 `git push` / `git pull`）；或  
- **打 zip**：在本地打包后上传到服务器解压（同样不要指望带上本机 `node_modules` 就能在 Linux 上直接跑前端构建）。

**小结**：第一步不是「机械式整盘拷贝」，而是**让云上有一份与仓库一致的源码**——优先用 **`git clone`**；拷贝整目录只是无 Git 时的权宜之计。

### 3.1 在服务器上克隆（推荐）

在服务器上克隆仓库（示例目录名 `doc-space`，请换成你的远程地址与目录名）：

```bash
git clone <你的仓库 HTTPS/SSH 地址> doc-space
cd doc-space/editor/server
```

后续所有 **`docker compose`** 命令均在 **`editor/server`** 目录执行（该目录包含 `docker-compose.yml` 与 `deploy/`）。

**SSH 克隆**：需先在服务器生成 SSH 公钥，并把公钥加到 Git 托管平台的「部署密钥 / SSH Keys」里。  
**HTTPS 克隆**：私有仓库需使用带权限的 **Personal Access Token** 作为密码（勿把 token 写进文档或提交到仓库）。

### 3.2 当前工程还没有用 Git 管理时怎么做

可以分两条路：**仍建议尽快上 Git**（以后升级最省事），以及**短期不用 Git 的同步方式**。

#### 路线 A：本地先建仓库并推到远程（推荐，一次性成本）

在**本机**工程根目录（例如 `doc-space`）执行：

```bash
cd /path/to/doc-space
git init
git add .
git commit -m "init"
```

在 GitHub / Gitee / 阿里云 Codeup 上**新建空仓库**，按平台提示添加 `origin` 并推送：

```bash
git remote add origin <远程仓库地址>
git branch -M main
git push -u origin main
```

之后在**云服务器**上按 **「3.1」** 的 `git clone` 操作即可，后续迭代都用 `git pull`。

#### 路线 B：不用 Git，直接把目录同步到云（权宜之计）

目标：让服务器上有一份与本地**源码一致**的目录树；**不要**指望把本机 **`node_modules`** 拷过去能在 Linux 上省掉 Docker 里的 `npm ci`（本机若是 macOS/Windows，与 Linux 二进制不兼容）。

**1）用 `rsync`（Mac / Linux 本机推荐）**

在**本机**执行（按实际路径、服务器用户与 IP 修改）：

```bash
# 示例：把本机 doc-space 同步到服务器家目录下的 doc-space
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '**/node_modules' \
  --exclude 'editor/server/logs' \
  --exclude 'editor/server/uploads' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  /path/to/doc-space/ \
  <用户名>@<服务器公网IP>:/home/<用户名>/doc-space/
```

首次同步后，**之后只改代码时**可反复执行同一条命令做增量同步。

**2）用 `scp` 递归拷贝（简单但大仓库较慢）**

```bash
scp -r /path/to/doc-space <用户名>@<服务器IP>:/home/<用户名>/
```

同样建议本机先删掉或不要上传各处的 **`node_modules`** 再打包/拷贝，减小体积。

**3）打 zip 上传（Windows 常用）**

在本机打包时**不要**打进 `node_modules`、本地日志与上传目录；上传到云后解压，再用 SSH 登录操作。

**4）同步完成后在云服务器上**

```bash
ssh <用户名>@<服务器IP>
cd ~/doc-space/editor/server   # 路径以你实际解压位置为准
cp deploy/.env.example deploy/.env
# 编辑 deploy/.env、deploy/config.docker.yaml（见下一节）
docker compose --env-file deploy/.env up -d --build
```

**注意**：本机 **`config.yaml`** 与云上生产配置的分工见下文 **「4.0」**。

---

## 四、环境与敏感配置

### 4.0 本机 `config.yaml` 与生产配置：要怎么做？

**为什么要分开**

- 仓库里的 **`editor/server/config.yaml`**（若存在）多用于**本机开发**：里面常见本机数据库地址、测试用 JWT、个人 `allow_origins` 等。  
- 若把这份文件**原样拷到云**或覆盖到生产路径，容易带来：**密码泄露**、**连错库**、**CORS 仍是 localhost** 等问题。

**Docker 部署时实际上读的是谁**

`docker-compose.yml` 已把**宿主机**上的：

`editor/server/deploy/config.docker.yaml`

**只读挂载**为容器内的 **`/app/config.yaml`**。也就是说：**容器里的 Go 程序读的是 `deploy/config.docker.yaml` 这份**，不是宿主机上的 `editor/server/config.yaml`（即使你在服务器目录里放了一个 `config.yaml`，默认 compose **也不会**把它挂进容器）。

**你在服务器上具体要做的事**

1. **只用** **`editor/server/deploy/config.docker.yaml`** 作为云上配置模板：用 SSH 登录后 `vim` / `nano` 编辑它（或先在本地改好再通过 rsync 同步**这一份**，不要拿本机 `config.yaml` 去覆盖它）。  
2. 按 **「4.2」** 逐项检查：**`database.dsn`**（主机名 `db`、密码与 `deploy/.env` 一致）、**`jwt.secret_key`**、**`proxy.allow_origins`**（含公网访问地址）。  
3. **`deploy/.env`** 里 Postgres 密码与 **`database.dsn`** 里密码保持一致。  
4. 改完后执行：`docker compose --env-file deploy/.env restart app`（或 `up -d`）。

**若用 rsync / zip 把整个仓库拷到云**

- **不要**用本机 **`config.yaml`** 的内容去**覆盖**服务器上的 **`deploy/config.docker.yaml`**。  
- 若希望服务器上**根本没有**本机 `config.yaml`，可在 rsync 里增加排除：  
  `--exclude 'editor/server/config.yaml'`  
  （本机仍可保留该文件做日常开发；云上只靠 `deploy/` 即可。）

**若不用 Docker、直接在云上 `go run`**

此时程序会在当前目录读 **`config.yaml`**，与 Docker 路径不同；仍建议**在服务器单独准备一份生产用 yaml**，不要与本机开发文件混用同一份拷贝。

### 4.1 使用 `.env` 管理端口与数据库账号

```bash
cp deploy/.env.example deploy/.env
```

按需编辑 **`deploy/.env`**（示例字段）：

| 变量 | 含义 | 默认 |
|------|------|------|
| `APP_PORT` | 宿主机映射到 API 容器的端口 | `9000` |
| `WEB_PORT` | 宿主机映射到前端 Nginx 的端口 | `8080` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres 初始化 | `postgres` / `postgres` / `doc` |

启动时加载 `.env`：

```bash
docker compose --env-file deploy/.env up -d --build
```

若不用单独文件，也可在 shell 里 `export` 同名变量后直接 `docker compose up -d --build`。

### 4.2 修改 `deploy/config.docker.yaml`（必做项）

该文件通过卷挂载为容器内 **`/app/config.yaml`**，**改配置后一般只需重启 `app`，无需重新构建镜像**。

1. **`database.dsn`**  
   与 **`deploy/.env`** 里 Postgres 账号密码一致，主机名必须为 **`db`**（与 compose 服务名一致），例如：

   `postgres://postgres:<你的密码>@db:5432/doc?sslmode=disable`

2. **`jwt.secret_key`**  
   改为**足够长的随机字符串**（生产环境禁止使用示例默认值）。

3. **`proxy.allow_origins`**  
   除本地调试地址外，**必须加入你实际访问前端的来源**，例如：

   - `https://www.example.com`
   - 若仍用 IP + 端口：`http://<公网IP>:8080`  

   否则浏览器会因 **CORS** 拦截接口。

4. **`redis`**（预留）  
   与 compose 中 **`redis`** 服务一致即可（默认 `addr: redis:6379`）。若 Redis 启用密码，需同步修改 `redis.password` 与 compose 里 Redis 的 `command`（见 compose 文件内注释）。

---

## 五、首次初始化数据库

仅第一次部署或空库时需要。

### 5.1 先启动数据库并等待健康

```bash
docker compose --env-file deploy/.env up -d db
docker compose ps
```

待 **`db`** 状态为 **healthy**（或多次 `docker compose ps` 直至就绪）。

### 5.2 导入表结构

在 **`editor/server`** 目录执行（与仓库中 **`sql.sql`** 路径一致）：

```bash
docker compose exec -T db psql -U postgres -d doc < sql.sql
```

若 `POSTGRES_USER` / `POSTGRES_DB` 与默认不同，将上面命令中的 `-U`、`-d` 改成与 **`.env`** 一致。

---

## 六、构建并启动全部服务

仍在 **`editor/server`**：

```bash
docker compose --env-file deploy/.env up -d --build
```

- **`-d`**：后台运行。  
- **`--build`**：强制重新构建镜像（代码或 Dockerfile 变更后建议带上）。

查看状态：

```bash
docker compose ps
```

查看日志（示例）：

```bash
docker compose logs -f web
docker compose logs -f app
```

---

## 七、验证

1. 浏览器打开 **`http://<服务器IP或域名>:<WEB_PORT>`**（默认 **8080**）。
2. 尝试注册/登录：请求应发往同源的 **`/oauth/...`**、**`/api/...`**，由 Nginx 转发到 Go。
3. 若需直连 API 调试：**`http://<主机>:<APP_PORT>`**（默认 **9000**）。

---

## 八、域名与 HTTPS（生产推荐）

1. 将域名 **A 记录** 指向服务器公网 IP。
2. 在宿主机安装 **Caddy** 或 **Nginx**，监听 **443**，将 `https://你的域名` 反代到 **`http://127.0.0.1:<WEB_PORT>`**（默认 `127.0.0.1:8080`），并配置 TLS（如 Let’s Encrypt）。
3. 在 **`deploy/config.docker.yaml`** 的 **`proxy.allow_origins`** 中加入 **`https://你的域名`**，然后执行：

   ```bash
   docker compose --env-file deploy/.env restart app
   ```

4. 安全组仅放行 **80/443**，并视情况**关闭对公网的 9000** 映射（可在 compose 中去掉 `app` 的 `ports` 段，仅保留容器内与 `web` 通信）。

---

## 九、单独构建镜像（可选）

不通过 compose，仅验证镜像构建时：

**后端**（在 **`editor/server`**）：

```bash
docker build -t doc-space-server .
```

**前端**（在 **`editor`**，注意上下文为 monorepo 根）：

```bash
cd ..   # 若当前在 editor/server，则回到 editor
docker build -f packages/app/Dockerfile -t doc-space-web .
```

---

## 十、升级与回滚

**升级（拉代码后重新构建并滚动重启）**：

```bash
cd doc-space/editor/server
git pull
docker compose --env-file deploy/.env up -d --build
```

**仅改配置（`deploy/config.docker.yaml`）**：

```bash
docker compose --env-file deploy/.env restart app
```

**回滚**：使用 git 回退到上一标签/提交后，再执行一次 **`up -d --build`**。

---

## 十一、备份与数据卷

Compose 声明的数据卷包括（名称前缀可能带项目名）：

| 卷 | 用途 |
|----|------|
| `postgres_data` | PostgreSQL 数据目录 |
| `redis_data` | Redis AOF（若使用） |
| `server_uploads` | 用户上传文件 |
| `server_logs` | 应用日志目录 |

查看卷：

```bash
docker volume ls | grep doc-space
```

备份 Postgres 示例：

```bash
docker compose exec -T db pg_dump -U postgres doc > backup-$(date +%F).sql
```

---

## 十二、常见问题

1. **前端能打开但接口全失败 / CORS**  
   检查 **`deploy/config.docker.yaml`** 中 **`allow_origins`** 是否包含浏览器地址栏的**完整协议 + 域名 + 端口**。

2. **数据库连接失败**  
   确认 **`database.dsn`** 中主机为 **`db`**、密码与 **`.env` 中 Postgres** 一致，且 **`db` 已 healthy** 后再启动 **`app`**。

3. **WebSocket 异常**  
   前端 **`/api/ws`** 由 Nginx 反代，已配置 `Upgrade` / `Connection`；若前有外层 CDN，需开启 WebSocket 支持。

4. **仅部署 API、不要 Nginx 前端**  
   可临时从 **`docker-compose.yml`** 中注释 **`web`** 服务，并自行用 Gin 托管静态资源或单独部署静态站点；此时需自行处理跨域与 API 地址（例如在构建前端时设置 **`VITE_CONTEXT_PATH`** 指向公网 API）。

---

## 十三、与「前后端不同域」的扩展

当前方案为 **同域反代**（页面与 `/api`、`/oauth` 同源）。若日后 API 使用独立子域（如 `https://api.example.com`），需要：

1. 扩展 **`packages/app/Dockerfile`**，用 **`ARG`/`ENV`** 传入 **`VITE_CONTEXT_PATH`** 并在 **`npm run build`** 前导出；
2. 后端 **`allow_origins`** 允许前端页面来源；
3. 重新 **`docker compose build web`** 并部署。

---

## 十四、相关文件索引

| 路径 | 说明 |
|------|------|
| `editor/server/docker-compose.yml` | 编排：web / app / db / redis |
| `editor/server/Dockerfile` | 后端镜像 |
| `editor/server/deploy/config.docker.yaml` | 容器内默认后端配置（挂载覆盖） |
| `editor/server/deploy/.env.example` | 端口与数据库环境变量模板 |
| `editor/packages/app/Dockerfile` | 前端构建 + Nginx 运行镜像 |
| `editor/packages/app/docker/nginx-default.conf` | 反代规则 |
| `editor/.dockerignore` | 减小前端构建上下文 |
| `editor/server/sql.sql` | 首次建表参考脚本 |

---

## 十五、阿里云 ECS 安全组（控制台「截图式」步骤说明）

以下按**阿里云控制台真实菜单顺序**书写，便于你对照界面逐项点击（文档内无法嵌入控制台截图，用「路径 + 表单项」模拟截图教程）。若你使用的是**轻量应用服务器**，入口多为 **「服务器」→「防火墙」** 或实例卡片上的 **「防火墙」**，逻辑与「放行端口 / 协议 / 来源」相同，仅菜单位置不同。

### 15.1 确认 ECS 绑定的安全组

1. 浏览器打开 **[阿里云控制台](https://home.console.aliyun.com/)** 并登录。
2. 顶部搜索框输入 **「云服务器 ECS」** → 进入 **云服务器 ECS** 产品页。
3. 左侧菜单 **「实例与镜像」** → **「实例」**。
4. 在实例列表中找到你的服务器，**点击实例 ID**（蓝色链接）进入实例详情。
5. 在详情页找到 **「安全组」** 页签（或 **「网络信息」** 区域中的安全组 ID 链接），**点击安全组 ID** 进入该安全组的规则配置页。  
   - 若列表显示多个安全组，通常选 **「主安全组」** 或与公网网卡绑定的那个；放行规则对绑定了该安全组的网卡生效。

### 15.2 添加入方向规则（放行业务端口）

1. 进入安全组后，确认当前是 **「入方向」**（默认即入方向；出站为「出方向」，一般不必改）。
2. 点击 **「手动添加」** 或 **「快速添加」**。建议新手用 **「手动添加」** 便于精确控制来源。

按本仓库 Docker 默认端口，**至少**需要能访问前端 Nginx（及可选直连 API）：

| 步骤 | 表单项（控制台显示名） | 建议填写 | 说明 |
|------|-------------------------|----------|------|
| 1 | **规则方向** | 入方向 | — |
| 2 | **授权策略** | 允许 | — |
| 3 | **协议类型** | 自定义 TCP | — |
| 4 | **端口范围** | `8080/8080` | 对应 **`WEB_PORT`**；若你改成 **80**，则填 `80/80` |
| 5 | **授权对象** | 测试：`0.0.0.0/0`；生产：你办公网出口 IP/32 或 CDN 回源网段 | `0.0.0.0/0` 表示全网可访问，**生产务必收紧** |
| 6 | **描述**（可选） | 例如 `doc-space 前端 Nginx` | 方便日后审计 |

若仍需从公网**直连调试 API**（默认 **`APP_PORT=9000`**），再添加一条：

| 表单项 | 建议填写 |
|--------|----------|
| 协议类型 | 自定义 TCP |
| 端口范围 | `9000/9000` |
| 授权对象 | 与上表相同策略；**上线后建议删除该条**，仅保留 80/443 经 SLB/反代访问 |

**SSH 远程维护**（若尚未放行）：

| 表单项 | 建议填写 |
|--------|----------|
| 协议类型 | SSH (22) 或 自定义 TCP `22/22` |
| 授权对象 | **强烈建议**仅为你家/公司公网 IP 的 `/32`，避免 `0.0.0.0/0` 全网开放 22 端口 |

### 15.3 保存与生效

1. 点击 **「保存」** 或 **「确定」**。
2. 安全组规则**通常数秒内生效**，无需重启 ECS。浏览器用 **`http://<公网IP>:8080`** 再次访问即可验证。

### 15.4 与上层 HTTPS（可选）的关系

若你在 ECS 宿主机或 SLB 上做了 **443 → 本机 8080** 的反代，则：

- 安全组需放行 **TCP 443**（以及 **80** 若做 HTTP 跳转）。
- 前端对外 URL 变为 **`https://域名`** 时，别忘了在 **`deploy/config.docker.yaml`** 的 **`allow_origins`** 中加入该来源（见前文「域名与 HTTPS」）。

### 15.5 常见问题（阿里云侧）

1. **规则已加仍访问超时**  
   检查 ECS 是否绑定 **弹性公网 IP（EIP）**、公网带宽是否 > 0；本机 **`docker compose ps`** 是否均为 `Up`。

2. **仅内网 ECS**  
   无公网 IP 时，公网无法直接访问 8080；需通过 **跳板机、VPN、负载均衡绑定 EIP** 等方式访问。

3. **「配置了安全组仍连不上 22」**  
   核对规则是否为 **入方向**、**授权对象**是否包含你当前出口 IP（出口 IP 变化后需更新规则）。

---

按以上顺序操作即可完成从空机到可访问的前后端一体部署；生产环境请务必替换 **JWT 密钥、数据库密码、CORS 白名单**，并尽快接入 **HTTPS**；云上访问时务必完成 **第十五节安全组** 与 **公网 IP / 带宽** 相关检查。
