---
name: code-review-and-split
description: "复杂代码检测、拆分方案设计与并发重构执行。当发现代码文件过大、函数过长、圈复杂度过高需要拆分重构，或需要并行化代码拆分任务以提高效率时使用。支持自动复杂度分析、拆分策略制定、多子代理并发拆分、结果评审验证。"
---

# 代码评审与智能拆分

检测复杂代码，设计拆分方案，并发执行重构，验证拆分结果。

## 工作流程概览

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  1. 复杂度扫描   │ → │  2. 制定拆分方案 │ → │  3. 并发拆分执行 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  6. 结果评审    │ ← │  5. 全面代码评审 │ ← │  4. 结果验证    │
│  （必须）       │    │  （新增）        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 阶段 1: 复杂度扫描

### 1.1 识别复杂代码指标

运行扫描脚本或手动检查：

```bash
# 使用内置扫描脚本
node ~/.config/agents/skills/code-review-and-split/scripts/complexity-scanner.js \
  --path apps/backend/src \
  --threshold 100

# 或手动检查常见复杂文件模式
grep -r "router\.(get|post|put|delete)" apps/backend/src/routes --include="*.js" -l
```

**复杂度判定标准：**

| 指标 | 简单 | 适中 | 需要拆分 |
|-----|------|------|---------|
| 文件行数 | <200 | 200-500 | >500 |
| 函数行数 | <30 | 30-80 | >80 |
| 嵌套深度 | <3 | 3-5 | >5 |
| 路由数量 | <10 | 10-20 | >20 |
| 圈复杂度 | <10 | 10-20 | >20 |

### 1.2 分析目标代码

读取复杂文件，识别拆分点：

```bash
# 统计函数数量和位置
grep -n "^router\|^export\|^function\|^const.*=.*async\|^async function" target-file.js

# 统计代码块
grep -n "^}" target-file.js | wc -l
```

**识别拆分点：**
- 独立的路由处理函数
- 可复用的工具函数
- 数据转换/验证逻辑
- 业务逻辑与数据访问分离

## 阶段 2: 制定拆分方案

### 2.1 设计拆分策略

基于代码结构选择拆分策略：

**策略 A: 按功能模块拆分**
```
routes/pc/ticket.js (500行)
├── routes/pc/ticket/types.js      # 票根类型管理
├── routes/pc/ticket/records.js    # 票根记录管理
├── routes/pc/ticket/verify.js     # 核销相关
└── routes/pc/ticket/utils.js      # 共享工具函数
```

**策略 B: 按分层拆分**
```
routes/pc/merchant.js (800行)
├── controllers/pc/merchant.js     # 控制层
├── services/pc/merchant.js        # 业务逻辑层
├── validators/pc/merchant.js      # 验证层
└── routes/pc/merchant/index.js    # 路由定义
```

**策略 C: 混合拆分**
```
routes/mobile/order.js (600行)
├── routes/mobile/order/index.js   # 路由聚合
├── routes/mobile/order/create.js  # 创建订单
├── routes/mobile/order/pay.js     # 支付相关
└── services/order/pricing.js      # 价格计算（跨端复用）
```

### 2.2 定义子任务

将拆分方案转化为独立的子任务：

| 子任务 | 职责 | 输入 | 输出 |
|-------|------|------|------|
| 子任务 1 | 提取模块 A | 原文件 + 行号范围 | 新文件 A |
| 子任务 2 | 提取模块 B | 原文件 + 行号范围 | 新文件 B |
| 子任务 3 | 创建索引文件 | 新文件列表 | index.js |
| 子任务 4 | 提取共享工具 | 重复代码段 | utils.js |

**关键原则：**
- 每个子任务独立，无执行顺序依赖
- 明确输入输出边界
- 定义接口契约（函数签名、导出方式）

### 2.3 Vue 组件拆分专项指南

**拆分粒度建议：**
| 原文件行数 | 建议拆分数量 | 目标单文件行数 |
|-----------|-------------|--------------|
| 500-700   | 2-3 个组件   | < 250 行      |
| 700-1000  | 4-5 个组件   | < 200 行      |
| > 1000    | 5+ 个组件    | < 200 行      |

