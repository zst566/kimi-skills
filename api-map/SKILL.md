---
name: api-map
description: "API Map - Runtime-first API discovery and testing. Collects API paths from frontend and backend code, then verifies each path with actual HTTP requests (curl). Reports are based on real server responses, not static code analysis. Use when needing accurate API path validation, detecting mismatches between frontend calls and backend routes, or verifying API availability."
---

# API Map - Runtime-First API Discovery & Testing

## Overview

API Map performs **runtime verification** of all API paths. It collects paths from both frontend and backend code, then uses actual HTTP requests to verify which paths work and which don't.

**Core Principle**: The only way to confirm if an API path is correct is to send a request and see the response. Static code analysis can only suggest paths to test - runtime response is the truth.

**Process**: Collect Paths → **Runtime Verify (curl)** → Analyze Results → Report

---

## ⚠️ Critical Guidelines (Read First)

### 1. Runtime Verification is the Only Truth

**Static code analysis is NOT reliable for path validation.**

```
❌ Wrong approach: 
   Look at code structure → Determine if path is correct → Report mismatches

✅ Correct approach:
   Collect all possible paths → Test with curl → Report based on HTTP response
```

**Example**: `/api/pc/config/home_full_config`
- Static analysis: "Path looks nested, backend uses flat structure, MISMATCH!"
- Runtime test: `curl → 200 OK`
- **Conclusion**: Path works. Static analysis was wrong.

**Rule**: Always confirm with curl before reporting a path mismatch.

### 2. How to Verify Path Correctness

```bash
# Step 1: Test the frontend path
curl -s http://server/api/pc/config/home_full_config
curl -s http://server/api/pc/carpool/calculate-driving-time

# Step 2: If 404, test alternative paths based on code analysis
curl -s http://server/api/pc/carpool-calculate/calculate-driving-time

# Step 3: Report based on actual HTTP response, not code structure
```

### 3. Static Analysis is Only for Path Collection

Static code analysis should ONLY be used to:
1. **Collect candidate paths** to test
2. **Generate alternative paths** when original returns 404
3. **Help diagnose** why a path fails (after curl confirms it fails)

**Never report a problem based solely on static analysis.**

```
❌ Wrong: "Code shows path mismatch, reporting issue"
✅ Right: "curl returned 404, now analyzing code to find correct path"
```

### 4. Runtime Test Before Fixing

**Before fixing any "path issue", verify it's a real problem:**

```bash
# Test the suspected wrong path
curl -s http://server/api/pc/ticket-types

# If 404, test the "correct" path
curl -s http://server/api/pc/ticket/ticket-types

# Only fix if:
# 1. Original path returns 404
# 2. Alternative path returns 200
```

**Example - Double Nesting:**
```javascript
// types.js defines: router.get('/ticket-types', ...)
// Result might be /ticket-types/ticket-types

// DON'T fix just because code looks wrong
// DO fix only if curl returns 404 on the expected path
```

### 5. Generate Path Variations for Testing

When the original path returns 404, use code analysis to generate alternatives to test:

```bash
# Original path returns 404
curl /api/pc/carpool/calculate-driving-time
# → 404

# Check backend code to find actual mount point
grep -r "carpool-calculate" apps/backend/src/routes/pc/index.js
# → router.use('/carpool-calculate', carpoolCalculateRouter)

# Test the alternative path
curl /api/pc/carpool-calculate/calculate-driving-time
# → 200 (or 401 if needs auth)

# Now confirm: original path is wrong, alternative is correct
```

**Code analysis helps find alternatives, curl confirms which one works.**

---

## Adaptive Testing Strategy

### Testing Philosophy

**Don't just report status codes - understand WHY.**

When an API returns 400 or 500, don't assume it's broken. Analyze the root cause:

```
Test API → Get Response → Analyze Error → Fix Parameters → Retest
                ↓
        Is it a path problem?
                ↓
        No → Is it a parameter problem?
                ↓
        No → Is it a data problem?
                ↓
        Yes → Fix and retest
```

### Intelligent Parameter Inference

When testing returns 400 (Bad Request):

**Step 1: Read Error Message**
```bash
curl -X POST /api/pc/articles
# → {"code":400,"message":"请输入资讯标题"}
```

