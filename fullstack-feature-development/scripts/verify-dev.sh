#!/bin/bash
# 开发验证脚本
# 检查常见开发问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASS++)) || true
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAIL++)) || true
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "========================================="
echo "开发验证脚本"
echo "========================================="
echo ""

# 检查点1: 路由注册
echo "【CP1】路由注册检查"
echo "----------------------------------------"
BACKEND_INDEX=""
# 尝试多个可能的后端入口文件
for path in "backend-node/src/index.js" "backend/src/index.js" "server/index.js" "backend-node/src/app.js" "backend/src/app.js"; do
    if [ -f "$path" ]; then
        BACKEND_INDEX="$path"
        break
    fi
done

if [ -n "$BACKEND_INDEX" ]; then
    check_pass "后端入口文件存在: $BACKEND_INDEX"
    # 列出已注册的路由
    grep -o "app.use('/api/[^']*" "$BACKEND_INDEX" 2>/dev/null | while read line; do
        echo "  📍 $line"
    done || true
else
    check_fail "未找到后端入口文件"
    echo "   查找路径: backend-node/src/{index,app}.js, backend/src/{index,app}.js, server/index.js"
fi
echo ""

# 检查点3: 数据库连接
echo "【CP3】数据库连接检查"
echo "----------------------------------------"
if [ -d "backend-node/src" ]; then
    if grep -r "getPool()" backend-node/src/ 2>/dev/null | grep -q "users"; then
        check_fail "发现 getPool() 查询 users 表，应该用 getAuthPool()"
    else
        check_pass "数据库连接使用正确"
    fi
else
    check_warn "未找到后端代码目录"
fi
echo ""

# 检查点4: 前端响应处理
echo "【CP4】前端响应处理检查"
echo "----------------------------------------"
if [ -d "frontend-pc/src/store" ]; then
    if grep -r "response.code === 200" frontend-pc/src/store/ 2>/dev/null; then
        check_fail "发现 store 中检查 response.code === 200"
        echo "   提示: api.js拦截器已经返回 response.data"
    else
        check_pass "store 响应处理正确"
    fi
else
    check_warn "未找到前端store目录"
fi
echo ""

# 检查前端入口
echo "【CP4】前端入口检查"
echo "----------------------------------------"
if [ -d "frontend-pc/src/views" ]; then
    VIEW_COUNT=$(find frontend-pc/src/views -name "*.vue" 2>/dev/null | wc -l)
    check_pass "发现 $VIEW_COUNT 个视图文件"
else
    check_warn "未找到前端视图目录"
fi
echo ""

# 总结
echo "========================================="
echo "验证结果: 通过 $PASS | 失败 $FAIL"
echo "========================================="

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 CP1-CP4 检查通过！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有 $FAIL 个检查项失败${NC}"
    exit 1
fi
