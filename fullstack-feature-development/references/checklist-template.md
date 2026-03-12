# 开发检查清单模板

## Phase 0: 设计阶段检查点 (CP0)

- [ ] 头脑风暴完成，边界清晰
- [ ] 设计文档已创建
- [ ] API契约已定义
- [ ] 数据库变更已确认
- [ ] 界面入口已设计

**CP0通过标准**: 以上全部勾选

---

## Phase 1: 后端开发检查点

### CP1: 路由注册验证

- [ ] 路由文件已创建
- [ ] 路由已注册到 `index.js`

验证命令：
```bash
grep -n "你的路由" backend/src/index.js
```

**输出粘贴**: 
```
```

### CP2: API契约验证

- [ ] 响应格式符合契约
- [ ] 错误码统一
- [ ] HTTP状态码正确

验证命令：
```bash
curl -X [METHOD] http://localhost:[PORT]/api/[endpoint] \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '[REQUEST]' | jq
```

**响应粘贴**:
```json
```

### CP3: 数据库连接验证

- [ ] 查询 `users` 表用 `getAuthPool()`
- [ ] 业务表操作用 `getPool()`
- [ ] Schema变更已验证

验证命令：
```bash
# 检查代码中是否有错误的数据库连接
grep -r "getPool()" backend/src/ | grep "users"
```

**结果**: 应该无输出

---

## Phase 2: 前端开发检查点

### CP4: 响应处理验证

- [ ] api.js 方法已添加
- [ ] store 响应处理正确
- [ ] 界面入口已添加

**关键验证**: 确认store中没有检查 `response.code === 200`

验证命令：
```bash
grep -r "response.code === 200" frontend/src/store/
```

**结果**: 应该无输出

界面入口验证：
```bash
grep -rn "入口文本" frontend/src/views/
```

---

## Phase 3: 集成验证检查点

### CP5: 端到端冒烟测试

测试场景: _______________

- [ ] 用户操作 → API调用
- [ ] API → 后端路由
- [ ] 后端 → 数据库
- [ ] 数据库 → 后端响应
- [ ] 后端响应 → 前端展示

**冒烟测试通过**: [是/否]

---

## 完成声明

我声明该功能已通过 CP0-CP5 全部检查点，可以交付。

**开发者**: _______________
**日期**: _______________
