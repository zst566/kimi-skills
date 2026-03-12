# 快速参考卡片

## 5个强制检查点

| 检查点 | 检查内容 | 快速验证 |
|--------|----------|----------|
| CP0 | 设计完成 | 设计文档存在 |
| CP1 | 路由注册 | `grep 路由名 index.js` |
| CP2 | API契约 | `curl` 测试 |
| CP3 | 数据库连接 | 无 `getPool()` 查 `users` |
| CP4 | 前端响应 | 无 `response.code` 检查 |
| CP5 | 端到端 | 冒烟测试通过 |

## 常见错误速查

### ❌ 错误1: Store 检查 response.code
```javascript
// 错误
const response = await api.getSomething();
if (response.code === 200) { ... }

// 正确
const data = await api.getSomething();
```

### ❌ 错误2: 数据库连接错误
```javascript
// 错误 - 查询 users 表
const pool = getPool();
await pool.execute('SELECT * FROM users WHERE id = ?', [id]);

// 正确
const pool = getAuthPool();
await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
```

### ❌ 错误3: 路由忘记注册
```javascript
// 创建了路由文件，但忘记在 index.js 注册
// 必须在 backend/src/index.js 中添加:
app.use('/api/your-route', yourRoutes);
```

## 完成声明模板

```
功能 [功能名] 已完成全部检查点：

✅ CP0: 设计文档 docs/design/[feature].md
✅ CP1: 路由注册验证
   [粘贴 grep 输出]
✅ CP2: API契约验证
   [粘贴 curl 输出]
✅ CP3: 数据库连接验证
   [代码审查结果]
✅ CP4: 前端响应处理验证
   [store代码片段]
✅ CP5: 端到端测试
   [测试结果/截图]

开发者: [姓名]
日期: [日期]
```

## 一键验证

```bash
# 在项目根目录运行
cp ~/.config/agents/skills/fullstack-feature-development/scripts/verify-dev.sh ./scripts/
./scripts/verify-dev.sh
```