**Vue 组件拆分原则：**
1. **按功能区域拆分** - Header/Content/Form/List/Modal 等
2. **按数据域拆分** - 每个子组件管理自己的数据
3. **按交互复杂度拆分** - 复杂交互独立成组件

**模板部分拆分：**
- 提取重复的列表渲染为独立组件
- 将条件渲染复杂的区块拆分为子组件
- 表单区域可按字段组拆分

**Script 部分拆分：**
- 提取可复用的 composables
- 将数据逻辑和 UI 逻辑分离
- 复杂计算属性可提取为工具函数

**样式拆分指南：**
- 每个子组件应包含自己专属的完整样式
- 共享样式（如 .section-header）有两种处理方式：
  1. **重复定义**（推荐）：在每个子组件中独立定义，保持组件独立性
  2. **提取到全局**：创建共享样式文件，通过 `@import` 引入
- 嵌套样式需完整提取，避免样式丢失

**检查清单：**
- [ ] 组件根类名是否完整提取
- [ ] 子元素样式是否全部包含
- [ ] @keyframes 动画是否保留
- [ ] scoped 属性是否正确添加
- [ ] 深度选择器 `:deep()` 是否处理

## 阶段 3: 并发拆分执行

### 3.1 准备子代理任务

为每个拆分模块创建独立任务：

```typescript
// 任务 1: 提取票根类型管理
Task("extract-ticket-types", {
  prompt: `
从 apps/backend/src/routes/pc/ticket.js 中提取票根类型相关代码（行 1-110）：
- 路由: GET/POST/PUT/DELETE /ticket-types
- 函数: isAdmin
- 创建新文件: apps/backend/src/routes/pc/ticket/types.js

要求:
1. 保持原有功能不变
2. 导入必要的依赖（prisma, authenticate）
3. 导出 router
4. 保留原有注释

完成后返回: 新文件路径 + 导出函数列表
`
})

// 任务 2: 提取票根记录管理
Task("extract-ticket-records", {
  prompt: `
从 apps/backend/src/routes/pc/ticket.js 中提取票根记录相关代码（行 220-335）：
- 路由: GET/POST /tickets/review, /tickets/:id/review
- 创建新文件: apps/backend/src/routes/pc/ticket/records.js

要求同上。
`
})

// 任务 3: 提取商户管理
Task("extract-merchants", {
  prompt: `
从 apps/backend/src/routes/pc/ticket.js 中提取商户相关代码（行 340-540）：
... 
`
})
```

### 3.2 并行分派执行

使用 Task 工具并发执行所有子任务：

```typescript
// 同时启动所有子代理
const results = await Promise.all([
  Task("extract-ticket-types", {...}),
  Task("extract-ticket-records", {...}),
  Task("extract-merchants", {...}),
  Task("extract-statistics", {...}),
  Task("create-index-file", {...})
])
```

**并发执行要点：**
- 每个子代理独立工作，互不干扰
- 共享只读上下文（原文件路径、拆分范围）
- 输出写入不同文件（无写入冲突）

### 3.3 子代理任务模板

```markdown
# 代码拆分任务模板

## 任务信息
- 源文件: {source_file}
- 目标文件: {target_file}
- 代码范围: 行 {start_line} - {end_line}
- 功能描述: {description}

## 执行步骤

1. **读取源文件**
   - 使用 ReadFile 读取指定行范围
   - 理解代码逻辑和依赖关系

2. **创建新文件**
   - 添加必要的导入语句
   - 复制代码到新文件
   - 调整相对路径引用

3. **验证功能完整性**
   - 检查所有使用的变量已定义
   - 检查所有导入的模块存在
   - 确保路由处理函数完整

4. **返回结果**
   - 新文件路径
   - 导出内容摘要
   - 依赖的外部模块列表

## 约束
- 不要修改源文件
- 保持原有代码风格
- 保留原有注释和文档

## TypeScript/Vue 规范（如适用）

### Props 处理
- 如果 props 不需要在 `<script>` 中访问，使用 `defineProps<Props>()` 不赋值
- 如果需要访问 props（如传递给子组件或计算属性），使用 `const props = defineProps<Props>()`
- **避免**声明了 props 变量但不使用的情况，这会导致 TS6133 错误

```typescript
// ✅ 推荐：不需要访问 props
interface Props {
  title: string
}
defineProps<Props>()

