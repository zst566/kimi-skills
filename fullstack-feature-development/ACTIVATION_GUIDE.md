# 技能激活与使用指南

## 技能已安装

技能路径: `~/.config/agents/skills/fullstack-feature-development/`

## 如何触发技能

这个技能会在以下情况**自动触发**：

1. 你说"开发新功能"、"实现需求"、"做功能"
2. 你说"创建一个模块"、"添加功能"
3. 你询问开发流程、如何规范开发
4. 任何涉及前后端开发的任务开始

**触发后 Kimi 会**: 按照 SKILL.md 中的流程执行标准化的开发流程

## 技能包含的内容

```
fullstack-feature-development/
├── SKILL.md                     # 技能主文件（触发后加载）
├── references/
│   ├── brainstorming-guide.md   # 头脑风暴指南
│   ├── checklist-template.md    # 检查清单模板
│   ├── api-contract.md          # API契约规范
│   └── quick-reference.md       # 快速参考卡片
├── scripts/
│   └── verify-dev.sh            # 开发验证脚本
└── assets/templates/
    └── dev-checklist.md         # 可复制的检查清单
```

## 使用方式

### 方式1: 自动触发（推荐）

直接描述你要开发的功能：

```
"我要开发一个用户管理功能"
"帮我实现订单导出功能"
"新功能：数据统计报表"
```

Kimi 会自动识别并执行完整流程。

### 方式2: 手动使用检查清单

复制检查清单到你的项目：

```bash
# 在项目 docs/ 目录下创建检查清单
cp ~/.config/agents/skills/fullstack-feature-development/assets/templates/dev-checklist.md \
   docs/dev-checklist-[功能名].md
```

### 方式3: 使用验证脚本

```bash
# 复制验证脚本到项目
cp ~/.config/agents/skills/fullstack-feature-development/scripts/verify-dev.sh ./scripts/
chmod +x ./scripts/verify-dev.sh

# 运行验证
./scripts/verify-dev.sh
```

## 技能效果

激活此技能后，Kimi 会：

1. **强制执行5个检查点** - 不通过不能进入下一阶段
2. **提供标准模板** - 检查清单、设计文档模板
3. **自动验证** - 运行脚本检查常见问题
4. **规范交付** - 要求带证据的完成声明

## 常见问题

### Q: 技能没有触发怎么办？
A: 明确说出"开发新功能"或"实现需求"等关键词，或手动说"使用 fullstack-feature-development 技能"

### Q: 可以用在其他项目吗？
A: 可以！这是全局技能，安装后在任何项目都能触发

### Q: 如何更新技能？
A: 直接修改 `~/.config/agents/skills/fullstack-feature-development/` 下的文件

### Q: 技能太严格怎么办？
A: 严格是为了减少返工。如果确实需要跳过某个检查点，明确告诉 Kimi "跳过 CPX"
