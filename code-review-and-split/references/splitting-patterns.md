# 代码拆分模式参考

常见代码拆分策略与实现模式。

## 模式 1: 按功能模块拆分

适用于：路由文件包含多个独立功能模块

### 示例: 票根管理系统

**原始文件** `routes/pc/ticket.js` (600行)
- 票根类型管理
- 票根记录管理  
- 商户管理
- 统计分析
- 核销管理

**拆分后**
```
routes/pc/ticket/
├── index.js          # 路由聚合
├── types.js          # 票根类型 CRUD
├── records.js        # 票根记录查询
├── merchants.js      # 商户管理
├── statistics.js     # 统计分析
└── utils.js          # 共享工具函数
```

**index.js 实现**
```javascript
import express from 'express'
import typesRouter from './types.js'
import recordsRouter from './records.js'
import merchantsRouter from './merchants.js'
import statisticsRouter from './statistics.js'

const router = express.Router()

router.use('/ticket-types', typesRouter)
router.use('/tickets', recordsRouter)
router.use('/merchants', merchantsRouter)
router.use('/tickets/statistics', statisticsRouter)

export default router
```

## 模式 2: 按分层拆分（MVC）

适用于：业务逻辑与数据访问混杂

### 示例: 订单系统

**原始文件** `routes/mobile/order.js` (800行)

**拆分后**
```
routes/mobile/order.js        # 保持路由定义（精简）
controllers/order.js          # 控制层 - 处理请求/响应
services/order/               # 业务逻辑层
├── index.js
├── create.js                 # 创建订单
├── payment.js                # 支付处理
├── pricing.js                # 价格计算
└── fulfillment.js            # 订单履约
validators/order.js           # 验证层
repositories/order.js         # 数据访问层
```

**控制器层**
```javascript
// controllers/order.js
import * as orderService from '../services/order/index.js'
import * as validator from '../validators/order.js'

export async function create(req, res) {
  const validated = validator.create(req.body)
  const order = await orderService.create(validated)
  res.json({ code: 200, data: order })
}
```

**服务层**
```javascript
// services/order/create.js
import * as pricing from './pricing.js'
import * as repository from '../../repositories/order.js'

export async function create(data) {
  const price = await pricing.calculate(data)
  return repository.create({ ...data, price })
}
```

## 模式 3: 按路由拆分（Express 风格）

适用于：Express 路由文件过大

### 实现步骤

1. **识别路由组**
```javascript
// 原文件中的路由分组
// 组 1: 票根类型
router.get('/ticket-types', ...)
router.post('/ticket-types', ...)

// 组 2: 商户管理
router.get('/merchants', ...)
router.post('/merchants', ...)
```

2. **提取到单独文件**
```javascript
// routes/pc/ticket-types.js
import express from 'express'
const router = express.Router()

router.get('/', ...)
router.post('/', ...)

export default router
```

3. **聚合到主路由**
```javascript
// routes/pc/index.js
import ticketTypesRouter from './ticket-types.js'
import merchantsRouter from './merchants.js'

router.use('/ticket-types', ticketTypesRouter)
router.use('/merchants', merchantsRouter)
```

## 模式 4: 提取共享工具函数

适用于：多个文件包含重复代码

### 检测重复代码
```bash
# 使用 jscpd 检测重复
grep -r "function.*formatDate" apps/backend/src --include="*.js"
grep -r "const.*validatePhone" apps/backend/src --include="*.js"
```

### 创建工具库
```javascript
// utils/common.js
export function formatDate(date, format = 'YYYY-MM-DD') {
  // 实现
}

export function validatePhone(phone) {
  // 实现
}

export function generateCode(prefix = '') {
  // 实现
}
```

### 替换原文件引用
```javascript
// 原文件
import { formatDate, validatePhone } from '../utils/common.js'
```

## 模式 5: 提取配置和常量

适用于：文件包含硬编码配置

### 创建配置文件
```javascript
// config/ticket.js
export const TICKET_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

export const DISCOUNT_TYPES = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage'
}

export const DEFAULT_PAGE_SIZE = 10
```

### 使用配置
```javascript
import { TICKET_STATUS } from '../config/ticket.js'

if (ticket.status === TICKET_STATUS.PENDING) {
  // ...
}
```

## 模式 6: 中间件提取

适用于：路由中包含可复用的中间件逻辑

### 提取验证中间件
```javascript
// middleware/validators/ticket.js
export function validateTicketType(req, res, next) {
  const { name, code } = req.body
  if (!name || !code) {
    return res.status(400).json({ code: 400, message: '缺少必填字段' })
  }
  next()
}
```

### 使用中间件
```javascript
import { validateTicketType } from '../middleware/validators/ticket.js'

router.post('/ticket-types', validateTicketType, async (req, res) => {
  // ...
})
```

## 模式 7: 数据库模型拆分

适用于：Prisma schema 过大

### 按模块拆分 schema
```
prisma/
├── schema.prisma              # 主文件，导入其他文件
├── schema/
│   ├── user.prisma           # 用户相关模型
│   ├── order.prisma          # 订单相关模型
│   └── ticket.prisma         # 票根相关模型
```

### 使用 prisma import（需配置）
```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// 导入其他模型文件
// 注意：prisma 原生不支持 import，需要使用脚本合并
```

## 模式 8: 测试文件拆分

适用于：测试文件过大

### 按功能拆分测试
```
tests/
├── unit/
│   ├── ticket/
│   │   ├── types.test.js      # 票根类型测试
│   │   ├── records.test.js    # 票根记录测试
│   │   └── utils.test.js      # 工具函数测试
├── integration/
│   └── ticket/
│       ├── create-flow.test.js
│       └── verify-flow.test.js
```

## 拆分决策树

```
文件过大？
├── 包含多个独立功能？
│   ├── 是 → 按功能模块拆分
│   └── 否 → 继续检查
├── 业务逻辑复杂？
│   ├── 是 → 按分层拆分
│   └── 否 → 继续检查
├── 路由过多？
│   ├── 是 → 按路由拆分
│   └── 否 → 继续检查
├── 有重复代码？
│   ├── 是 → 提取工具函数
│   └── 否 → 检查配置硬编码
└── 硬编码配置？
    ├── 是 → 提取配置文件
    └── 否 → 考虑其他优化
```

## 拆分后验证清单

- [ ] 新文件能独立运行（语法正确）
- [ ] 所有导入/导出正确
- [ ] 原文件引用已更新
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 无循环依赖
- [ ] 代码重复率降低