**Step 2: Check Backend Code for Required Parameters**
```bash
# Find the route handler
grep -A 30 "router.post.*'/'." apps/backend/src/routes/pc/article.js

# Look for validation logic
if (!title || !title.trim()) {
  return res.status(400).json({ code: 400, message: '请输入资讯标题' })
}
if (!category_id) {
  return res.status(400).json({ code: 400, message: '请选择分类' })
}
```

**Step 3: Get Valid Test Data from Database**
```bash
# Query database for valid IDs
mysql -e "SELECT id, name FROM ArticleCategory LIMIT 3;"
# → id: 1, name: '景区资讯'

# Retest with correct parameters
curl -X POST /api/pc/articles \
  -d '{"title":"测试","category_id":1,"content":"内容"}'
# → 200 OK (path is correct!)
```

**Conclusion**: 400 error was due to missing parameters, not wrong path.

---

### Database-Driven Testing

When testing returns 500 (Server Error):

**Step 1: Check if ID exists**
```bash
# Test with ID=1
curl /api/pc/articles/1
# → 500 ("Record not found")

# Query database for actual IDs
mysql -e "SELECT id FROM Article ORDER BY id LIMIT 3;"
# → id: 7, 2, 9

# Retest with real ID
curl /api/pc/articles/7
# → 200 OK
```

**Step 2: Check Database Schema**
```bash
# If 500 persists, check Prisma model
grep -A 10 "model CancelReason" apps/backend/prisma/schema.prisma

# Check actual table structure
mysql -e "DESCRIBE CancelReason;"

# Compare field names and types
```

**Step 3: Fix Data or Schema**
- If field name mismatch → Fix Prisma model or database
- If missing data → Insert test data
- If data type error → Cast to correct type

---

### Error Analysis Decision Tree

```
HTTP Response
    ↓
200 → ✅ API works correctly
    ↓
401 → ✅ Path exists (auth required, get token and retest)
    ↓
404 → ❌ Path doesn't exist (report as mismatch)
    ↓
400 → Analyze error message
    ↓
    Missing parameter? → Check backend code → Get params → Retest
    Invalid parameter? → Check database → Get valid ID → Retest
    ↓
500 → Check database schema
    ↓
    Table/field missing? → Check Prisma model → Fix schema
    Record not found? → Use list API → Get real ID → Retest
    Other error? → Check server logs → Debug
```

---

## Runtime Verification Approach

### Why Runtime Verification?

**Static code analysis has limitations:**

```javascript
// backend/routes/pc/config.js
router.get('/:key', ...)  // This handles /home_full_config via route param

// Static analysis might see: 
// "Frontend calls /config/home_full_config, backend has /config/:key"
// → MISMATCH (nested vs flat)

// But runtime test shows:
// curl /api/pc/config/home_full_config → 200 OK
// → Actually works fine!
```

**Conclusion**: Only runtime testing reveals the truth.

### How to Verify Routes

**Step 1: Collect Candidate Paths**

Scan both frontend and backend to build a list of paths to test:

```javascript
// From frontend API files
const frontendPaths = [
  '/api/pc/config/home_full_config',
  '/api/pc/carpool/calculate-driving-time',
  '/api/pc/auth/verify',
  // ...
]

// From backend route analysis (optional, for generating alternatives)
const backendMounts = {
  'carpool': '/carpool-route.js',
  'carpool-calculate': '/carpool-calculate.js',
  'carpool-stops': '/carpool-stop.js'
}
```

**Step 2: Runtime Test All Paths**

```bash
#!/bin/bash
# test-all-paths.sh

BASE_URL="http://192.168.31.188"

# Test each path
for path in "$@"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
  echo "${path}: ${status}"
done
```

**Concurrency Strategy - 并发测试策略**

当 API 数量较多时（>50个），必须使用并发处理提高效率：

```
总 API 数 → 分成 N 批
              ↓
    并行测试（多任务同时执行）
              ↓
    汇总结果
```

**建议的并发方式**:

1. **Shell 并行**（适用于简单测试）:
```bash
# 使用 & 和 wait 实现并行
for api in api_list; do
  (test_api "$api" >> results.txt) &
done
wait
echo "All tests completed"
```

2. **Subagent 并行**（推荐，适用于深度分析）:
```
- 将 API 列表分成多批（每批 20-30 个）
- 使用多个 subagent 同时执行
- 每个 subagent 负责一批 API 的测试和分析
- 汇总所有 subagent 的结果
```

