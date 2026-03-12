---
name: test-env-deploy
description: 测试环境部署及维护技能。基于本地构建 + Docker 挂载模式，支持前端代码变更自动构建、后端代码变更自动重启。使用 sync.sh + docker-compose 实现开发/测试环境的自动化部署。
---

# 测试环境部署及维护技能

基于 **本地构建 + Docker 挂载模式** 的测试环境部署方案。

## 核心特点

| 特性 | 实现方式 |
|------|----------|
| **前端变更** | 本地构建 → 同步 dist → Nginx 服务 |
| **后端变更** | 同步源码 → nodemon 自动重启 → 服务生效 |
| **构建保护** | 构建失败时不同步，问题本地发现 |
| **权限修复** | 自动修复 Mac→Linux 的文件权限差异 |

## 工作流程

```
本地修改代码
     ↓
fswatch 检测变更
     ↓
┌─────────────┴─────────────┐
│        按项目类型处理       │
├─────────────┬─────────────┤
│   前端项目   │   后端项目   │
│  (pc-admin) │  (backend)  │
├─────────────┼─────────────┤
│ npm run     │ 直接同步    │
│   build     │ 源码        │
│  (本地)     │             │
├─────────────┼─────────────┤
│ 构建成功?   │             │
│ 否 → 停止   │             │
│ 是 → 继续   │             │
└──────┬──────┴──────┬──────┘
       │             │
       └──────┬──────┘
              ↓
       rsync 同步到服务器
              ↓
       ┌──────┴──────┐
       │             │
   修复权限    nodemon 自动重启
   (chmod 755)   (backend)
       │             │
       └──────┬──────┘
              ↓
        浏览器访问生效
```

## 配置文件

### 1. sync.sh（核心脚本）

