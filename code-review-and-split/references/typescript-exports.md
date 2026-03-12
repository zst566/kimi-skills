# TypeScript 类型导出最佳实践

代码拆分过程中类型定义的处理方法和常见问题解决方案。

## 目录

1. [基础类型导出](#基础类型导出)
2. [跨组件类型共享](#跨组件类型共享)
3. [Vue 组件 Props 类型](#vue-组件-props-类型)
4. [常见问题及解决](#常见问题及解决)

---

## 基础类型导出

### 命名导出

```typescript
// types.ts
export interface User {
  id: number
  name: string
  email: string
}

export type UserRole = 'admin' | 'user' | 'guest'

export enum Status {
  Active = 'active',
  Inactive = 'inactive',
}
```

### 默认导出

```typescript
// config.ts
interface Config {
  apiUrl: string
  timeout: number
}

const defaultConfig: Config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
}

export default defaultConfig
export type { Config }
```

---

## 跨组件类型共享

### 方案 A: 组件导出类型（推荐用于父子组件）

子组件导出类型，父组件导入使用。

**子组件：**
```vue
<!-- ChildComponent.vue -->
<script setup lang="ts">
// 导出接口供父组件使用
export interface ChildProps {
  id: number
  title: string
  completed?: boolean
}

interface Props extends ChildProps {}

defineProps<Props>()
</script>
```

**父组件：**
```vue
<!-- ParentComponent.vue -->
<script setup lang="ts">
// 导入子组件和类型
import ChildComponent, { type ChildProps } from './ChildComponent.vue'

// 使用导入的类型
const items = ref<ChildProps[]>([
  { id: 1, title: 'Item 1', completed: false },
  { id: 2, title: 'Item 2', completed: true },
])
</script>

<template>
  <ChildComponent 
    v-for="item in items" 
    :key="item.id"
    v-bind="item" 
  />
</template>
```

---

### 方案 B: 独立类型文件（推荐用于多组件共享）

**目录结构：**
```
components/
├── todo/
│   ├── types.ts          # 共享类型
│   ├── TodoItem.vue
│   ├── TodoList.vue
│   └── TodoForm.vue
```

**types.ts：**
```typescript
export interface Todo {
  id: number
  title: string
  completed: boolean
  createdAt: string
}

export interface TodoFilter {
  status: 'all' | 'active' | 'completed'
  search: string
}

export type TodoEvent = 
  | { type: 'create'; todo: Omit<Todo, 'id'> }
  | { type: 'update'; id: number; changes: Partial<Todo> }
  | { type: 'delete'; id: number }
```

**组件使用：**
```vue
<script setup lang="ts">
import type { Todo, TodoFilter } from './types'

interface Props {
  todos: Todo[]
  filter: TodoFilter
}

defineProps<Props>()
</script>
```

---

### 方案 C: 命名空间（适用于大型项目）

```typescript
// types/models.d.ts
declare namespace Models {
  interface User {
    id: number
    name: string
    email: string
  }

  interface Order {
    id: number
    userId: number
    items: OrderItem[]
    total: number
  }
}

// 使用时无需导入，全局可用
const user: Models.User = { id: 1, name: 'John', email: '' }
```

---

## Vue 组件 Props 类型

### 基础 Props 定义

```typescript
interface Props {
  // 必填
  title: string
  
  // 可选
  description?: string
  
  // 带默认值（通过 withDefaults）
  count?: number
  
  // 复杂对象
  config: {
    enabled: boolean
    timeout: number
  }
  
  // 联合类型
  size: 'small' | 'medium' | 'large'
  
  // 数组
  items: string[]
  
  // 回调函数
  onSubmit: (data: FormData) => void
}

defineProps<Props>()
```

### withDefaults 设置默认值

```typescript
interface Props {
  title: string
  count?: number
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  size: 'medium',
  disabled: false,
})
```

### Props 解构（Vue 3.3+）

```typescript
interface Props {
  title: string
  count?: number
}

// 直接解构，自动设置默认值
const { title, count = 0 } = defineProps<Props>()
```

---

## 常见问题及解决

### 问题 1: TS6133 - 'props' is declared but its value is never read

**症状：**
```typescript
const props = defineProps<Props>()  // ❌ TS6133 错误
```

**原因：** 声明了 props 变量但没有在代码中使用。

**解决方案：**

**方案 A:** 不需要访问 props 时不赋值
```typescript
// ✅ 推荐：不需要访问 props
defineProps<Props>()
```

**方案 B:** 需要访问 props 时确保使用
```typescript
// ✅ 推荐：使用 props
const props = defineProps<Props>()
const displayTitle = computed(() => props.title.toUpperCase())
```

**方案 C:** 解构 props（Vue 3.3+）
```typescript
// ✅ 推荐：解构使用
const { title, count = 0 } = defineProps<Props>()
```

---

### 问题 2: TS2322 - 类型不兼容

**症状：**
```typescript
Type 'string' is not assignable to type '"full" | "available" | "urgent"'
```

**原因：** 字面量类型被推断为 string。

**解决方案：**

**方案 A:** 显式类型注解
```typescript
const status = ref<'full' | 'available' | 'urgent'>('full')
```

**方案 B:** 使用类型别名
```typescript
type Status = 'full' | 'available' | 'urgent'
const status = ref<Status>('full')
```

**方案 C:** 使用 as const（局部）
```typescript
const item = {
  status: 'full' as const
}
```

**方案 D:** 数组使用显式类型
```typescript
interface ScheduleItem {
  status: 'full' | 'available' | 'urgent'
}

const items = ref<ScheduleItem[]>([
  { status: 'full' }  // ✅ 正确推断
])
```

---

### 问题 3: 类型循环依赖

**症状：**
```typescript
// ComponentA.ts
import type { BProps } from './ComponentB'

// ComponentB.ts
import type { AProps } from './ComponentA'  // ❌ 循环依赖
```

**解决方案：**

**方案 A:** 提取共享类型
```typescript
// types/shared.ts
export interface SharedProps {
  id: number
  name: string
}

// ComponentA.ts
import type { SharedProps } from './types/shared'

// ComponentB.ts
import type { SharedProps } from './types/shared'
```

**方案 B:** 使用接口继承
```typescript
// types/base.ts
export interface BaseProps {
  id: number
}

// ComponentA.ts
import type { BaseProps } from './types/base'
export interface AProps extends BaseProps {
  // A 特有属性
}
```

---

### 问题 4: 导入类型时提示 Cannot find module

**症状：**
```typescript
import type { UserInfo } from './UserCard'  // ❌ Cannot find module
```

**原因：** Vue 单文件组件的类型导出需要正确配置。

**解决方案：**

**方案 A:** 确保使用 `type` 关键字
```typescript
import { type UserInfo } from './UserCard.vue'
```

**方案 B:** 使用 `*` 导入
```typescript
import * as UserCardTypes from './UserCard.vue'
type UserInfo = UserCardTypes.UserInfo
```

**方案 C:** 提取到独立类型文件
```typescript
// types/user.ts
export interface UserInfo { ... }

// UserCard.vue
import type { UserInfo } from '@/types/user'
export type { UserInfo }
```

---

## 最佳实践总结

1. **优先使用显式类型** - 避免依赖类型推断
   ```typescript
   const items = ref<Item[]>([])  // ✅ 显式
   const items = ref([])          // ❌ 推断为 never[]
   ```

2. **组件导出必要类型** - 方便父组件使用
   ```typescript
   export interface Props { ... }
   export type Events = ...
   ```

3. **避免类型循环依赖** - 提取共享类型到独立文件

4. **使用 TypeScript 严格模式** - 在 `tsconfig.json` 中启用
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true
     }
   }
   ```

5. **合理使用命名空间** - 大型项目使用 namespace 组织类型