3. **Python 并发**（适用于复杂逻辑）:
```python
import asyncio
import aiohttp

async def test_api(session, api):
    async with session.get(api['url']) as resp:
        return {'api': api, 'status': resp.status}

async def test_all(apis):
    async with aiohttp.ClientSession() as session:
        tasks = [test_api(session, api) for api in apis]
        return await asyncio.gather(*tasks)
```

**分批建议**:
- < 50 个 API：单批次，顺序执行
- 50-100 个 API：分 2-3 批，并行执行
- 100+ 个 API：分 4-5 批，并行执行

**重要**: 即使使用并发，也必须确保**所有 API 都被测试**，不能遗漏。

**Step 3: For 404s, Find Working Alternatives**

```javascript
// If /api/pc/carpool/calculate-driving-time returns 404:

// Use code analysis to generate alternatives:
// - Check backend index.js for mount points
// - Find that 'carpool' is mounted as 'carpool-calculate'

// Test alternative:
// curl /api/pc/carpool-calculate/calculate-driving-time → 200

// Report confirmed mismatch
```

---

## The Runtime-First Process

### Step 1: Discover - Detect Project Structure

**Goal**: Find all modules and determine scope

**Detection**:
```
apps/
  ├── pc-admin/     → PC management frontend
  ├── mobile-h5/    → Mobile H5 frontend
  ├── miniprogram/  → WeChat Mini Program
  └── backend/      → Node.js API server
```

---

### Step 2: Collect - Gather All API Paths

**Goal**: Build a complete list of API paths to test

**From Frontend** (scan api/ or services/ directories):
```javascript
// pc-admin/src/api/config.js
export const getHomeConfig = () => request.get('/pc/config/home_full_config')
export const getBanners = () => request.get('/pc/config/home_banners')

// Extracted paths:
// - GET /api/pc/config/home_full_config
// - GET /api/pc/config/home_banners
```

**From Backend** (scan routes/ for mount points):
```javascript
// backend/src/routes/pc/index.js
router.use('/carpool-calculate', carpoolCalculateRouter)
router.use('/carpool-stops', carpoolStopRouter)

// This helps generate alternative paths when original 404s
```

---

### Step 3: Runtime Verify - Test Every Path with curl

**Goal**: Determine which paths actually work

**⚠️ Critical Rule: Test ALL APIs, No Sampling**

**必须测试所有收集到的 API，禁止抽样测试。**

```
❌ 错误做法:
   - 只测试部分 "关键" API
   - 声称 "测试了代表性样本"
   - 用估算数字代替实际测试数量

✅ 正确做法:
   - 测试所有收集到的 API 路径
   - 报告中明确显示: "Total APIs Tested: 147/147"
   - 对每一个 API 执行完整的验证流程
```

**Why Test All?**
- 抽样的 10% 可能恰好都是正常的，遗漏了真正的问题
- API 之间可能存在依赖关系，漏测一个可能导致结论错误
- 报告的可信度建立在完整测试的基础上

**Test Each Path**:

```bash
# Test path 1
curl -s http://192.168.31.188/api/pc/config/home_full_config
# → {"code":200,...} ✅

# Test path 2
curl -s http://192.168.31.188/api/pc/carpool/calculate-driving-time
# → {"code":404,...} ❌

# Test path 3 (for comparison)
curl -s http://192.168.31.188/api/pc/auth/verify
# → {"code":404,...} ❌
```

**Initial Classification Based on HTTP Response**:

| HTTP Status | Initial Classification | Action |
|:-----------:|------------------------|--------|
| 200-299 | ✅ Works | Record as success |
| 401/403 | ⚠️ Needs auth | Get token and retest |
| 404 | ❌ Not found | Check alternatives |
| 400 | ⚠️ Unknown | **Analyze error** |
| 500 | ⚠️ Unknown | **Analyze error** |

**Important**: 400 and 500 require further analysis before classification.

---

### Step 3b: Deep Analysis for 400/500 Errors

When you get 400 or 500, don't stop there. Dig deeper:

#### For 400 Errors (Bad Request):

```bash
# 1. Capture full error response
curl -X POST http://server/api/pc/articles -v
# → {"code":400,"message":"请输入资讯标题"}

# 2. Analyze what parameter is missing
# Error says: "请输入资讯标题" (Please enter article title)
# → Missing: title

# 3. Check backend for all required params
grep -A 20 "router.post.*'/'." apps/backend/src/routes/pc/article.js
# → Extract: title, category_id, content, etc.

# 4. Query database for valid values
mysql -e "SELECT id, name FROM ArticleCategory LIMIT 1;"
# → category_id: 1

# 5. Retest with complete parameters
curl -X POST http://server/api/pc/articles \
  -H "Content-Type: application/json" \
  -d '{"title":"测试","category_id":1,"content":"内容"}'
# → 200 OK ✅

# Conclusion: Path was correct, just needed parameters
```

