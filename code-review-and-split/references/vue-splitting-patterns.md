# Vue 组件拆分模式

Vue 单文件组件（SFC）的拆分策略和最佳实践。

## 目录

1. [拆分时机判断](#拆分时机判断)
2. [按功能区域拆分](#按功能区域拆分)
3. [按数据域拆分](#按数据域拆分)
4. [样式处理策略](#样式处理策略)
5. [父子组件通信](#父子组件通信)
6. [类型定义共享](#类型定义共享)

---

## 拆分时机判断

### 行数指标

| 文件行数 | 建议行动 | 说明 |
|---------|---------|------|
| < 200 | 无需拆分 | 组件规模适中 |
| 200-400 | 考虑拆分 | 如果功能区域明显可分离 |
| 400-600 | 建议拆分 | 拆分为 2-3 个子组件 |
| 600-1000 | 强烈建议拆分 | 拆分为 4-5 个子组件 |
| > 1000 | 必须拆分 | 拆分为 5+ 个子组件 |

### 代码异味

出现以下情况时考虑拆分：
- [ ] 模板中超过 3 个独立的 `v-if/v-show` 区块
- [ ] Script 中有超过 5 个独立的 ref/reactive 数据域
- [ ] 样式超过 300 行且有明显的区域划分
- [ ] 多个功能模块共享同一生命周期钩子
- [ ] 代码中存在大量重复的模板结构

---

## 按功能区域拆分

### 模式：页面区块拆分

**适用场景：** 页面由多个独立区块组成

**拆分前：**
```vue
<!-- pages/profile/index.vue (600行) -->
<template>
  <div class="profile-page">
    <!-- 用户信息卡片区 -->
    <div class="user-card">...</div>
    
    <!-- 统计数据区 -->
    <div class="stats-section">...</div>
    
    <!-- 最近活动区 -->
    <div class="activity-section">...</div>
    
    <!-- 设置选项区 -->
    <div class="settings-section">...</div>
  </div>
</template>
```

**拆分后：**
```
pages/profile/index.vue (150行)
components/profile/
├── UserCard.vue          # 用户信息卡片
├── StatsSection.vue      # 统计数据
├── ActivitySection.vue   # 最近活动
└── SettingsSection.vue   # 设置选项
```

**主页面：**
```vue
<template>
  <div class="profile-page">
    <UserCard :user="user" @edit="onEditUser" />
    <StatsSection :stats="stats" />
    <ActivitySection :activities="activities" />
    <SettingsSection :settings="settings" @change="onSettingChange" />
  </div>
</template>
```

---

### 模式：列表-详情拆分

**适用场景：** 列表和详情视图混合在同一个组件

**拆分前：**
```vue
<!-- 商品管理页面，同时包含列表和详情编辑 -->
<template>
  <div>
    <!-- 商品列表 -->
    <table>...</table>
    
    <!-- 内联编辑表单 -->
    <form v-if="editing">...</form>
  </div>
</template>
```

**拆分后：**
```
components/product/
├── ProductList.vue       # 商品列表
├── ProductForm.vue       # 商品表单（新增/编辑共用）
└── ProductDetail.vue     # 商品详情展示
```

---

## 按数据域拆分

### 模式：数据独立管理

**原则：** 每个子组件管理自己的数据获取和状态

**拆分前：**
```vue
<script setup>
// 所有数据在父组件管理
const user = ref({})
const orders = ref([])
const favorites = ref([])
const settings = ref({})

// 多个数据获取逻辑混杂
onMounted(async () => {
  user.value = await fetchUser()
  orders.value = await fetchOrders()
  favorites.value = await fetchFavorites()
  settings.value = await fetchSettings()
})
</script>
```

**拆分后：**
```vue
<!-- 父组件只负责组装 -->
<template>
  <div class="profile-page">
    <UserCard :userId="userId" />
    <OrderList :userId="userId" />
    <FavoriteList :userId="userId" />
    <SettingsPanel :userId="userId" />
  </div>
</template>

<script setup>
defineProps<{ userId: string }>()
// 父组件无数据逻辑，纯容器
</script>
```

```vue
<!-- UserCard.vue - 独立管理用户数据 -->
<script setup>
const props = defineProps<{ userId: string }>()
const user = ref({})

onMounted(async () => {
  user.value = await fetchUser(props.userId)
})
</script>
```

---

## 样式处理策略

### 策略 A: 完全独立（推荐）

每个子组件包含完整的样式定义，即使存在重复。

**优点：**
- 组件完全独立，无外部依赖
- 可随意移动或复用组件
- 样式修改不影响其他组件

**缺点：**
- 存在少量样式重复
- 需要维护多处相同的样式

```vue
<!-- ComponentA.vue -->
<style scoped lang="scss">
.section-header {
  display: flex;
  justify-content: space-between;
  padding: 16px;
  // ...完整样式
}
</style>

<!-- ComponentB.vue -->
<style scoped lang="scss">
.section-header {
  display: flex;
  justify-content: space-between;
  padding: 16px;
  // ...完整样式（重复）
}
</style>
```

---

### 策略 B: 共享样式文件

将共享样式提取到独立文件。

**目录结构：**
```
components/
├── shared/
│   └── styles/
│       └── mixins.scss     # SCSS mixins
│       └── common.scss     # 共享样式
```

**使用方式：**
```vue
<style scoped lang="scss">
@use '@/components/shared/styles/mixins' as *;

.section-header {
  @include section-header-base;
  // 组件特定样式
}
</style>
```

**适用场景：**
- 大型项目，样式规范统一
- 团队有严格的样式规范
- 使用 CSS 预处理器

---

### 样式拆分检查清单

- [ ] 根类名是否完整提取
- [ ] 子元素嵌套样式是否保留
- [ ] `@keyframes` 动画是否保留
- [ ] 深度选择器 `:deep()` 是否正确处理
- [ ] CSS 变量引用是否正确
- [ ] `scoped` 属性是否添加

---

## 父子组件通信

### Props 传递规范

**父组件 → 子组件：**
```vue
<!-- 父组件 -->
<template>
  <ChildComponent 
    :user-info="user"
    :is-loading="loading"
    :config="{ showAvatar: true, editable: false }"
  />
</template>
```

```typescript
// 子组件
interface Props {
  userInfo: UserInfo
  isLoading?: boolean      // 可选
  config?: Partial<Config> // 可选，使用 Partial
}

defineProps<Props>()
```

### Events 定义规范

**子组件 → 父组件：**
```typescript
// 子组件
const emit = defineEmits<{
  // 简单事件
  'update': [value: string]
  
  // 带多个参数
  'submit': [data: FormData, callback: () => void]
  
  // 可选参数
  'change': [value?: string]
}>()
```

---

## 类型定义共享

### 模式 A: 组件导出类型（推荐用于简单场景）

```typescript
// UserCard.vue
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

```typescript
// 父组件
import UserCard, { type UserInfo } from './UserCard.vue'

const user = ref<UserInfo>({ id: 1, name: '', avatar: '' })
```

---

### 模式 B: 独立类型文件（推荐用于复杂场景）

**目录结构：**
```
components/user/
├── UserCard.vue
├── UserList.vue
├── UserForm.vue
└── types.ts          # 共享类型
```

**types.ts：**
```typescript
export interface UserInfo {
  id: number
  name: string
  avatar: string
  email?: string
}

export interface UserStats {
  totalOrders: number
  totalSpent: number
  joinDate: string
}
```

**组件使用：**
```vue
<script setup lang="ts">
import type { UserInfo, UserStats } from './types'

interface Props {
  user: UserInfo
  stats?: UserStats
}

defineProps<Props>()
</script>
```

---

### 模式 C: 全局类型声明

**适用场景：** 类型在整个应用中使用

**types/user.d.ts：**
```typescript
declare namespace App {
  interface User {
    id: number
    name: string
    avatar: string
  }
}
```

---

## 实战案例

### 案例：教师详情页拆分

**原始文件：** `pages/teacher/detail.vue` (920行)

**功能区域识别：**
1. 教师基本信息卡片（头像、姓名、认证、简介）
2. 课程时间表（可预约时段列表）
3. 学员风采（视频展示）
4. 送礼物功能（积分、礼物网格）
5. 家长评价列表

**拆分方案：**
```
pages/teacher/detail.vue          # 231行 - 页面容器
components/teacher/
├── TeacherInfoCard.vue           # 214行
├── ScheduleSection.vue           # 241行
├── MomentsSection.vue            # 143行
├── GiftsSection.vue              # 145行
└── ReviewsSection.vue            # 163行
```

**主页面代码：**
```vue
<template>
  <div class="teacher-detail-page">
    <div class="page-header">...</div>
    
    <div class="page-content">
      <TeacherInfoCard :teacher="teacher" />
      <ScheduleSection 
        :schedules="schedules" 
        @viewAll="viewAllSchedule"
        @action="onScheduleAction" 
      />
      <MomentsSection :moments="moments" @play="playVideo" />
      <GiftsSection :gifts="gifts" :points="userPoints" @send="sendGift" />
      <ReviewsSection 
        :reviews="reviews" 
        :rating="teacher.rating" 
        :reviewCount="teacher.reviewCount" 
      />
    </div>
    
    <app-tabbar />
  </div>
</template>
```

**拆分收益：**
- 主文件从 920 行减少到 231 行
- 各子组件可独立测试
- 课程表组件可在其他页面复用
- 团队协作时减少代码冲突

---

## 总结

Vue 组件拆分的核心原则：

1. **单一职责** - 一个组件只负责一个功能区域
2. **高内聚低耦合** - 子组件内部逻辑完整，对外接口清晰
3. **可测试性** - 拆分后组件应易于单元测试
4. **可复用性** - 拆分的组件应考虑在其他场景复用的可能
