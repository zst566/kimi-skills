# API 路径不匹配问题 - 详细修复指南

## 📊 问题分级

### 🔴 高优先级（影响核心功能）

| API | 前端路径 | 后端路径 | 影响 | 修复方案 |
|-----|---------|---------|------|---------|
| 商户列表 | `/api/pc/merchants` | `/api/pc/ticket/merchants` | 商户管理页面无法加载 | 后端独立挂载 |
| 票根审核 | `/api/pc/tickets/review` | `/api/pc/ticket/tickets/:id/review` | 票根审核功能失效 | 后端独立挂载 |
| 票根统计 | `/api/pc/tickets/statistics` | `/api/pc/ticket/tickets/statistics` | 数据统计页面报错 | 后端独立挂载 |

### 🟡 中优先级（影响功能体验）

| API | 前端路径 | 后端路径 | 影响 | 修复方案 |
|-----|---------|---------|------|---------|
| AI识别配置 | `/api/pc/ticket-config/*` | `/api/pc/ticket/ticket-config/*` | AI配置无法保存 | 后端独立挂载 |
| 拼车计算 | `/api/pc/carpool/*` | `/api/pc/carpool-calculate/*` | 路径不一致 | 前端修改路径 |

### 🟢 低优先级（可延后）

| API | 前端路径 | 后端路径 | 影响 | 修复方案 |
|-----|---------|---------|------|---------|
| 首页配置 | `/api/pc/config/*` | 动态路由实际可用 | 实际功能正常 | 扫描器误报，无需修复 |

---

## 🔧 具体修复步骤

### 修复 1: 商户管理接口

**问题**: 前端调用 `/api/pc/merchants`，后端实际在 `/api/pc/ticket/merchants`

**修复方案 A** (推荐 - 后端修复):

文件: `apps/backend/src/routes/pc/index.js`

```javascript
// 在文件末尾添加（约第 117 行）

// 商户管理（独立挂载，前端直接访问 /api/pc/merchants）
import merchantsRouter from './ticket/merchants.js'
router.use('/merchants', merchantsRouter)
```

然后重启后端服务：
```bash
ssh zhou@192.168.31.188 "docker restart xinyi-wenlu-backend"
```

**修复方案 B** (前端修复):

文件: `apps/pc-admin/src/api/merchant.js`

```javascript
// 修改 base URL
// 原: return request.get('/api/pc/merchants', { params })
// 改为:
return request.get('/api/pc/ticket/merchants', { params })
```

---

### 修复 2: 票根相关接口

**问题**: 所有票根接口都有 `/ticket` 前缀问题

**修复方案** (后端统一修复):

文件: `apps/backend/src/routes/pc/index.js`

```javascript
// 在文件末尾添加

// 票根模块独立挂载（解决路径嵌套问题）
import ticketTypesRouter from './ticket/types.js'
import ticketReviewRouter from './ticket/review.js'
import ticketStatisticsRouter from './ticket/statistics.js'
import merchantsRouter from './ticket/merchants.js'
import aiConfigRouter from './ticket/ai-config.js'

router.use('/ticket-types', ticketTypesRouter)
router.use('/tickets/review', ticketReviewRouter)
router.use('/tickets/statistics', ticketStatisticsRouter)
router.use('/merchants', merchantsRouter)
router.use('/ticket-config/ai-recognition', aiConfigRouter)
```

---

### 修复 3: 拼车计算接口

**问题**: 前端 `/api/pc/carpool/*`，后端 `/api/pc/carpool-calculate/*`

**修复方案** (前端修复):

文件: `apps/pc-admin/src/api/carpool-calculate.js`

```javascript
// 修改所有接口路径
// 原: return request.get('/api/pc/carpool/calculate-driving-time', ...)
// 改为:
return request.get('/api/pc/carpool-calculate/calculate-driving-time', ...)
```

---

### 修复 4: 拼车停靠点状态

**问题**: 缺少 `PUT /api/pc/carpool-stops/:id/status` 接口

**修复方案** (后端添加接口):

文件: `apps/backend/src/routes/pc/carpool-stop.js`

在文件末尾添加：

```javascript
/**
 * 切换停靠点状态
 * PUT /api/pc/carpool-stops/:id/status
 */
router.put('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    const updated = await prisma.carpoolStop.update({
      where: { id: parseInt(id) },
      data: { status }
    })
    
    res.json({
      code: 200,
      message: '状态更新成功',
      data: updated
    })
  } catch (error) {
    next(error)
  }
})
```

---

## ✅ 修复检查清单

修复完成后，使用以下命令验证：

```bash
# 1. 商户管理
curl http://192.168.31.188/api/pc/merchants \
  -H "Authorization: Bearer $TOKEN"
# 期望: 200 OK

# 2. 票根统计
curl http://192.168.31.188/api/pc/tickets/statistics \
  -H "Authorization: Bearer $TOKEN"  
# 期望: 200 OK

# 3. 拼车停靠点状态
curl -X PUT http://192.168.31.188/api/pc/carpool-stops/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}'
# 期望: 200 OK
```

---

## 📊 修复优先级建议

**本周完成**:
1. ✅ 商户管理接口 (影响核心功能)
2. ✅ 票根统计接口 (影响数据统计)

**下周完成**:
3. ✅ 票根审核接口 (影响业务流程)
4. ✅ AI识别配置 (影响AI功能)

**下月完成**:
5. ⏸️ 拼车相关接口优化