// ✅ 推荐：需要访问 props
interface Props {
  items: Item[]
}
const props = defineProps<Props>()
const firstItem = computed(() => props.items[0])

// ❌ 避免：声明但不使用
const props = defineProps<Props>()  // TS6133 错误
```

### 类型导出
- 始终导出 Props 类型供父组件使用：`export interface XXXProps { ... }`
- 子组件的类型定义应放在 `<script setup>` 的顶部

```typescript
// 子组件 ChildComponent.vue
export interface ChildProps {
  id: number
  name: string
}

defineProps<ChildProps>()

// 父组件 ParentComponent.vue
import ChildComponent, { type ChildProps } from './ChildComponent.vue'
```

### Vue 模板规范
- 使用 `v-for` 时务必添加 `:key`
- 事件处理函数名使用 `onXxx` 或 `handleXxx` 前缀
- Props 使用 camelCase，模板中使用 kebab-case
```
<!-- 推荐 -->
<ChildComponent :user-info="userInfo" @update="onUpdate" />
```

## 子代理自检清单（创建组件后必须检查）
- [ ] Props 类型已导出 (`export interface`)
- [ ] Emits 事件定义完整，且只定义一次（避免重复 defineEmits）
- [ ] 如使用 `v-model`，确保 `update:xxx` 事件已正确定义和触发
- [ ] 组件内部使用的变量（props/emits）已正确声明
- [ ] 样式中使用了 `scoped` 时，检查是否需要 `:deep()`
- [ ] 原功能（如取消选择、切换状态等）已完整保留
- [ ] 与原代码相比，无功能丢失
```

### 3.4 类型接口处理

当拆分 Vue 组件时，需要处理跨组件的类型共享：

**1. 子组件导出类型**
```typescript
// components/user/UserCard.vue
export interface UserInfo {
  id: number
  name: string
  avatar: string
}

interface Props {
  user: UserInfo
}

defineProps<Props>()
```

**2. 父组件导入类型**
```typescript
// pages/user/list.vue
import UserCard, { type UserInfo } from '@/components/user/UserCard.vue'

const users = ref<UserInfo[]>([])
```

**3. 类型循环依赖处理**
如果多个组件需要共享同一类型，建议：
- 创建独立的 `types.ts` 文件
- 或提取到共享目录的 `shared/types/`

```
components/user/
├── UserCard.vue
├── UserList.vue
└── types.ts          # 共享类型定义
```

### 3.5 同步检查点（可选）

当主文件重构依赖子组件创建完成时，添加同步检查点：

**检查文件创建状态：**
```bash
# 检查所有子组件是否已创建
ls -la src/components/teacher/*.vue

# 或统计文件数量
ls src/components/teacher/*.vue | wc -l
```

**主文件重构前置条件：**
1. 所有子组件文件已存在
2. 子组件无语法错误
3. 类型定义已正确导出

**处理时机问题：**
如果子代理报告"文件不存在"但实际已创建：
- 可能是文件系统同步延迟
- 使用 Shell 工具重新确认文件状态
- 或添加短暂延迟后重试

## 阶段 4: 结果验证

### 4.1 检查子代理输出

验证每个子任务的完成质量：

```bash
# 检查文件是否创建
ls -la apps/backend/src/routes/pc/ticket/*.js

# 检查语法错误
node --check apps/backend/src/routes/pc/ticket/types.js

# 检查导入导出
grep -n "^import\|^export\|^router" apps/backend/src/routes/pc/ticket/types.js
```

### 4.2 验证功能完整性

```bash
# 1. 检查原文件中的函数是否都存在于新文件中
grep -o "router\.(get|post|put|delete).*'" original.js | sort
grep -o "router\.(get|post|put|delete).*'" new-files/*.js | sort

# 2. 检查依赖关系
npm run build 2>&1 | head -50
```

### 4.3 Vue 组件专用验证

