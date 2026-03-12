# Kimi Code CLI 并发代理执行指南

在 Kimi Code CLI 中使用 Task 工具实现并发代码拆分。

## Task 工具基础

Task 工具用于分派子代理执行特定任务。子代理在独立上下文中运行，与当前会话隔离。

### 基本用法

```typescript
Task({
  subagent_name: "coder",      // 子代理类型
  description: "简短描述",      // 任务描述
  prompt: "详细的任务指令..."   // 完整任务说明
})
```

## 并发执行模式

### 模式 1: 并行分派（推荐）

同时启动多个独立任务，无顺序依赖：

```typescript
// 定义多个独立任务
const task1 = Task({
  subagent_name: "coder",
  description: "提取票根类型模块",
  prompt: `
从 apps/backend/src/routes/pc/ticket.js 中提取行 1-110 的代码：
- 创建新文件 apps/backend/src/routes/pc/ticket/types.js
- 包含所有 /ticket-types 路由处理函数
- 保留导入语句和导出

完成后返回：新文件路径和导出内容列表
`
})

const task2 = Task({
  subagent_name: "coder",
  description: "提取票根记录模块",
  prompt: `
从 apps/backend/src/routes/pc/ticket.js 中提取行 220-335 的代码：
- 创建新文件 apps/backend/src/routes/pc/ticket/records.js
- 包含所有 /tickets/review 路由

完成后返回：新文件路径和导出内容列表
`
})

const task3 = Task({
  subagent_name: "coder",
  description: "提取商户管理模块",
  prompt: `
从 apps/backend/src/routes/pc/ticket.js 中提取行 340-540 的代码：
- 创建新文件 apps/backend/src/routes/pc/ticket/merchants.js
- 包含所有 /merchants 路由

完成后返回：新文件路径和导出内容列表
`
})

// 同时执行所有任务
const results = await Promise.all([task1, task2, task3])
```

### 模式 2: 批量创建任务

从配置动态创建任务：

```typescript
const modules = [
  { id: 'types', lines: [1, 110], target: 'types.js' },
  { id: 'records', lines: [220, 335], target: 'records.js' },
  { id: 'merchants', lines: [340, 540], target: 'merchants.js' },
  { id: 'statistics', lines: [546, 704], target: 'statistics.js' }
]

// 为每个模块创建任务
const tasks = modules.map(m => Task({
  subagent_name: "coder",
  description: `提取 ${m.id} 模块`,
  prompt: `
源文件: apps/backend/src/routes/pc/ticket.js
代码范围: 行 ${m.lines[0]} - ${m.lines[1]}
目标文件: apps/backend/src/routes/pc/ticket/${m.target}

任务:
1. 读取源文件指定行范围
2. 创建目标文件
3. 复制代码并调整导入导出
4. 返回完成状态
`
}))

// 并发执行
const results = await Promise.all(tasks)
```

## Prompt 设计要点

### 完整上下文

子代理无法看到当前会话历史，必须提供完整上下文：

```typescript
Task({
  subagent_name: "coder",
  description: "提取模块",
  prompt: `
## 项目背景
- 项目类型: Node.js + Express 后端
- 基础路径: /Volumes/SanDisk2T/dv-codeBase/茂名·交投-文旅平台
- 目的: 代码拆分重构

## 任务详情
源文件: apps/backend/src/routes/pc/ticket.js (1000行)
需要提取: 行 1-110 的票根类型管理代码
目标文件: apps/backend/src/routes/pc/ticket/types.js

## 提取范围
包含以下路由:
- GET /ticket-types
- POST /ticket-types  
- PUT /ticket-types/:id
- DELETE /ticket-types/:id

## 依赖项
需要导入:
- express from 'express'
- prisma from '../../utils/prisma.js'
- authenticate from '../../middleware/auth.js'

## 输出要求
1. 创建目标文件
2. 保持原有代码逻辑
3. 正确设置导入导出
4. 返回: 文件路径 + 导出函数列表

## 约束
- 不修改源文件
- 保持代码风格一致
- 保留原有注释
`
})
```

### 清晰的输入输出

明确定义任务边界：

