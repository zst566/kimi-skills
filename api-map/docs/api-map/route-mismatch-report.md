# 路由匹配检测报告

生成时间: 2026/3/11 20:30:56

## 统计概览

- 总 API 数: 126
- ✅ 匹配成功: 88 (69.8%)
- ⚠️ 路径不匹配: 26
- ❌ 未找到路由: 12

## ⚠️ 路径不匹配问题

| 前端期望路径 | 后端实际路径 | 原因 | 建议 |
|-------------|-------------|------|------|
| /api/pc/auth/verify | /api/mobile/auth/verify | 路径相似但结构不同 | 后端实际路径: /api/mobile/auth/verify |
| /api/pc/carpool/calculate-driving-time | /api/pc/carpool-calculate/calculate-driving-time | 路径相似但结构不同 | 后端实际路径: /api/pc/carpool-calculate/calculate-driving-time |
| /api/pc/carpool/routes/${routeId}/calculate-times | /api/pc/carpool-calculate/routes/:id/calculate-times | 路径相似但结构不同 | 后端实际路径: /api/pc/carpool-calculate/routes/:id/calculate-times |
| /api/pc/carpool-stops/${id}/status | /api/pc/carpool-stops | 路径嵌套层级不匹配: 后端使用扁平结构，前端期望了嵌套 | 前端应该使用路径: /api/pc/carpool-stops |
| /api/pc/carpools/stats | /api/pc/carpools | 路径嵌套层级不匹配: 后端使用扁平结构，前端期望了嵌套 | 前端应该使用路径: /api/pc/carpools |
| /api/pc/config/home_full_config | /api/pc/config | 路径嵌套层级不匹配: 后端使用扁平结构，前端期望了嵌套 | 前端应该使用路径: /api/pc/config |
| /api/pc/config/home_full_config | /api/pc/config | 路径嵌套层级不匹配: 后端使用扁平结构，前端期望了嵌套 | 前端应该使用路径: /api/pc/config |
| /api/pc/config/home_banners | /api/pc/config | 路径嵌套层级不匹配: 后端使用扁平结构，前端期望了嵌套 | 前端应该使用路径: /api/pc/config |
| /api/pc/config/home_features | /api/pc/config | 路径嵌套层级不匹配: 后端使用扁平结构，前端期望了嵌套 | 前端应该使用路径: /api/pc/config |
| /api/pc/ticket-types/${id} | /api/pc/ticket-types | 路径嵌套层级不匹配: 后端使用扁平结构，前端期望了嵌套 | 前端应该使用路径: /api/pc/ticket-types |
| /api/pc/ticket-types/${typeId}/samples | /api/pc/ticket-types | 路径嵌套层级不匹配: 后端使用扁平结构，前端期望了嵌套 | 前端应该使用路径: /api/pc/ticket-types |
| /api/pc/ticket-types/${typeId}/samples/${sampleId} | /api/pc/ticket-types | 路径嵌套层级不匹配: 后端使用扁平结构，前端期望了嵌套 | 前端应该使用路径: /api/pc/ticket-types |
| /api/pc/ticket-types/${typeId}/samples/order | /api/pc/ticket-types | 路径嵌套层级不匹配: 后端使用扁平结构，前端期望了嵌套 | 前端应该使用路径: /api/pc/ticket-types |
| /api/pc/ticket-config/ai-recognition | /api/pc/ticket/ticket-config/ai-recognition | 路径嵌套层级不匹配: 前端期望扁平结构，后端使用了嵌套 | 需要在前端路由中独立挂载或修改后端路由结构。后端路径: /api/pc/ticket/ticket-config/ai-recognition |
| /api/pc/ticket-config/ai-recognition | /api/pc/ticket/ticket-config/ai-recognition | 路径嵌套层级不匹配: 前端期望扁平结构，后端使用了嵌套 | 需要在前端路由中独立挂载或修改后端路由结构。后端路径: /api/pc/ticket/ticket-config/ai-recognition |
| /api/pc/ticket-config/ai-recognition/test | /api/pc/ticket/ticket-config/ai-recognition/test | 路径嵌套层级不匹配: 前端期望扁平结构，后端使用了嵌套 | 需要在前端路由中独立挂载或修改后端路由结构。后端路径: /api/pc/ticket/ticket-config/ai-recognition/test |
| /api/pc/tickets/review | /api/pc/ticket/tickets/:id/review | 路径嵌套层级不匹配: 前端期望扁平结构，后端使用了嵌套 | 需要在前端路由中独立挂载或修改后端路由结构。后端路径: /api/pc/ticket/tickets/:id/review |
| /api/pc/tickets/${id} | /api/pc/agreements/:type | 路径相似但结构不同 | 后端实际路径: /api/pc/agreements/:type |
| /api/pc/tickets/review-history | /api/pc/ticket/tickets/review-history | 路径嵌套层级不匹配: 前端期望扁平结构，后端使用了嵌套 | 需要在前端路由中独立挂载或修改后端路由结构。后端路径: /api/pc/ticket/tickets/review-history |
| /api/pc/merchants | /api/pc/ticket/merchants | 路径嵌套层级不匹配: 前端期望扁平结构，后端使用了嵌套 | 需要在前端路由中独立挂载或修改后端路由结构。后端路径: /api/pc/ticket/merchants |
| /api/pc/merchants/${id} | /api/pc/agreements/:type | 路径相似但结构不同 | 后端实际路径: /api/pc/agreements/:type |
| /api/pc/merchants | /api/pc/ticket/merchants | 路径嵌套层级不匹配: 前端期望扁平结构，后端使用了嵌套 | 需要在前端路由中独立挂载或修改后端路由结构。后端路径: /api/pc/ticket/merchants |
| /api/pc/merchants/${id} | /api/pc/agreements/:type | 路径相似但结构不同 | 后端实际路径: /api/pc/agreements/:type |
| /api/pc/merchants/${id} | /api/pc/agreements/:type | 路径相似但结构不同 | 后端实际路径: /api/pc/agreements/:type |
| /api/pc/merchants/${id}/status | /api/pc/articles/:id/status | 路径相似但结构不同 | 后端实际路径: /api/pc/articles/:id/status |
| /api/pc/tickets/statistics | /api/pc/ticket/tickets/statistics | 路径嵌套层级不匹配: 前端期望扁平结构，后端使用了嵌套 | 需要在前端路由中独立挂载或修改后端路由结构。后端路径: /api/pc/ticket/tickets/statistics |