#### For 500 Errors (Server Error):

```bash
# 1. Capture error details
curl http://server/api/pc/articles/1
# → 500 with "Record not found"

# 2. Check if ID exists in database
mysql -e "SELECT id FROM Article ORDER BY id LIMIT 3;"
# → id: 7, 2, 9 (ID=1 doesn't exist!)

# 3. Use list API to get valid ID
curl http://server/api/pc/articles?page=1&size=1
# → Get first article ID: 7

# 4. Retest with real ID
curl http://server/api/pc/articles/7
# → 200 OK ✅

# Conclusion: Path was correct, ID=1 just didn't exist
```

#### For Persistent 500 Errors (Database Schema Issues):

```bash
# If 500 persists after using valid ID:

# 1. Check Prisma model
grep -A 15 "model Article" apps/backend/prisma/schema.prisma

# 2. Check actual database schema  
mysql -e "DESCRIBE Article;"

# 3. Compare and identify mismatch
# Prisma: content TEXT
# DB: content VARCHAR(255) - MISMATCH!

# 4. Fix: Update Prisma or migrate database
```

---

### Step 3c: Final Classification

After deep analysis, reclassify:

| Initial | After Analysis | Final Classification | Meaning |
|:-------:|:--------------:|:--------------------:|---------|
| 400 | Parameters missing | ✅ Path correct | Added params → 200 |
| 400 | Invalid data | ✅ Path correct | Used valid ID → 200 |
| 500 | ID not found | ✅ Path correct | Used real ID → 200 |
| 500 | Schema mismatch | 💥 Backend bug | Database/Prisma issue |
| 500 | Code error | 💥 Backend bug | Needs code fix |
| 404 | Alternative works | ❌ Wrong path | Report mismatch |
| 404 | No alternative | ❌ Missing route | Report missing |

---

### Step 4: Find Alternatives for 404 Paths

**Goal**: For paths that returned 404, find the correct working path

**When Original Path Returns 404**:

```bash
# Original path:
# GET /api/pc/carpool/calculate-driving-time → 404

# Step 1: Check backend mount points
grep -n "carpool" apps/backend/src/routes/pc/index.js
# → router.use('/carpool-calculate', carpoolCalculateRouter)

# Step 2: Generate alternative path
# Original: /api/pc/carpool/calculate-driving-time
# Alternative: /api/pc/carpool-calculate/calculate-driving-time

# Step 3: Test alternative
curl -X POST http://192.168.31.188/api/pc/carpool-calculate/calculate-driving-time
# → 401 (needs auth) ✅ This path works!

# Confirmed mismatch:
# Frontend uses: /api/pc/carpool/calculate-driving-time ❌
# Should use: /api/pc/carpool-calculate/calculate-driving-time ✅
```

**Alternative Path Generation Strategy**:

| Original 404 Path | Check Backend For | Alternative to Test |
|-------------------|-------------------|---------------------|
| `/carpool/*` | Mount points containing "carpool" | `/carpool-calculate/*`, `/carpool-stops/*` |
| `/auth/verify` | Auth routes in PC module | None (might not exist in PC) |
| `/config/nested/path` | Route params (`/:key`) | Test as-is (may work via params) |

---

### Step 5: Comprehensive Testing (Optional)

**After path verification, optionally test API functionality:**

**Authenticate for Protected Endpoints**:
```bash
# Get token
curl -X POST http://192.168.31.188/api/pc/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use token for subsequent tests
curl -H "Authorization: Bearer <token>" \
  http://192.168.31.188/api/pc/carpool-calculate/calculate-driving-time
```

**Test Data Strategy**:

| Operation | Approach | Safety |
|-----------|----------|--------|
| GET | Test all with default params | ✅ Safe |
| POST/PUT/DELETE | Skip or use test DB | ⚠️ Careful |

---

### Step 6: Report - Generate Verification Report

**Output File Naming Convention**:

所有扫描报告文件必须使用统一的命名格式：

```
API-MAP-VERIFICATION-REPORT-{YYYYMMDD}.md
```