```bash
#!/bin/bash

LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE_HOST="user@server"
REMOTE_DIR="~/projects/$(basename $LOCAL_DIR)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 修复权限（注意：只修复前端 dist，后端 dist 由容器生成属主为 root）
fix_permissions() {
  ssh $REMOTE_HOST "chmod -R 755 $REMOTE_DIR/apps/h5-*/dist/ $REMOTE_DIR/apps/pc-admin/dist/ 2>/dev/null || true"
}

# 后端使用 nodemon 热重载，无需手动重启
# 如需强制重启容器，使用：
# ssh $REMOTE_HOST "cd $REMOTE_DIR && docker compose restart backend"

# 构建前端
build_frontend() {
  local app_name=$1
  cd "$LOCAL_DIR/apps/$app_name" || return 1
  
  echo -e "${YELLOW}🔨 构建 $app_name...${NC}"
  if ! npm run build; then
    echo -e "${RED}❌ $app_name 构建失败！${NC}"
    return 1
  fi
  echo -e "${GREEN}✅ $app_name 构建成功${NC}"
}

# 检测源码变更
has_source_change() {
  local changed_files=$1
  local app_name=$2
  echo "$changed_files" | grep -q "apps/$app_name/src/"
}

# 首次同步
echo -e "${YELLOW}🚀 首次初始化...${NC}"

# 构建所有前端
echo ""
echo -e "${YELLOW}📦 构建所有前端项目...${NC}"
for app in h5-client h5-channel h5-teacher pc-admin; do
  if [ -d "$LOCAL_DIR/apps/$app" ]; then
    build_frontend "$app" || {
      echo -e "${RED}⚠️ $app 构建失败，继续其他项目...${NC}"
    }
  fi
done

# 完整同步
echo ""
echo -e "${YELLOW}📤 完整同步到服务器...${NC}"
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='apps/backend/dist' \  # 后端使用源码挂载，无需同步 dist
  --exclude='mysql' \               # 防止误删数据库数据
  --exclude='redis' \               # 防止误删缓存数据
  --exclude='.DS_Store' \
  --exclude='logs' \
  --exclude='*.log' \
  "$LOCAL_DIR/" "$REMOTE_HOST:$REMOTE_DIR/"

fix_permissions

echo ""
echo -e "${GREEN}✅ 初始化完成！${NC}"
echo -e "${BLUE}请在服务器上运行: cd $REMOTE_DIR && docker compose -f docker-compose.188.yml up -d${NC}"
echo ""

# 实时监听（使用基于时间戳的变更检测，更可靠）
# 创建初始时间戳文件
TIMESTAMP_FILE=$(mktemp /tmp/sync_timestamp.XXXXXX)
touch "$TIMESTAMP_FILE"

echo -e "${GREEN}👀 开始监听文件变化...${NC}"
echo -e "${BLUE}按 Ctrl+C 停止监听${NC}"
echo ""

while true; do
  # 使用 fswatch 或 fallback 到定时轮询
  if command -v fswatch &> /dev/null; then
    # fswatch: 等待文件系统事件（最多等待5秒）
    timeout 5 fswatch -r -1 "$LOCAL_DIR" > /dev/null 2>&1 || true
  else
    # fallback: 每3秒检查一次
    sleep 3
  fi
  
  # 检测变更的文件（基于时间戳，比 -mmin 更精确）
  CHANGED_FILES=$(find "$LOCAL_DIR/apps" -type f -newer "$TIMESTAMP_FILE" 2>/dev/null || true)
  
  # 更新时间戳
  touch "$TIMESTAMP_FILE"
  
  if [ -z "$CHANGED_FILES" ]; then
    continue
  fi
  
  # 显示检测到的变更
  CHANGED_COUNT=$(echo "$CHANGED_FILES" | grep -c . || echo "0")
  echo -e "${YELLOW}📝 检测到 $CHANGED_COUNT 个文件变更 $(date '+%H:%M:%S')${NC}"
  
  # 前端：构建（支持多前端项目）
  for app in h5-client h5-channel h5-teacher pc-admin; do
    if has_source_change "$CHANGED_FILES" "$app"; then
      echo -e "${YELLOW}  📦 检测到 $app 源码变更${NC}"
      if build_frontend "$app"; then
        FRONTEND_CHANGED=true
      fi
    fi
  done
  
  # 检查后端变更
  BACKEND_CHANGED=false
  if echo "$CHANGED_FILES" | grep -q "apps/backend/src/"; then
    BACKEND_CHANGED=true
  fi
  
  # 同步到服务器
  rsync -avz --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='apps/backend/dist' \
    --exclude='mysql' \
    --exclude='redis' \
    --exclude='.DS_Store' \
    --exclude='logs' \
    --exclude='*.log' \
    "$LOCAL_DIR/" "$REMOTE_HOST:$REMOTE_DIR/"
  
  fix_permissions
  
  # 后端：重启容器
  if [ "$BACKEND_CHANGED" = true ]; then
    restart_backend
  fi
  
  echo -e "${GREEN}✅ 同步完成 $(date '+%H:%M:%S')${NC}"
done
```

### 2. docker-compose.yml（统一入口模式）

```yaml
services:
  # 后端 API（源码挂载 + nodemon 热重载）
  backend:
    image: node:20-alpine
    container_name: project-backend
    working_dir: /app
    volumes:
      - ./apps/backend:/app
      - backend-node-modules:/app/node_modules
    command: >
      sh -c "npm install && 
             npx prisma generate && 
             npm run start:dev"
    restart: always

  # Nginx 统一入口（静态文件模式 - 支持 sync.sh 热重载）
  nginx:
    image: nginx:alpine
    container_name: project-nginx
    ports:
      - "8888:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d/default.conf:/etc/nginx/conf.d/default.conf:ro
      # 关键：挂载所有前端构建产物
      - ./apps/h5-client/dist:/usr/share/nginx/html/h5-client:ro
      - ./apps/h5-channel/dist:/usr/share/nginx/html/h5-channel:ro
      - ./apps/h5-teacher/dist:/usr/share/nginx/html/h5-teacher:ro
      - ./apps/pc-admin/dist:/usr/share/nginx/html/pc-admin:ro
    depends_on:
      - backend
    restart: always

  # MySQL 数据库（命名卷保存数据）
  mysql:
    image: mysql:8.0
    container_name: project-mysql
    environment:
      - MYSQL_ROOT_PASSWORD=root123
      - MYSQL_DATABASE=project_db
    volumes:
      - mysql_data:/var/lib/mysql
    restart: always

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: project-redis
    volumes:
      - redis_data:/data
    restart: always

volumes:
  backend-node-modules:
  mysql_data:
  redis_data:
```