```typescript
// 输入
const input = {
  sourceFile: "apps/backend/src/routes/pc/ticket.js",
  lineStart: 1,
  lineEnd: 110,
  targetFile: "apps/backend/src/routes/pc/ticket/types.js",
  routes: ["/ticket-types"]
}

// 输出格式
const expectedOutput = {
  file: "apps/backend/src/routes/pc/ticket/types.js",
  exports: ["router"],
  routes: ["GET /", "POST /", "PUT /:id", "DELETE /:id"],
  status: "completed"
}
```

## 最佳实践

### 1. 任务独立性

确保任务之间无依赖：

```typescript
// ✅ 好的设计 - 任务独立
const taskA = Task({
  description: "提取模块A",
  prompt: "从 file.js 行 1-100 提取到 A.js..."
})

const taskB = Task({
  description: "提取模块B", 
  prompt: "从 file.js 行 200-300 提取到 B.js..."
})

// ❌ 坏的设计 - 任务依赖
const taskA = Task({
  description: "创建 A.js",
  prompt: "创建 A.js..."
})

const taskB = Task({
  description: "在 A.js 基础上创建 B.js",
  prompt: "先读取 A.js，然后创建 B.js..."  // 依赖 taskA 结果
})
```

### 2. 错误处理

处理子代理可能的失败：

```typescript
const results = await Promise.allSettled(tasks)

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`任务 ${index} 成功:`, result.value)
  } else {
    console.error(`任务 ${index} 失败:`, result.reason)
    // 重试或调整策略
  }
})
```

### 3. 并发控制

避免过多并发：

```typescript
// 限制并发数
const CONCURRENCY = 3

async function runWithLimit(tasks, limit) {
  const results = []
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit)
    const batchResults = await Promise.all(batch)
    results.push(...batchResults)
  }
  return results
}

const results = await runWithLimit(tasks, CONCURRENCY)
```

### 4. 结果整合

子代理完成后整合结果：

```typescript
const results = await Promise.all(tasks)

// 创建索引文件
const indexContent = results.map(r => {
  const moduleName = r.file.replace('.js', '')
  return `import ${moduleName}Router from './${r.file}'`
}).join('\n')

// 写入索引文件
WriteFile({
  path: "apps/backend/src/routes/pc/ticket/index.js",
  content: indexContent
})
```

## 完整示例

```typescript
// 代码拆分主流程
async function splitCodeFile(sourceFile, splitPlan) {
  log(`开始拆分: ${sourceFile}`)
  
  // 1. 创建并发任务
  const tasks = splitPlan.modules.map(module => 
    Task({
      subagent_name: "coder",
      description: `提取 ${module.name}`,
      prompt: generatePrompt(sourceFile, module)
    })
  )
  
  // 2. 并发执行
  log(`启动 ${tasks.length} 个子代理...`)
  const results = await Promise.all(tasks)
  
  // 3. 验证结果
  const successCount = results.filter(r => r.status === 'completed').length
  log(`完成: ${successCount}/${tasks.length}`)
  
  // 4. 创建索引文件
  await createIndexFile(splitPlan.outputDir, results)
  
  return results
}

function generatePrompt(sourceFile, module) {
  return `
## 任务
从 ${sourceFile} 提取代码到 ${module.targetFile}

## 范围
- 行号: ${module.lines[0]} - ${module.lines[1]}
- 功能: ${module.description}
- 路由: ${module.routes.join(', ')}

## 步骤
1. 读取源文件指定行
2. 创建目标文件
3. 复制代码并调整导入
4. 验证语法正确

## 输出
返回 JSON: {"file": "路径", "exports": [], "status": "completed"}
`
}
```

## 调试技巧

### 1. 先测试单个任务

```typescript
// 先测试一个任务
const testResult = await Task({
  subagent_name: "coder",
  description: "测试提取",
  prompt: "..."
})

console.log("测试结果:", testResult)

// 确认正确后再批量执行
```

### 2. 使用描述性任务名

```typescript
Task({
  subagent_name: "coder",
  description: "提取 ticket-types 路由 (行 1-110)",  // 清晰的描述
  prompt: "..."
})
```

### 3. 保存中间结果

```typescript
const results = await Promise.all(tasks)

// 保存结果供后续分析
WriteFile({
  path: "split-results.json",
  content: JSON.stringify(results, null, 2)
})
```