例如：
- `API-MAP-VERIFICATION-REPORT-20260312.md`
- `API-MAP-VERIFICATION-REPORT-20260311.md`

**存放路径**：`docs/api-map/{模块名}/`

**Report ONLY runtime-verified findings**:

```markdown
## API Path Verification Report

### Summary
- Total Paths Tested: 45
- Working (2xx/4xx auth): 38 (84%)
- Path Mismatches (404, alternative works): 5 (11%)
- Missing (404, no alternative): 2 (5%)

### Confirmed Path Mismatches
| Frontend Path | HTTP Status | Working Alternative | Issue |
|--------------|-------------|---------------------|-------|
| /api/pc/carpool/calculate-driving-time | 404 | /api/pc/carpool-calculate/calculate-driving-time | Wrong mount point |
| /api/pc/carpool/routes/1/calculate-times | 404 | /api/pc/carpool-calculate/routes/1/calculate-times | Wrong mount point |

### Confirmed Missing Paths
| Frontend Path | HTTP Status | Note |
|--------------|-------------|------|
| /api/pc/auth/verify | 404 | PC auth module has no verify endpoint |

### Paths That Work (Including Those Static Analysis Might Flag)
| Path | HTTP Status | Note |
|------|-------------|------|
| /api/pc/config/home_full_config | 200 | Static analysis might flag as "nested vs flat", but works |
| /api/pc/config/home_banners | 200 | Works via Express route params |

### False Positives Avoided
The following were flagged by static analysis but runtime verification shows they work:
- `/api/pc/config/*` - All work correctly despite "flat vs nested" code structure
```

---

## Common Patterns & Solutions

### Pattern 1: Route Param Handling

**Issue**: Static analysis flags `/config/:key` as not matching `/config/home_full_config`

**Reality Check**:
```bash
curl /api/pc/config/home_full_config
# → 200 OK
```

**Conclusion**: Express route params make this work. Not a real issue.

---

### Pattern 2: Mount Point Mismatch

**Issue**: Frontend uses `/carpool/*`, backend mounts at `/carpool-calculate/*`

**Verification**:
```bash
curl /api/pc/carpool/calculate-driving-time
# → 404

curl /api/pc/carpool-calculate/calculate-driving-time
# → 200 (or 401)
```

**Conclusion**: Confirmed mismatch. Frontend should use `carpool-calculate`.

---

### Pattern 3: Missing Endpoint

**Issue**: Frontend calls `/pc/auth/verify` but backend PC auth has no verify route

**Verification**:
```bash
curl -X POST /api/pc/auth/verify
# → 404

grep "verify" apps/backend/src/routes/pc/auth.js
# → No results

grep "verify" apps/backend/src/routes/mobile/auth.js
# → router.post('/verify', ...)
```

**Conclusion**: PC auth module missing verify endpoint. Exists only in mobile.

---

## Best Practices

1. **Always curl before concluding** - Never report a path issue without HTTP verification
2. **Generate alternatives from code** - When 404, use code analysis to find working paths
3. **Distinguish auth errors from missing routes** - 401 means path exists, 404 means it doesn't
4. **Document false positives** - Note when static analysis was wrong
5. **Test with and without auth** - Some paths return 401 (exist) vs 404 (don't exist)

---

## Remember

**Runtime Response > Static Analysis**

```
Static analysis: "This looks wrong"
       ↓
Runtime test: "curl → 200"
       ↓
Conclusion: "Static analysis was wrong, path works"
```

**The only reliable way to verify an API path is to send a request and check the response.**

---

## Complete Testing Workflow Example

### Example: Testing POST /api/pc/articles

```bash
# Step 1: Initial test without parameters
curl -X POST http://192.168.31.188/api/pc/articles \
  -H "Authorization: Bearer $TOKEN"
# → 400 {"code":400,"message":"请输入资讯标题"}

# Step 2: Analyze - missing title parameter
# Check backend code for required fields
grep -A 30 "router.post.*'/'." apps/backend/src/routes/pc/article.js
# → Required: title, category_id

# Step 3: Get valid category_id from database
mysql -e "SELECT id, name FROM ArticleCategory LIMIT 1;"
# → id: 1

# Step 4: Retest with complete parameters
curl -X POST http://192.168.31.188/api/pc/articles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试文章","category_id":1,"content":"文章内容"}'
# → 200 {"code":200,"data":{"id":99,...}}

# Step 5: Conclusion
# Path: ✅ Correct (returns 200 with right params)
# Issue: Frontend may not be sending required parameters
```

### Example: Testing GET /api/pc/articles/1

```bash
# Step 1: Initial test with ID=1
curl http://192.168.31.188/api/pc/articles/1 \
  -H "Authorization: Bearer $TOKEN"
# → 500 {"code":500,"message":"资讯不存在"}

# Step 2: Analyze - ID=1 not found in database
# Get list of actual article IDs
curl http://192.168.31.188/api/pc/articles?page=1&size=5 \
  -H "Authorization: Bearer $TOKEN"
# → {"data":{"list":[{"id":7,...},{"id":2,...}]}}

# Step 3: Retest with real ID
curl http://192.168.31.188/api/pc/articles/7 \
  -H "Authorization: Bearer $TOKEN"
# → 200 {"code":200,"data":{"id":7,...}}

# Step 4: Conclusion
# Path: ✅ Correct
# Issue: Test used non-existent ID, real ID works fine
```

### Example: Testing Persistent 500 Error

```bash
# Step 1: Test POST /api/pc/cancel-reasons
curl -X POST http://192.168.31.188/api/pc/cancel-reasons \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason":"测试","type":"user"}'
# → 500 Prisma error

# Step 2: Check Prisma model vs database
grep -A 10 "model CancelReason" apps/backend/prisma/schema.prisma
# → type: CancelReasonType

mysql -e "DESCRIBE CancelReason;"
# → type: VARCHAR(255) - TYPE MISMATCH!

# Step 3: Conclusion
# Path: ✅ Correct
# Issue: 💥 Database schema mismatch - needs migration
```

---

## Quick Reference

### Essential Commands

```bash
# Test a single path
curl -s http://192.168.31.188/api/pc/config/home_full_config

# Test with auth header
curl -s -H "Authorization: Bearer <token>" \
  http://192.168.31.188/api/pc/carpool-calculate/calculate-driving-time

# Check backend mount points
grep "router.use" apps/backend/src/routes/pc/index.js

# Find route definitions
grep -r "router.get\|router.post" apps/backend/src/routes/pc/

# Query database for test data
mysql -h <host> -u <user> -p<pass> <db> -e "SELECT id, name FROM Table LIMIT 3;"

# Check Prisma model
grep -A 10 "model ModelName" apps/backend/prisma/schema.prisma


---

## Execution Checklist - 执行检查清单

### 执行前确认

使用此清单确保每次执行都符合技能要求：

| 检查项 | 要求 | 状态 |
|--------|------|:----:|
| **测试范围** | 必须测试**所有**收集到的 API，禁止抽样 | ☐ |
| **并发策略** | API > 50 个时，必须使用并发/分批处理 | ☐ |
| **输出文件** | 使用统一命名：`API-MAP-VERIFICATION-REPORT-{YYYYMMDD}.md` | ☐ |
| **存放路径** | `docs/api-map/{模块名}/` | ☐ |
| **测试深度** | 必须进行深度分析，不只是简单 curl | ☐ |

### 执行流程确认

```
Step 1: Discover → ☐ 识别项目结构
Step 2: Collect → ☐ 收集所有 API 路径（记录总数）
Step 3: Runtime Verify → ☐ 批量测试所有 API
Step 4: Deep Analysis → ☐ 对异常结果深度分析
Step 5: Find Alternatives → ☐ 对 404 查找替代路径
Step 6: Report → ☐ 生成报告（包含全部结果）
```

### 深度分析强制步骤

对于每个异常结果，必须执行：

#### 400 错误分析流程
```
1. ☐ 读取错误消息
2. ☐ 检查后端代码找出必需参数
3. ☐ 查询数据库获取有效参数值
4. ☐ 使用正确参数重试
5. ☐ 确认是"路径正确"还是"真正错误"
```

#### 404 错误分析流程
```
1. ☐ 检查 ID 是否真实存在（调用列表 API 获取真实 ID）
2. ☐ 使用真实 ID 重试
3. ☐ 如果仍 404，检查后端路由挂载点
4. ☐ 生成替代路径并测试
5. ☐ 区分"ID 不存在" vs "路径真正缺失"
```

#### 500 错误分析流程
```
1. ☐ 检查后端代码
2. ☐ 检查 Prisma Schema vs 实际表结构
3. ☐ 确定具体错误原因
4. ☐ 给出明确的修复建议
```

### 自测问题（执行时不断问自己）

1. ☐ **我是否测试了所有收集到的 API？**（不是抽样）
2. ☐ **我是否使用了并发/分批处理来提高效率？**（API > 50 时）
3. ☐ **我是否对每个异常结果进行了深度分析？**
4. ☐ **我是否区分了"参数问题"和"路径问题"？**
5. ☐ **我是否使用真实数据重试了 404 错误？**
6. ☐ **我的报告文件名是否符合规范？**
7. ☐ **我的报告数据是否与测试结果一致？**
8. ☐ **我的报告中是否有具体的修复建议？**

---

## Report Template - 报告模板

扫描报告必须包含以下章节：

```markdown
# {模块名} API Map 运行时验证报告

**扫描时间**: YYYY-MM-DD
**测试服务器**: http://xxx.xxx.xxx.xxx
**扫描方式**: 运行时验证 + 深度分析
**API 总数**: {总数} 个
**实际测试**: {测试数}/{总数} 个

---

## 执行摘要

| 指标 | 数值 | 占比 |
|------|------|:----:|
| API 总数 | {总数} | 100% |
| 路径正确 (200) | {数量} | {占比} |
| 路径正确但需参数 (400) | {数量} | {占比} |
| 路径缺失 (404) | {数量} | {占比} |
| 后端错误 (500) | {数量} | {占比} |
| 路径不匹配 | {数量} | {占比} |

---

## 详细测试结果

### 1. 完全正常的 API (200) ✅

| 方法 | 路径 | 备注 |
|------|------|------|
| GET | /api/xxx | 说明 |

### 2. 路径正确但需参数 (400) ⚠️

| 方法 | 路径 | 错误消息 | 修复后状态 |
|------|------|---------|-----------|
| POST | /api/xxx | 缺少参数 | ✅ 200 |

**深度分析**:
- 原始响应: 400 "xxx"
- 分析过程: xxx
- 重试结果: 200
- 结论: 路径正确

### 3. 路径缺失 (404) ❌

| 方法 | 路径 | 分析 |
|------|------|------|
| GET | /api/xxx | 后端未实现 |

### 4. 后端错误 (500) 🔴

| 方法 | 路径 | 错误原因 | 修复方案 |
|------|------|---------|---------|
| GET | /api/xxx | Schema 不匹配 | 添加 xxx 字段 |

**详细分析**:
- 后端代码: xxx
- Prisma Schema: xxx
- 错误原因: xxx
- 修复建议: xxx

### 5. 路径不匹配 ⚠️

| 前端路径 | 正确路径 | 问题 |
|---------|---------|------|
| /api/wrong | /api/correct | 挂载点错误 |

---

## 修复清单

### 🔴 高优先级
1. **修复 xxx**
   - 文件: `xxx`
   - 修改: xxx

### 🟡 中优先级
2. **添加 xxx 路由**
   - 路径: xxx

### 🟢 低优先级
3. **xxx**

---

## 总结

### 关键发现
1. xxx
2. xxx

### 与上次扫描对比
| 指标 | 上次 | 本次 | 说明 |
|------|------|------|------|
| 路径正确 | x% | y% | 说明 |

---

*本报告基于 {总数} 个 API 的完整运行时验证生成*
```

---

## Data Consistency Requirements - 数据一致性要求

### 禁止的行为

```
❌ 1. 报告数据与实际测试不符
   错误: "测试了 80 个 API"
   实际: 只测试了 53 个

❌ 2. 估算代替实际计数
   错误: "约 80% 正常"
   正确: "60/80 (75%) 正常"

❌ 3. 抽样却声称完整
   错误: "测试了关键 API"
   正确: "测试了全部 147 个 API"

❌ 4. 忽略未测试的 API
   错误: 只报告测试过的，忽略其他
   正确: 明确标注每个 API 的状态
```

### 必须的行为

```
✅ 1. 报告中的 API 数量 = 实际收集的 API 数量
✅ 2. 报告中的分类统计 = 实际测试结果统计
✅ 3. 报告中的每个 API 都有对应的测试结果
✅ 4. 明确说明测试覆盖范围（全部/部分）
```

---

## Subagent Task Template - 任务分派模板

当使用 subagent 执行任务时，使用以下模板确保执行质量：

### 收集 API 路径任务

```
任务: 收集前端 API 路径

项目路径: {project_path}
前端目录: {api_directory}

要求:
1. 读取所有 .js 文件
2. 从 request.get/post/put/delete 中提取 API 路径
3. 记录方法、路径、来源文件
4. 模板字符串变量（如 ${id}）替换为 :id 占位符
5. 返回完整的 JSON 格式 API 列表

输出格式:
{
  "total": 147,
  "apis": [
    {"method": "GET", "path": "/api/xxx", "source": "xxx.js"}
  ]
}

重要: 必须收集所有 API，不能遗漏
```

### 测试 API 任务（批量并行执行）

```
任务: 测试 API 路径（批量并行）

测试服务器: {base_url}
认证 Token: {token}

待测试 API 列表:
1. GET /api/xxx
2. POST /api/xxx
...

总数量: {total_count}
批次: 第 {batch_num}/{total_batches} 批

执行方式:
1. 使用并行方式同时测试多个 API（每批 20-30 个）
2. 或者使用脚本批量测试（如 shell 循环 + & wait）
3. 必须测试列表中的所有 API，不能遗漏

测试要求:
1. 对每个 API 执行 curl 测试
2. 记录 HTTP 状态码和响应
3. 对于 400 错误，读取错误消息
4. 对于 404 错误，注意区分"ID 不存在"和"路径缺失"
5. 对于 500 错误，记录错误详情

输出格式:
| 方法 | 路径 | 状态码 | 结果 | 备注 |
|-----|------|-------|------|------|
| GET | /api/xxx | 200 | ✅ | 正常 |
| POST | /api/xxx | 400 | ⚠️ | 需参数: title |

返回: 完整的测试结果表格

重要: 
- 必须测试本批列表中的所有 API
- 使用并行方式提高效率
- 返回格式必须是可解析的表格
```

### 深度分析任务

```
任务: 深度分析异常 API

异常 API:
- POST /api/xxx → 400 "请输入标题"
- GET /api/xxx/1 → 404
- POST /api/xxx → 500

项目路径: {project_path}
后端目录: {routes_directory}
数据库: 可通过 mysql 命令访问

要求:
1. 对于 400 错误:
   - 读取后端代码找出必需参数
   - 查询数据库获取有效参数值
   - 使用正确参数重试
   - 确认是路径正确还是真正错误

2. 对于 404 错误:
   - 调用列表 API 获取真实 ID
   - 使用真实 ID 重试
   - 如果仍 404，检查后端挂载点
   - 生成替代路径并测试

3. 对于 500 错误:
   - 检查后端代码
   - 检查 Prisma Schema
   - 确定具体错误原因

输出格式:
对每个 API 输出:
- 原始状态: xxx
- 分析过程: xxx
- 重试结果: xxx
- 最终结论: 路径正确/路径缺失/后端错误
- 修复建议: xxx
```

---

## Common Pitfalls - 常见陷阱

### 陷阱 1：抽样测试
```
问题: "我只测试关键 API，其他应该也一样"
后果: 遗漏真正的问题，报告不准确
避免: 必须测试所有 API
```

### 陷阱 2：简单 curl
```
问题: "我测试了，返回 400，所以是错的"
后果: 把参数问题误认为路径问题
避免: 深度分析 400 错误，使用正确参数重试
```

### 陷阱 3：忽略 ID 不存在
```
问题: "ID=1 返回 404，所以路径缺失"
后果: 把数据问题误认为路由问题
避免: 获取真实 ID 重试，确认路径是否存在
```

### 陷阱 4：估算数据
```
问题: "大约 80% 是正常的"
后果: 报告数据不准确，无法追踪
避免: 精确计数，报告中显示具体数字
```

### 陷阱 5：报告与测试不符
```
问题: 报告说"测试了 80 个"，实际只测试了 50 个
后果: 失去可信度
避免: 报告数据必须与测试结果完全一致
```

---

## Best Practices Summary

1. **Always test all APIs** - 测试所有收集到的 API
2. **Use concurrency for large sets** - API > 50 时使用并发/分批处理
3. **Never estimate** - 使用精确数字，不要估算
4. **Always analyze errors** - 对异常结果进行深度分析
5. **Always retry with correct data** - 使用正确参数/真实 ID 重试
6. **Always document the process** - 记录分析过程，不只是结果
7. **Always use consistent naming** - 使用统一的文件命名规范
8. **Always verify data consistency** - 确保报告数据与测试结果一致
9. **Always parallelize when possible** - 测试和分析阶段都可以并行化
