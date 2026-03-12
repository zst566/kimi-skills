---
name: ui-ux-pro-max
description: "为Kimi提供专业的UI/UX设计智能，包含设计系统生成器、100+行业设计规则和BM25搜索引擎。当用户请求UI/UX设计时使用"
---

# UI UX Pro Max - 设计智能技能

为 Kimi 提供专业的 UI/UX 设计智能，包含设计系统生成器、100+ 行业设计规则和 BM25 搜索引擎。

## 使用方法

### 1. 生成设计系统（推荐）

当用户请求 UI/UX 设计时，使用以下命令生成完整设计系统：

```bash
python3 ~/.config/agents/skills/ui-ux-pro-max/scripts/search.py "<产品类型> <行业> <风格关键词>" --design-system [-p "项目名称"]
```

**示例：**
```bash
python3 ~/.config/agents/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service elegant" --design-system -p "Serenity Spa"
```

### 2. 搜索特定领域

```bash
python3 ~/.config/agents/skills/ui-ux-pro-max/scripts/search.py "<关键词>" --domain <领域> [-n <结果数量>]
```

**可用领域：**
| 领域 | 用途 | 示例关键词 |
|------|-----|-----------|
| `product` | 产品类型推荐 | SaaS, e-commerce, portfolio |
| `style` | UI 样式、颜色、效果 | glassmorphism, minimalism |
| `typography` | 字体配对、Google Fonts | elegant, playful |
| `color` | 按产品类型的调色板 | saas, healthcare, fintech |
| `landing` | 页面结构、CTA 策略 | hero, testimonial |
| `chart` | 图表类型、库推荐 | trend, comparison |
| `ux` | 最佳实践、反模式 | animation, accessibility |

### 3. 技术栈指南

获取特定技术栈的实现建议：

```bash
python3 ~/.config/agents/skills/ui-ux-pro-max/scripts/search.py "<关键词>" --stack <stack>
```

**可用技术栈：**
- `html-tailwind` (默认)
- `react`, `nextjs`, `vue`, `svelte`
- `swiftui`, `react-native`, `flutter`
- `shadcn`, `jetpack-compose`

## 工作流程

1. **分析需求** - 提取产品类型、风格关键词、行业
2. **生成设计系统** - 使用 `--design-system` 获取完整推荐
3. **补充搜索** - 使用领域搜索获取更多细节
4. **应用规则** - 遵循预交付检查清单

## 预交付检查清单

### 视觉质量
- [ ] 不使用 emoji 作为图标（使用 SVG）
- [ ] 图标来自统一图标集
- [ ] 悬停状态不引起布局偏移

### 交互
- [ ] 所有可点击元素有 `cursor-pointer`
- [ ] 过渡动画平滑（150-300ms）
- [ ] 键盘导航焦点状态可见

### 响应式
- [ ] 支持 375px, 768px, 1024px, 1440px
- [ ] 移动端无水平滚动

### 可访问性
- [ ] 所有图片有 alt 文本
- [ ] 表单输入有标签
- [ ] 支持 `prefers-reduced-motion`
