---
name: api-testing-with-auth
description: "通用 API 集成测试技能，支持自动发现登录接口、获取认证令牌并测试受保护接口。用于前后端集成验证、API 修改后的回归测试。当需要测试需要登录认证的 API 接口、验证后端服务是否正常工作、或进行接口集成测试时触发。支持 Bearer Token、Cookie、Query Token 等多种认证方式。"
---

# API 集成测试（带自动认证）

通用 API 测试工作流，自动处理登录认证流程，支持测试受保护的接口。

## 核心工作流程

### 1. 分析测试需求

确定以下信息：
- **目标端**: 移动端(/api/mobile/*)、PC端(/api/pc/*)、商户端(/api/merchant/*)、公共端(/api/public/*)
- **待测试接口**: 新增或修改的 API 端点
- **认证方式**: 从代码中推断（Bearer Token、Cookie、Query Param）

### 2. 自动发现登录接口和路由挂载

在项目的后端代码中搜索登录接口：

```bash
# 搜索登录相关路由
grep -r "login\|signin\|auth" apps/backend/src/routes/{mobile,pc,merchant}/ --include="*.js" | grep -i "post\|router"

# 查看具体登录接口实现
grep -A 20 "router.post.*login" apps/backend/src/routes/{mobile,pc,merchant}/auth.js
```

常见登录路径模式：
- `/api/mobile/auth/login` - 移动端登录
- `/api/mobile/auth/wechat-login` - 微信登录
- `/api/pc/auth/login` - PC 管理端登录
- `/api/merchant/auth/login` - 商户端登录

**重要：检查路由挂载路径**

路由可能在主路由文件中被挂载到子路径：
```bash
# 查看 PC 路由挂载
grep -n "router.use.*ticket\|router.use.*merchant" apps/backend/src/routes/pc/index.js
```

例如：如果看到 `router.use('/ticket', ticketRouter)`，则票根相关接口的实际路径是：
- `/api/pc/ticket/ticket-types` 而不是 `/api/pc/ticket-types`
- `/api/pc/ticket/merchants` 而不是 `/api/pc/merchants`

### 3. 获取测试账号

从以下途径获取测试账号：

**A. 数据库查询**
```bash
# 查找管理员账号
docker exec mysql mysql -uroot -p -e "SELECT username, role FROM User WHERE role='admin' LIMIT 5;"

# 查找普通用户
docker exec mysql mysql -uroot -p -e "SELECT phone, nickname FROM User LIMIT 5;"
```

**B. 代码/配置中查找**
```bash
# 搜索测试账号配置
grep -r "test.*user\|admin.*password\|default.*account" apps/ --include="*.js" --include="*.json" --include="*.md"
```

**C. 常用测试账号尝试**
- PC 端: `admin/admin123`, `admin/admin888`
- 移动端: 使用已注册的手机号 + 短信验证码或密码

### 4. 执行登录获取 Token

```bash
# Bearer Token 方式 (最常见)
curl -s -X POST "http://{host}/api/{端}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"账号","password":"密码"}'

# 微信登录方式
curl -s -X POST "http://{host}/api/mobile/auth/wechat-login" \
  -H "Content-Type: application/json" \
  -d '{"code":"wx_auth_code"}'
```

从响应中提取 token：
```bash
# 提取 token
echo '$RESPONSE' | grep -o '"token":"[^"]*"' | cut -d'"' -f4
# 或
echo '$RESPONSE' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])"
```

### 5. 测试目标接口

使用获取的 token 测试目标接口：

```bash
# Bearer Token 认证
curl -s "http://{host}/api/{端}/{目标接口}" \
  -H "Authorization: Bearer $TOKEN"

# Cookie 认证
curl -s "http://{host}/api/{端}/{目标接口}" \
  -H "Cookie: session=$TOKEN"

# Query Token 认证
curl -s "http://{host}/api/{端}/{目标接口}?token=$TOKEN"
```

### 6. 验证响应

检查响应是否成功：
- `code: 0` 或 `code: 200` 表示成功
- `code: 401/403` 表示认证问题
- `code: 500` 表示服务端错误

## 项目结构适配

### Node.js + Express 后端
登录路由通常在：
- `apps/backend/src/routes/{mobile,pc,merchant}/auth.js`
- `apps/backend/src/routes/{mobile,pc,merchant}/index.js`

### 多环境支持
| 环境 | 基础 URL | 获取方式 |
|-----|---------|---------|
| 本地 | `http://localhost:3000` | 代码/配置 |
| 开发服务器 | `http://192.168.x.x` | AGENTS.md 或询问用户 |
| 测试环境 | `https://api-test.xxx.com` | 环境变量或配置 |

## 常见问题处理

### 登录失败
1. 检查账号密码是否正确
2. 检查是否需要验证码（查看登录接口代码）
3. 尝试其他测试账号
4. 检查用户表是否有该账号

### Token 无效
1. 检查 token 是否过期（查看 JWT 配置）
2. 检查 Authorization header 格式：`Bearer {token}`
3. 检查是否使用了正确的端（mobile/pc/merchant）

### 跨域问题
如遇到 CORS 错误，使用服务器直接测试而非浏览器。

## 快速检查清单

开始测试前确认：
- [ ] 后端服务已启动且可访问
- [ ] 已确定目标接口的完整路径
- [ ] 已找到对应端的登录接口
- [ ] 已有可用的测试账号
- [ ] 已确定认证方式（Bearer/Cookie/Query）

## 脚本工具

使用 `scripts/test-api.sh` 进行自动化测试：

```bash
# 测试 PC 端接口
./scripts/test-api.sh --endpoint pc --url /ticket-types --method GET

# 测试移动端接口
./scripts/test-api.sh --endpoint mobile --url /user/profile --method GET

# 带参数的 POST 请求
./scripts/test-api.sh --endpoint pc --url /ticket-types --method POST \
  --data '{"name":"测试","code":"test"}'
```
