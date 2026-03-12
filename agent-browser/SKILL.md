---
name: agent-browser
description: 面向 AI Agent 的浏览器自动化工具。在执行可视化测试、网页 UI 自动化、表单填写、按钮点击、截图和验证页面元素时使用。支持自然语言命令和 JavaScript 执行来处理复杂交互。
---

# Agent-Browser 浏览器自动化技能

基于 Playwright 的浏览器自动化工具，专为 AI Agent 设计，支持自然语言命令和 JavaScript 执行。

## 何时使用此技能

- ✅ 网页可视化测试和验证
- ✅ 自动化表单填写和提交
- ✅ 按钮点击、链接导航
- ✅ 页面截图和元素截图
- ✅ 验证页面元素存在性和内容
- ✅ 端到端业务流程测试

## 基础命令

### 1. 页面导航

```bash
# 打开指定 URL
agent-browser open <url>

# 示例
agent-browser open http://localhost:8080
agent-browser open http://192.168.31.188/pc-admin/
```

### 2. 页面截图

```bash
# 截取当前页面
agent-browser screenshot <path>

# 示例
agent-browser screenshot /tmp/test_01.png
agent-browser screenshot ./screenshots/login-page.png
```

### 3. 元素点击

#### 方法 1：通过文本点击（最简单）
```bash
# 适用于按钮文字唯一的场景
agent-browser click "text=确定"
agent-browser click "text=登录"
agent-browser click "text=关闭"
```

#### 方法 2：通过 CSS 选择器
```bash
# 通过 class
agent-browser click ".el-button--primary"
agent-browser click ".btn-submit"

# 通过属性
agent-browser click "button[type='submit']"
agent-browser click "input[name='username']"

# 通过组合选择器
agent-browser click ".el-dialog__footer button"
```

#### 方法 3：JavaScript 方式（最可靠）
```bash
# 查找包含特定文本的元素并点击
agent-browser eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('新增规则')).click()"

# 点击第一个匹配的元素
agent-browser eval "document.querySelector('.el-button').click()"

# 点击第 N 个元素
agent-browser eval "document.querySelectorAll('.el-button')[2].click()"
```

### 4. 表单填写

```bash
# 填充输入框
agent-browser fill "<selector>" "<text>"

# 示例
agent-browser fill "input[placeholder*='用户名']" "admin"
agent-browser fill "input[type='password']" "admin@123"
agent-browser fill "#username" "testuser"
```

### 5. 键盘操作

```bash
# 按键
agent-browser press Enter
agent-browser press Tab
agent-browser press "Control+a"

# 输入文本（模拟键盘输入）
agent-browser keyboard type "Hello World"

# 插入文本（不触发键盘事件）
agent-browser keyboard inserttext "Hello World"
```

### 6. 执行 JavaScript

```bash
# 执行任意 JavaScript
agent-browser eval "<javascript_code>"

# 示例
agent-browser eval "location.reload()"                    # 刷新页面
agent-browser eval "window.scrollTo(0, 500)"             # 滚动页面
agent-browser eval "document.title"                       # 获取标题
agent-browser eval "document.querySelector('h1').innerText" # 获取文本
```

## 高级技巧

### 处理多个相同文字的元素

```bash
# 通过索引选择
agent-browser eval "document.querySelectorAll('button:contains(编辑)')[0].click()"

# 通过父容器限定
agent-browser eval "document.querySelector('.el-table__row:first-child').querySelector('button').click()"

# 通过相邻元素定位
agent-browser eval "Array.from(document.querySelectorAll('tr')).find(tr => tr.textContent.includes('ID=4')).querySelector('.edit-btn').click()"
```

### 处理动态加载内容

```bash
# 等待元素出现后再点击
agent-browser click "text=菜单名"
sleep 2
agent-browser click "text=子菜单"

# 或使用 JavaScript 轮询
agent-browser eval "
  const waitForElement = (selector, callback) => {
    const el = document.querySelector(selector);
    if (el) callback(el);
    else setTimeout(() => waitForElement(selector, callback), 500);
  };
  waitForElement('.loaded-item', el => el.click());
"
```

### 截图特定元素

