# API契约规范

## 响应格式标准

### 后端返回格式
```json
{
  "code": 200,
  "data": { ... },
  "message": "success"
}
```

### 错误响应格式
```json
{
  "code": 400,
  "data": null,
  "message": "具体错误信息"
}
```

### 前端接收格式（重要！）

经过 axios 拦截器后：
```javascript
// api.js 中的拦截器提取了 response.data.data
response => response.data.data
```

**所以前端 store 拿到的已经是 data 字段，不要再检查 .code！**

### 正确与错误示例

```javascript
// ❌ 错误 - 响应已经是data，没有code
const response = await api.getSomething();
if (response.code === 200) {  // undefined!
  this.data = response.data;
}

// ✅ 正确 - 直接使用返回的数据
const data = await api.getSomething();
this.data = data;

// ✅ 错误处理 - 用try-catch
const data = await api.getSomething().catch(err => {
  console.error('获取失败:', err);
  return null;
});
```

## HTTP状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | 成功 | 正常响应 |
| 201 | 创建成功 | POST创建资源 |
| 400 | 请求错误 | 参数验证失败 |
| 401 | 未授权 | Token无效/过期 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 未找到 | 资源不存在 |
| 500 | 服务器错误 | 服务端异常 |

## 通用响应Code

| Code | 含义 |
|------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录/Token无效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