**关键设计**:
- 后端使用 **源码挂载** + **nodemon** 实现热重载
- Nginx 统一入口，所有前端使用 **静态文件模式**
- 前端 `dist` 目录挂载到 Nginx，支持 `sync.sh` 热重载
- 数据库使用 **命名卷**（不被 rsync 同步）

## 使用说明

### 启动同步

```bash
./sync.sh
```

### 工作流程说明

| 操作 | 触发条件 | 执行动作 | 生效时间 |
|------|----------|----------|----------|
| **修改前端代码** | `apps/pc-admin/src/**` | 本地 `npm run build` → 同步 | 10-30s |
| **修改后端代码** | `apps/backend/src/**` | 同步 → `docker restart backend` | 5-10s |
| **修改配置文件** | `docker/nginx/**` | 同步 → 手动重启 nginx | 手动 |

### 关键行为

1. **前端构建失败保护**
   - 构建错误在本地捕获
   - 错误信息直接显示在终端
   - **不会同步到服务器**

2. **后端自动重启**
   - API 代码变更后自动重启容器
   - 使用 `docker restart` 而非重建容器
   - 保留容器状态（如数据库连接池）

3. **权限自动修复**
   - Mac 本地构建的文件权限为 644
   - 自动执行 `chmod 755` 修复
   - 避免 Nginx 403 错误

## 重要设计原则

### 单 Nginx 容器 vs 多前端容器

**推荐架构**：单 Nginx 容器挂载多前端 dist

```yaml
# ✅ 推荐：单 Nginx 容器
services:
  nginx:
    image: nginx:alpine
    volumes:
      - ./apps/h5-client/dist:/usr/share/nginx/html/h5-client:ro
      - ./apps/h5-channel/dist:/usr/share/nginx/html/h5-channel:ro
      - ./apps/h5-teacher/dist:/usr/share/nginx/html/h5-teacher:ro
      - ./apps/pc-admin/dist:/usr/share/nginx/html/pc-admin:ro
```

**不推荐**：每个前端独立容器

```yaml
# ❌ 不推荐：4个前端容器
services:
  h5-client:
    image: node:20
    command: npm run dev
  h5-channel:
    image: node:20
    command: npm run dev
  # ... 更多容器
```

**原因**：
| 维度 | 单 Nginx | 多前端容器 |
|------|---------|-----------|
| 内存占用 | 1个 Nginx 进程 (~50MB) | 4个 Nginx + 4个 Node (~500MB+) |
| 启动速度 | 快 | 慢 |
| 热重载支持 | ✅ sync.sh 同步 dist 即可 | ❌ 容器内代码不与本地同步 |
| 架构复杂度 | 简单 | 复杂 |
| 与生产一致性 | 高 | 低 |

**核心原则**：sync.sh 的工作模式是"本地构建 → 同步 dist"，所以只需要 Nginx 服务静态文件，不需要前端容器跑 dev server。

---

## 部署检查清单

### 首次部署前检查

#### sync.sh 配置
- [ ] `REMOTE_HOST` 配置正确
- [ ] `REMOTE_DIR` 与 docker-compose 路径一致
- [ ] 路径**不含中文**（避免兼容性问题）
- [ ] SSH 免密登录已配置

#### 服务器目录准备
```bash
# 创建目录
sudo mkdir -p /opt/fulu-english
sudo chown $(whoami):$(whoami) /opt/fulu-english

# 准备 MySQL 目录
mkdir -p mysql/data mysql/init
chmod 755 mysql/init  # 重要！

# 准备前端目录（sync.sh 会自动创建）
```

#### docker-compose 配置
- [ ] 后端健康检查路径与实际路由一致
- [ ] MySQL 端口映射正确（避免冲突）
- [ ] 数据卷使用命名卷或正确权限的 bind mount