```bash
# 先执行 JavaScript 滚动元素到视口
agent-browser eval "document.querySelector('.target-element').scrollIntoView()"

# 然后截图
agent-browser screenshot /tmp/element.png
```

## 实战案例

### 案例 1：登录流程测试

```bash
# 1. 打开登录页
agent-browser open http://localhost/login

# 2. 填写用户名密码
agent-browser fill "input[placeholder*='用户名']" "admin"
agent-browser fill "input[placeholder*='密码']" "admin@123"

# 3. 点击登录
agent-browser click "text=登录"

# 4. 等待并截图验证
sleep 3
agent-browser screenshot /tmp/after_login.png
```

### 案例 2：表格操作（商户管理）

```bash
# 1. 进入商户管理页面
agent-browser click "text=票根优惠"
sleep 1
agent-browser click "text=商户管理"
sleep 3

# 2. 点击特定行的"管理规则"按钮
# 方法 A：通过行内容定位
agent-browser eval "Array.from(document.querySelectorAll('tr')).find(tr => tr.textContent.includes('4') && tr.textContent.includes('测试商户')).querySelector('button:contains(管理规则)').click()"

# 方法 B：通过索引点击第一行
agent-browser click "table tr:first-child button:has-text('管理规则')"

# 3. 截图验证
sleep 2
agent-browser screenshot /tmp/rules_dialog.png
```

### 案例 3：表单填写并提交

```bash
# 1. 打开新增规则弹窗
agent-browser eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('新增规则')).click()"

# 2. 填写规则名称
agent-browser fill "input[placeholder*='规则名称']" "测试规则-$(date +%s)"

# 3. 选择复选框（适用票种）
agent-browser click "text=火车票"
agent-browser click "text=飞机票"

# 4. 选择单选按钮
agent-browser click "text=固定金额"

# 5. 填写数值
agent-browser type "input[placeholder*='优惠值']" "10"

# 6. 截图确认
agent-browser screenshot /tmp/form_filled.png

# 7. 点击确定提交
agent-browser click "text=确定"

# 8. 等待并截图结果
sleep 3
agent-browser screenshot /tmp/result.png
```

### 案例 4：验证元素存在和内容

```bash
# 验证元素存在
agent-browser eval "document.querySelector('.success-message') !== null"

# 获取并验证文本内容
agent-browser eval "
  const tag = document.querySelector('.el-tag');
  const text = tag ? tag.textContent : 'not found';
  console.log('标签内容:', text);
  text.includes('2 条');
"
```

## 常见问题与解决

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `text=xxx` 找不到元素 | 文字不完全匹配或有特殊字符 | 使用 JavaScript `includes` 方法 |
| `:has-text()` 报错 | agent-browser 不支持此伪类 | 改用 `Array.from + find` |
| 点击超时 | 元素未加载或选择器错误 | 先 `sleep` 等待，再使用更精确的选择器 |
| 匹配到多个元素 | 选择器过于宽泛 | 添加父容器限定或索引 |
| 表单填写失败 | 元素未聚焦或事件未触发 | 先 `click` 聚焦再 `type` |

## 最佳实践

1. **优先使用简单选择器**：能用 `text=确定` 就不用复杂 CSS
2. **复杂场景用 JavaScript**：当选择器搞不定时，用 `eval` 执行 JS
3. **添加等待时间**：页面切换后 `sleep 2-3` 秒再操作
4. **及时截图验证**：关键步骤后截图，便于排查问题
5. **使用坐标作为最后手段**：当所有选择器都失败时，用 `--point x,y`

## 工具位置

```bash
# 检查是否安装
which agent-browser

# 查看版本
agent-browser --version

# 查看帮助
agent-browser --help
```

## 与其他工具对比

| 特性 | agent-browser | Playwright | PinchTab |
|------|--------------|------------|----------|
| 使用方式 | CLI 命令 | 代码/脚本 | HTTP API |
| 学习曲线 | 低（自然语言）| 中 | 中 |
| 多实例管理 | 否 | 需自行管理 | 是 |
| 适用场景 | 快速测试、演示 | 生产自动化 | 多账号管理 |
| AI 友好度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

**提示**：此技能由 AI Agent 创建并维护，用于记录 agent-browser 的使用经验和最佳实践。