**TypeScript 类型检查：**
```bash
# Vue 项目类型检查
npx vue-tsc --noEmit --skipLibCheck

# 检查特定文件
echo "src/components/teacher/*.vue" | xargs npx vue-tsc --noEmit
```

**代码质量检查清单：**
- [ ] 模板语法正确（v-for 有 :key，v-if/v-show 正确使用）
- [ ] Props 类型定义完整且导出
- [ ] Emits 事件声明完整
- [ ] 无未使用变量/导入警告
- [ ] 组件名符合 PascalCase 规范
- [ ] 导入路径使用 @/ 别名（项目配置允许时）
- [ ] 样式 scoped 属性正确添加
- [ ] 深度选择器 `:deep()` 使用正确

**功能验证：**
- [ ] 组件渲染正常，无控制台错误
- [ ] Props 传递正确
- [ ] 事件触发正常
- [ ] 样式显示正确

### 4.4 功能完整性核对（新增）

对比原文件和新组件，确保以下功能未丢失：

| 检查项 | 核对方法 |
|-------|---------|
| 交互功能 | 原代码中的点击/切换/选择逻辑是否完整迁移 |
| 状态管理 | 双向绑定（v-model）是否正常工作 |
| 条件渲染 | v-if/v-show 条件是否保持一致 |
| 事件处理 | 所有事件处理器是否正确定义和触发 |

**常见功能丢失场景：**
- 点击已选项取消选择的功能（如选中座位后再次点击取消）
- 表单验证逻辑
- 快捷键/特殊事件处理
- 边界条件处理（如空状态、错误状态）

**核对步骤：**
1. 逐行对比原文件的交互逻辑
2. 检查所有 `emit` 调用是否完整
3. 验证条件分支（if/else）是否全部迁移
4. 测试边界条件（空值、极限值）

## 阶段 5: 结果评审（增强）

### 5.1 代码质量检查

检查拆分后的代码是否满足：

- [ ] 每个新文件 < 300 行
- [ ] 函数职责单一
- [ ] 无重复代码
- [ ] 导入导出清晰
- [ ] 命名规范一致

### 5.2 创建索引文件

确保正确聚合所有子模块：

```javascript
// routes/pc/ticket/index.js
import express from 'express'
import typesRouter from './types.js'
import recordsRouter from './records.js'
import merchantsRouter from './merchants.js'

const router = express.Router()

router.use('/ticket-types', typesRouter)
router.use('/tickets', recordsRouter)
router.use('/merchants', merchantsRouter)

export default router
```

### 5.3 集成测试

运行测试确保拆分后功能正常：

```bash
# 使用技能脚本测试关键接口
~/.config/agents/skills/api-testing-with-auth/scripts/test-api.sh \
  --endpoint pc \
  --url /ticket/ticket-types
```

### 5.4 跨文件问题处理（新增）

在评审过程中，如果发现拆分范围外的文件存在问题：

#### 处理方式
1. **立即评估**：判断是否阻塞当前拆分功能
   - 是 → 优先修复
   - 否 → 记录并评估修复成本

2. **即时修复**：对于简单问题（如未导入、变量未定义），立即修复
   - 修复前确认文件关联性
   - 修复后进行针对性验证

3. **记录沟通**：在评审报告中记录：
   - 发现的问题
   - 修复状态
   - 是否需要进一步处理

#### 修复原则
- **简单问题立即修复**：如缺少导入、变量未定义、明显类型错误
- **复杂问题记录跟进**：如需重构逻辑、新增功能，单独评估
- **关联问题优先处理**：如影响拆分组件正常运行的依赖问题

#### 不修复的情况
- 问题与当前拆分功能完全无关
- 修复会引入较大风险
- 需要独立的需求评估

## 快速开始示例

### 扫描并拆分单个复杂文件

```bash
# 1. 扫描复杂度
node scripts/complexity-scanner.js --path apps/backend/src/routes/pc/ticket.js

# 2. 查看扫描结果，决定是否拆分
# 输出: 行数 520, 函数 15, 建议拆分

# 3. 运行拆分流程
# (使用此技能的完整工作流程)
```

### 批量扫描项目