### 启动后验证

```bash
# 1. 检查所有容器状态
docker compose ps

# 期望状态：
# - mysql: healthy
# - redis: running
# - backend: healthy
# - nginx: running

# 2. 验证 MySQL 连接权限
docker exec <mysql> mysql -uroot -p -e "SELECT user, host FROM mysql.user;"
# 确保 root 的 host 是 '%'

# 3. 验证后端健康检查
curl http://localhost:3000/api/health
# 应返回 {"status":"ok"}

# 4. 验证 Nginx 服务
curl http://localhost:8888/health
# 应返回 "healthy"
```

---

## 重要注意事项

### ⚠️ Nginx 必须使用静态文件模式，而非 Vite Dev Server

**错误做法**：
```nginx
# 不要这样做！Vite dev server 容器内的代码与本地不同步
location / {
    proxy_pass http://frontend-vite-dev:5173/;
}
```

**正确做法**：
```nginx
# Nginx 直接服务静态文件
location / {
    root /usr/share/nginx/html/h5-client;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

**原因**：
- Vite dev server 运行在独立容器中，其源码是独立的
- 本地修改的代码不会自动同步到 Vite 容器
- 只有通过 `npm run build` 生成的 `dist` 文件才是可同步的

### ⚠️ sync.sh 必须排除的目录

| 排除项 | 原因 | 后果（不排除） |
|--------|------|----------------|
| `apps/backend/dist` | 后端使用源码挂载，dist 由容器生成 | 权限错误（属主 root） |
| `mysql` | 数据库数据文件 | 误删生产/测试数据 |
| `redis` | 缓存数据文件 | 误删缓存数据 |
| `.git` | 版本控制 | 不必要的同步 |
| `node_modules` | 依赖包 | 体积过大，平台差异 |

### ⚠️ 权限修复的范围

**只修复前端 dist**：
```bash
# ✅ 正确：只修复前端
chmod -R 755 apps/h5-*/dist/ apps/pc-admin/dist/

