# Vue 组件拆分任务模板

用于指导子代理拆分 Vue 单文件组件的标准化任务模板。

---

## 模板结构

```markdown
## 代码拆分任务（Vue 组件）

**源文件**: `{source_file_path}`
**目标文件**: `{target_file_path}`
**功能描述**: {功能描述}

### 提取范围

**模板部分（HTML）:**
- 源文件行号: {start_line} - {end_line}
- 根元素类名: `{root_class_name}`
- 关键子元素: {子元素列表}

**Script 部分（TypeScript）:**
- 数据定义: {ref/reactive 名称列表}
- 函数定义: {函数名称列表}
- 类型定义: {类型名称列表}

**样式部分（SCSS/CSS）:**
- 源文件行号: {start_line} - {end_line}
- 根类选择器: `.{root_class_name}`
- 动画/关键帧: {动画名称列表}

### 组件接口设计

**Props 定义:**
```typescript
export interface {ComponentName}Props {
  // 必填属性
  {prop1}: {type1}
  
  // 可选属性
  {prop2}?: {type2}
}
```

**Emits 定义:**
```typescript
// 事件名称及参数
'{event1}': [{param1}: {type1}]
'{event2}'?: []  // 无参数事件
```

### 执行步骤

1. **读取源文件**
   - 使用 ReadFile 读取指定的模板、Script、样式范围
   - 识别所有使用的外部依赖（组件、工具函数等）

2. **创建组件文件**
   - 文件路径: `{target_file_path}`
   - 添加 `<template>` 部分
   - 添加 `<script setup lang="ts">` 部分
   - 添加 `<style scoped lang="scss">` 部分

3. **处理 Props**
   - 将原组件的内部数据改为 Props 接收
   - 导出 Props 类型接口
   - 使用 `defineProps<Props>()`（不赋值，除非需要访问 props）

4. **处理 Events**
   - 将原组件的函数调用改为 emit 触发
   - 使用 `defineEmits<Emits>()` 定义事件

5. **处理样式**
   - 提取所有相关样式到组件的 style 块
   - 确保添加 `scoped` 属性
   - 检查并保留 `@keyframes` 动画

6. **验证完整性**
   - [ ] 模板语法正确
   - [ ] 无 TypeScript 错误
   - [ ] Props 类型导出
   - [ ] 样式完整

### 输出要求

完成后返回：
1. 新文件路径
2. 组件 Props 接口定义
3. 组件 Emits 定义
4. 使用示例
```

---

## 使用示例

### 示例：提取课程时间表组件

```markdown
## 代码拆分任务（Vue 组件）

**源文件**: `/project/apps/h5-client/src/pages/teacher/detail.vue`
**目标文件**: `/project/apps/h5-client/src/components/teacher/ScheduleSection.vue`
**功能描述**: 课程时间表组件，展示可预约的课程时段列表，包含日期、时间、状态和行动按钮

### 提取范围

**模板部分（HTML）:**
- 源文件行号: 62 - 100
- 根元素类名: `schedule-section`
- 关键子元素: `.section-header`, `.schedule-list`, `.schedule-item`

**Script 部分（TypeScript）:**
- 数据定义: `schedules` ref
- 函数定义: `viewAllSchedule`, `onScheduleAction`
- 类型定义: 需要定义 ScheduleItem 接口

**样式部分（SCSS/CSS）:**
- 源文件行号: 573 - 693
- 根类选择器: `.schedule-section`
- 动画/关键帧: `pulse` 动画

### 组件接口设计

**Props 定义:**
```typescript
export interface ScheduleItem {
  date: string
  week: string
  time: string
  status: 'available' | 'urgent' | 'full'
  statusText: string
}

interface Props {
  schedules: ScheduleItem[]
}
```

**Emits 定义:**
```typescript
{
  'viewAll': []
  'action': [item: ScheduleItem]
}
```

### 执行步骤

1. 读取源文件 62-100 行（模板）、217-239 行（schedules 数据）、573-693 行（样式）

2. 创建 `ScheduleSection.vue` 文件

3. 编写模板：
   - 保留原 schedule-section 结构
   - v-for 循环 schedules
   - 绑定 click 事件到 emit

4. 编写 Script：
   - 导出 ScheduleItem 接口
   - 定义 Props 接口
   - 使用 defineProps<Props>()（不赋值）
   - 使用 defineEmits 定义 viewAll 和 action 事件

5. 编写样式：
   - 提取 .schedule-section 及其所有子样式
   - 提取 .section-header 相关样式
   - 保留 @keyframes pulse 动画
   - 添加 scoped 属性

6. 验证：
   - 检查 v-for 是否有 :key
   - 检查 emit 调用是否正确
   - 确认 ScheduleItem 接口已导出
```

---

## 子代理输出格式

子代理完成任务后应按以下格式返回：

```markdown
## ✅ 代码拆分完成

### 📁 新文件路径
`/project/apps/h5-client/src/components/teacher/ScheduleSection.vue`

### 🔌 组件接口

**Props:**
```typescript
export interface ScheduleItem {
  date: string
  week: string
  time: string
  status: 'available' | 'urgent' | 'full'
  statusText: string
}

interface Props {
  schedules: ScheduleItem[]
}
```

**Emits:**
```typescript
{
  (e: 'viewAll'): void
  (e: 'action', item: ScheduleItem): void
}
```

### 📝 提取内容总结

| 部分 | 源文件位置 | 说明 |
|------|-----------|------|
| 模板 | 行 62-100 | schedule-section 完整结构 |
| Script | 行 217-239 | schedules 数据模型 → ScheduleItem 接口 |
| 样式 | 行 573-693 | .schedule-section 及其子样式 |
| 动画 | 行 911-918 | @keyframes pulse |

### 💡 使用示例

```vue
<template>
  <ScheduleSection 
    :schedules="schedules" 
    @viewAll="handleViewAll"
    @action="handleScheduleAction"
  />
</template>

<script setup>
import ScheduleSection, { type ScheduleItem } from '@/components/teacher/ScheduleSection.vue'

const schedules = ref<ScheduleItem[]>([...])
const handleViewAll = () => router.push('/schedule')
const handleScheduleAction = (item: ScheduleItem) => { ... }
</script>
```
```

---

## 常见错误预防

### TypeScript 相关

| 错误 | 预防方法 |
|------|---------|
| TS6133: 'props' is declared but never read | 使用 `defineProps<Props>()` 不赋值 |
| TS2322: Type 'string' not assignable | 使用 `ref<Type[]>([])` 显式类型 |
| TS2307: Cannot find module | 确保文件路径正确，使用 `.vue` 后缀 |

### Vue 相关

| 错误 | 预防方法 |
|------|---------|
| v-for 缺少 :key | 检查每个 v-for 都有唯一的 key |
| emit 未定义 | 确保使用 defineEmits 声明事件 |
| 样式不生效 | 检查 scoped 属性是否正确添加 |

---

## 检查清单

子代理完成任务前应自检：

- [ ] 文件已创建在正确路径
- [ ] 模板语法正确，无 HTML 错误
- [ ] Script 部分无 TypeScript 错误
- [ ] Props 类型已导出
- [ ] Emits 事件已定义
- [ ] 样式已添加 scoped 属性
- [ ] 关键帧动画已保留
- [ ] 导入路径使用正确的别名（如 @/）