```bash
# 扫描整个后端代码
node scripts/complexity-scanner.js \
  --path apps/backend/src \
  --threshold 300 \
  --format json > complexity-report.json

# 分析结果，找出需要拆分的文件
cat complexity-report.json | jq '.[] | select(.lines > 400)'
```

### Vue 组件拆分示例

**拆分前：**
```
pages/teacher/detail.vue (920行)
```

**拆分后：**
```
pages/teacher/detail.vue (231行)
components/teacher/
├── TeacherInfoCard.vue   (214行)
├── ScheduleSection.vue   (241行)
├── MomentsSection.vue    (143行)
├── GiftsSection.vue      (145行)
└── ReviewsSection.vue    (163行)
```

**主文件简化：**
```vue
<template>
  <div class="teacher-detail-page">
    <TeacherInfoCard :teacher="teacher" />
    <ScheduleSection :schedules="schedules" @action="onScheduleAction" />
    <MomentsSection :moments="moments" @play="playVideo" />
    <GiftsSection :gifts="gifts" :points="userPoints" @send="sendGift" />
    <ReviewsSection :reviews="reviews" :rating="teacher.rating" :reviewCount="teacher.reviewCount" />
  </div>
</template>
```

## 常见拆分模式

### 路由文件拆分

**前:** `routes/pc/admin.js` (600行)

**后:**
```
routes/pc/admin/
├── index.js          # 路由聚合
├── users.js          # 用户管理
├── roles.js          # 角色权限
├── settings.js       # 系统设置
└── logs.js           # 操作日志
```

### 服务层拆分

**前:** `services/order.js` (800行)

**后:**
```
services/order/
├── index.js          # 统一导出
├── create.js         # 创建订单
├── payment.js        # 支付处理
├── fulfillment.js    # 订单履约
└── refund.js         # 退款处理
```

### Vue 页面组件拆分

**前:** `pages/teacher/detail.vue` (920行)

**后:**
```
pages/teacher/detail.vue          # 页面容器（231行）
components/teacher/
├── TeacherInfoCard.vue           # 老师信息卡片
├── ScheduleSection.vue           # 课程时间表
├── MomentsSection.vue            # 学员风采
├── GiftsSection.vue              # 送礼物
└── ReviewsSection.vue            # 家长评价
```

## 注意事项

### 何时使用并发拆分

**适合并发:**
- 模块间无依赖关系
- 每个模块独立成文件
- 拆分点清晰明确

**不适合并发:**
- 模块间有复杂的相互调用
- 需要共享状态或上下文
- 拆分策略尚未确定

### 子代理数量控制

- 建议同时运行 3-5 个子代理
- 过多的并发可能导致上下文切换开销
- 根据任务复杂度调整

### 错误处理

如果子代理失败：
1. 读取错误输出
2. 决定是否重试
3. 或调整拆分策略后重新执行

## 参考资源

### 技能文档
- `references/splitting-patterns.md` - 常见拆分模式详解
- `references/complexity-metrics.md` - 代码复杂度评估标准
- `references/vue-splitting-patterns.md` - Vue 组件拆分模式
- `references/typescript-exports.md` - TypeScript 类型导出最佳实践

### 任务模板
- `templates/task-template.md` - 通用子代理任务模板
- `templates/vue-component-task.md` - Vue 组件拆分任务模板

## 附录: 常见问题

### Q1: 子代理创建的组件有 TypeScript 错误？

**症状：**
```
TS6133: 'props' is declared but its value is never read
TS2322: Type 'string' is not assignable to type '"full" | "available" | "urgent"'
```

**检查清单：**
1. [ ] 是否使用了未赋值的 props 变量（应使用 `defineProps<Props>()`）
2. [ ] 类型定义是否正确导出（需要 `export interface`）
3. [ ] 父组件是否正确导入子组件类型
4. [ ] 字面量类型是否需要显式声明（使用 `as const` 或显式类型注解）

**修复示例：**
```typescript
// 修复 TS6133
// 错误
const props = defineProps<Props>()  // 未使用 props

// 正确
defineProps<Props>()  // 不需要访问 props

// 或
const props = defineProps<Props>()
console.log(props.title)  // 使用了 props
```