## 🔧 修复建议

### 1. 前端请求 /api/pc/ticket-config/ai-recognition 但后端路由注册在 /api/pc/ticket/ticket-config/ai-recognition

- **类型**: route_mount
- **严重程度**: error
- **涉及文件**: apps/backend/src/routes/pc/index.js

**解决方案**:

在 routes/pc/index.js 中添加独立挂载：

```javascript
// 票根类型管理（独立挂载，前端直接访问 /api/pc/ticket-config/ai-recognition）
import ticketTypesRouter from './ticket/types.js'
router.use('/ticket-config/ai-recognition', ticketTypesRouter)
```

### 2. 前端请求 /api/pc/ticket-config/ai-recognition 但后端路由注册在 /api/pc/ticket/ticket-config/ai-recognition

- **类型**: route_mount
- **严重程度**: error
- **涉及文件**: apps/backend/src/routes/pc/index.js

**解决方案**:

在 routes/pc/index.js 中添加独立挂载：

```javascript
// 票根类型管理（独立挂载，前端直接访问 /api/pc/ticket-config/ai-recognition）
import ticketTypesRouter from './ticket/types.js'
router.use('/ticket-config/ai-recognition', ticketTypesRouter)
```

### 3. 前端请求 /api/pc/ticket-config/ai-recognition/test 但后端路由注册在 /api/pc/ticket/ticket-config/ai-recognition/test

- **类型**: route_mount
- **严重程度**: error
- **涉及文件**: apps/backend/src/routes/pc/index.js

**解决方案**:

在 routes/pc/index.js 中添加独立挂载：

```javascript
// 票根类型管理（独立挂载，前端直接访问 /api/pc/ticket-config/ai-recognition/test）
import ticketTypesRouter from './ticket/types.js'
router.use('/ticket-config/ai-recognition/test', ticketTypesRouter)
```

### 4. 前端请求 /api/pc/tickets/review-history 但后端路由注册在 /api/pc/ticket/tickets/review-history

- **类型**: route_mount
- **严重程度**: error
- **涉及文件**: apps/backend/src/routes/pc/index.js

**解决方案**:

在 routes/pc/index.js 中添加独立挂载：

```javascript
// 票根类型管理（独立挂载，前端直接访问 /api/pc/tickets/review-history）
import ticketTypesRouter from './ticket/types.js'
router.use('/tickets/review-history', ticketTypesRouter)
```

### 5. 前端请求 /api/pc/merchants 但后端路由注册在 /api/pc/ticket/merchants

- **类型**: route_mount
- **严重程度**: error
- **涉及文件**: apps/backend/src/routes/pc/index.js

**解决方案**:

在 routes/pc/index.js 中添加独立挂载：

```javascript
// 票根类型管理（独立挂载，前端直接访问 /api/pc/merchants）
import ticketTypesRouter from './ticket/types.js'
router.use('/merchants', ticketTypesRouter)
```

### 6. 前端请求 /api/pc/merchants 但后端路由注册在 /api/pc/ticket/merchants

- **类型**: route_mount
- **严重程度**: error
- **涉及文件**: apps/backend/src/routes/pc/index.js

**解决方案**:

在 routes/pc/index.js 中添加独立挂载：

```javascript
// 票根类型管理（独立挂载，前端直接访问 /api/pc/merchants）
import ticketTypesRouter from './ticket/types.js'
router.use('/merchants', ticketTypesRouter)
```

### 7. 前端请求 /api/pc/tickets/statistics 但后端路由注册在 /api/pc/ticket/tickets/statistics

- **类型**: route_mount
- **严重程度**: error
- **涉及文件**: apps/backend/src/routes/pc/index.js

**解决方案**:

在 routes/pc/index.js 中添加独立挂载：

```javascript
// 票根类型管理（独立挂载，前端直接访问 /api/pc/tickets/statistics）
import ticketTypesRouter from './ticket/types.js'
router.use('/tickets/statistics', ticketTypesRouter)
```

