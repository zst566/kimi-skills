# 代码拆分任务模板

## 任务基本信息

- **任务 ID**: {task_id}
- **源文件**: {source_file}
- **目标文件**: {target_file}
- **代码范围**: 行 {start_line} - {end_line}
- **拆分类型**: {split_type} <!-- module/layer/util -->

## 功能描述

{description}

包含的代码：
- 路由定义: {routes}
- 辅助函数: {helpers}
- 需要导入的依赖: {dependencies}

## 执行步骤

### 1. 读取源文件
使用 ReadFile 读取指定代码范围：
```
ReadFile path="{source_file}" line_offset={start_line} n_lines={end_line - start_line}
```

### 2. 分析依赖关系
识别以下依赖：
- [ ] 导入的模块（import/from）
- [ ] 使用的外部函数/变量
- [ ] 共享的工具函数

### 3. 创建新文件

文件头模板：
```javascript
// {target_file}
// 功能: {description}
// 从 {source_file} 拆分而来

import express from 'express'
import { prisma } from '../../utils/prisma.js'
import { authenticate } from '../../middleware/auth.js'
// 添加其他必要导入...

const router = express.Router()

// 代码主体...

export default router
```

### 4. 代码迁移检查清单

- [ ] 所有路由处理函数已复制
- [ ] 所有辅助函数已复制
- [ ] 导入语句正确
- [ ] 导出语句正确
- [ ] 代码格式一致
- [ ] 注释已保留

### 5. 验证

运行语法检查：
```bash
node --check {target_file}
```

检查导入导出：
```bash
grep -n "^import\|^export" {target_file}
```

## 输出要求

完成后返回以下信息：

```json
{
  "task_id": "{task_id}",
  "status": "completed|failed",
  "target_file": "{target_file}",
  "exports": ["导出列表"],
  "dependencies": ["依赖的外部模块"],
  "shared_utils": ["需要共享的工具函数"],
  "notes": "其他注意事项"
}
```

## 约束条件

1. **不要修改源文件** - 只做读取，不做写入
2. **保持代码风格** - 与原文件保持一致
3. **保留注释** - 不要删除原有注释
4. **最小化改动** - 只移动代码，不重构逻辑
5. **明确接口** - 导出的函数/变量要清晰

## 常见问题

**Q: 如何处理与其他模块的共享代码？**
A: 标记出来，在 utils.js 中统一提取

**Q: 如何处理循环依赖？**
A: 暂停任务，通知主代理调整拆分方案

**Q: 发现代码有bug怎么办？**
A: 记录但不修复，保持功能等价