# ❌ 错误：尝试修复后端 dist（属主 root，会报错）
chmod -R 755 apps/*/dist/
```

---

## 故障排查

### Q: MySQL 容器启动失败 (unhealthy)？

**症状**：`docker compose up` 时 mysql 服务显示 `unhealthy` 或反复重启

**常见原因及解决方案**：

#### 1. 数据目录权限错误
```bash
# 错误日志：Failed to find valid data directory
# 检查数据目录权限
ls -la mysql/data

# 修复：数据目录属主必须是 999 (mysql 容器用户)
sudo rm -rf mysql/data
mkdir -p mysql/data
# 或
sudo chown -R 999:999 mysql/data
```

#### 2. init 目录权限问题
```bash
# 错误日志：cannot open directory '/docker-entrypoint-initdb.d/': Permission denied
# 修复：确保 init 目录可读
chmod 755 mysql/init
```

#### 3. 端口冲突
```bash
# 检查端口占用
sudo netstat -tlnp | grep 3306
# 修改 docker-compose.yml 中的端口映射
```

---

### Q: 后端容器连接 MySQL 被拒绝？

**症状**：后端日志显示 `Host 'xxx.xxx.xxx.xxx' is not allowed to connect to this MySQL server`

**原因**：MySQL 刚初始化时，root 用户只允许 localhost 连接

**解决方案**：
```bash
# 进入 MySQL 容器修复权限
docker exec -it <mysql-container> mysql -uroot -p<password> -e "
  UPDATE mysql.user SET host='%' WHERE user='root';
  GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
  FLUSH PRIVILEGES;
"

# 然后重启后端容器
docker restart <backend-container>
```

**预防措施**：在 mysql/init 中添加初始化脚本：
```sql
-- mysql/init/01-grant.sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';
UPDATE mysql.user SET host='%' WHERE user='root';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

---

### Q: 后端健康检查失败 (unhealthy)？

**症状**：后端容器状态为 `unhealthy`

**常见原因**：

#### 1. 健康检查路径与实际路由不一致
```bash
# 检查 Dockerfile 中的 HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 检查实际健康检查路由
curl http://localhost:3000/api/health

# 如果不一致，在 docker-compose.yml 中覆盖：
backend:
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

#### 2. 数据库连接失败
- 检查 MySQL 是否 healthy
- 检查 DATABASE_URL 配置
- 检查数据库是否存在

---

### Q: sync.sh 提示配置文件不存在？

**原因**：`sync.sh` 中的 `REMOTE_DIR` 与 `docker-compose` 实际路径不一致

**解决方案**：
```bash
# 统一使用相同的目录
REMOTE_DIR="/opt/fulu-english"  # sync.sh
docker compose -f /opt/fulu-english/docker-compose.188.yml up -d  # 服务器端
```

**注意**：避免使用包含中文的路径，可能导致某些系统兼容性问题。

---

### Q: 前端修改后页面没有更新？

```bash
# 检查清单
1. 查看 sync.sh 输出是否有构建错误
2. 检查 dist 是否同步：ssh server "ls -la ~/projects/xxx/apps/pc-admin/dist/"
3. 检查权限：ssh server "ls -la ~/projects/xxx/apps/pc-admin/dist/ | head"
4. 强制刷新浏览器：Ctrl+Shift+R
```

### Q: 后端 API 修改没有生效？

```bash
# 手动重启后端
ssh server "cd ~/projects/xxx && docker compose restart backend"

# 查看后端日志
ssh server "docker logs -f xinyi-backend"
```

### Q: 如何跳过某个项目的自动构建？

编辑 `sync.sh`，注释掉对应项目的构建调用：

```bash
# if has_source_change "$CHANGED_FILES" "mobile-h5"; then
#   build_frontend "mobile-h5" || continue
# fi
```

### Q: 后端如何实现真正的热重载（不重启容器）？

使用 `nodemon` 替代 `node`：

```yaml
backend:
  command: >
    sh -c "npm install && 
           npx prisma generate && 
           npm run dev"  # 使用 nodemon
```

然后在 `package.json` 中：
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

这样后端代码变更后，nodemon 会自动重启 Node 进程，无需重启容器。

## 配置检查清单

### sync.sh 配置
- [ ] `REMOTE_HOST` 配置了正确的服务器地址
- [ ] `REMOTE_DIR` 配置了正确的远程目录（与 docker-compose 一致）
- [ ] **路径不含中文**（避免兼容性问题）
- [ ] **rsync 排除了 `mysql`、`redis`、`apps/backend/dist`**
- [ ] **权限修复只针对前端 dist**（`h5-*`、`pc-admin`）
- [ ] SSH 免密登录已配置

### docker-compose.yml 配置
- [ ] 后端使用 `node:20`，挂载**源码目录**（非 dist）
- [ ] 后端使用 `nodemon` 实现热重载
- [ ] **后端健康检查路径与实际路由一致**（如 `/api/health`）
- [ ] **Nginx 挂载前端 `dist` 目录**（关键！）
- [ ] Nginx 使用静态文件服务（非 Vite dev server 代理）
- [ ] MySQL `init` 目录权限为 `755`
- [ ] MySQL 端口映射不冲突

### 服务器环境准备
- [ ] 目录已创建且当前用户有权限
- [ ] `mysql/data` 目录为空或正确初始化
- [ ] `mysql/init` 目录权限为 `755`
- [ ] Docker 和 Docker Compose 已安装

### 首次部署验证
- [ ] `docker compose ps` 显示所有容器正常
- [ ] MySQL 状态为 `healthy`
- [ ] 后端状态为 `healthy`
- [ ] `curl /api/health` 返回成功
- [ ] Nginx 能正常服务前端静态文件

### 本地环境
- [ ] `fswatch` 已安装（`brew install fswatch`）
- [ ] 各前端项目能正常 `npm run build`
- [ ] 后端 `package.json` 有 `start:dev` 或 `dev` 脚本

## 相关工具

- `fswatch` - 文件系统监控（`brew install fswatch`）
- `rsync` - 增量文件同步
- `docker-compose` - 容器编排
- `nginx` - 静态文件服务器