```typescript
// 修复 TS2322
// 错误
const items = ref([
  { status: 'available' }  // 推断为 string
])

// 正确
const items = ref<StatusItem[]>([
  { status: 'available' }
])

// 或
const items = ref([
  { status: 'available' as const }
])
```

### Q2: 样式在拆分后不生效？

**症状：** 子组件样式丢失或与预期不符

**检查清单：**
1. [ ] `scoped` 属性是否正确添加
2. [ ] 父组件的全局样式是否覆盖子组件
3. [ ] 嵌套选择器是否完整提取
4. [ ] CSS 变量/SCSS 变量是否正确导入

**修复建议：**
```vue
<!-- 确保添加 scoped -->
<style scoped lang="scss">
/* 检查嵌套结构是否完整 */
.component-root {
  .child-element {
    /* 样式内容 */
  }
}
</style>
```

### Q3: 如何确定拆分粒度？

**建议原则：**
1. **单一职责** - 一个组件只做一件事
2. **行数控制** - 文件行数控制在 200-300 行以内
3. **比例均衡** - 模板、Script、Style 比例均衡，避免某一部分过大
4. **复用性** - 考虑组件在其他地方复用的可能性

**决策流程：**
```
识别功能模块 → 评估独立程度 → 检查依赖关系 → 确定拆分边界
```

### Q4: 子代理报告"文件不存在"但已创建？

**原因：** 文件系统同步延迟或并发读取时机问题

**解决方案：**
```bash
# 方案 1: 使用 Shell 工具重新确认
ls -la src/components/xxx/

# 方案 2: 在 Task 中显式读取验证
ReadFile({ path: "/path/to/created/file" })
```

### Q5: 事件处理函数类型不匹配？

**症状：**
```
TS2322: Type '(seat: Seat) => void' is not assignable to type '(seat: Seat | null) => any'
```

**原因：** 子组件 emit 定义与父组件处理函数参数类型不一致

**修复方案：**
```typescript
// 子组件
const emit = defineEmits<{
  seatSelect: [seat: Seat | null]  // 支持取消选择时传 null
}>()

// 父组件
const onSeatSelect = (seat: Seat | null) => {  // 参数类型必须匹配
  selectedSeat.value = seat
}
```

### Q6: 点击已选项无法取消选择？

**症状：** 再次点击已选中的项目，无法取消选择

**原因：** 拆分时刻意简化了交互逻辑，只处理选中未处理取消

**修复方案：**
```typescript
const onItemClick = (item: Item) => {
  // 如果点击已选中的项，则取消选择
  if (selectedItem.value?.id === item.id) {
    emit('select', null)
  } else {
    emit('select', item)
  }
}
```

### Q7: v-model 不工作？

**症状：** 子组件使用 v-model，但父组件数据不更新

**检查清单：**
1. [ ] 子组件是否正确触发 `update:modelValue` 或 `update:xxx` 事件
2. [ ] 事件名是否与 v-model 绑定的属性名匹配
3. [ ] 父组件是否使用正确的 v-model 语法

**正确示例：**
```vue
<!-- 父组件 -->
<ChildComponent v-model:selected="selectedValue" />

<!-- 子组件 -->
<script setup>
const props = defineProps<{ selected: string }>()
const emit = defineEmits<{ 'update:selected': [value: string] }>()

const onChange = (val: string) => {
  emit('update:selected', val)
}
</script>
```

### Q8: 评审时发现其他文件也有问题？

**处理原则：**
1. **立即评估影响**：是否阻塞当前功能
2. **简单问题立即修复**：如缺少导入、变量未定义
3. **复杂问题记录跟进**：不影响当前拆分的可后续处理
4. **所有问题记录在案**：在评审报告中体现

**决策矩阵：**
| 问题类型 | 影响程度 | 处理方式 |
|---------|---------|---------|
| 缺少导入 | 高（阻塞） | 立即修复 |
| 变量未定义 | 高（阻塞） | 立即修复 |
| 类型错误 | 中 | 评估后修复 |
| 代码风格 | 低 | 记录，后续优化 |
| 功能缺陷 | 视情况 | 评估是否需要独立需求 |
