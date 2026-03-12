#!/bin/bash
#
# 通用 API 测试脚本 - 支持自动登录认证
# 用法: ./test-api.sh --endpoint <pc|mobile|merchant> --url <api-path> [选项]
#

set -e

# 默认配置
ENDPOINT=""
API_URL=""
METHOD="GET"
DATA=""
BASE_URL=""
TOKEN=""
USERNAME=""
PASSWORD=""
VERBOSE=false

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印用法
usage() {
    cat << EOF
通用 API 测试脚本 - 支持自动登录认证

用法:
    $0 --endpoint <pc|mobile|merchant> --url <api-path> [选项]

必需参数:
    -e, --endpoint <端点>     API 端点: pc, mobile, merchant, public
    -u, --url <路径>          API 路径 (如: /ticket-types)

可选参数:
    -m, --method <方法>       HTTP 方法: GET, POST, PUT, DELETE (默认: GET)
    -d, --data <JSON>         请求体 JSON 数据
    -b, --base-url <URL>      基础 URL (默认: 从环境或配置文件获取)
    -t, --token <TOKEN>       直接提供认证令牌
    -U, --username <用户名>   登录用户名
    -P, --password <密码>     登录密码
    -v, --verbose             显示详细输出
    -h, --help                显示此帮助

示例:
    # 测试 PC 端票根类型列表
    $0 --endpoint pc --url /ticket-types

    # 使用指定账号测试
    $0 --endpoint pc --url /ticket-types -U admin -P admin123

    # POST 请求创建数据
    $0 --endpoint pc --url /ticket-types -m POST -d '{"name":"测试","code":"test"}'

    # 使用已有 token 测试
    $0 --endpoint pc --url /tickets/review -t "eyJhbGciOiJIUzI1NiIs..."

EOF
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--endpoint)
            ENDPOINT="$2"
            shift 2
            ;;
        -u|--url)
            API_URL="$2"
            shift 2
            ;;
        -m|--method)
            METHOD="$2"
            shift 2
            ;;
        -d|--data)
            DATA="$2"
            shift 2
            ;;
        -b|--base-url)
            BASE_URL="$2"
            shift 2
            ;;
        -t|--token)
            TOKEN="$2"
            shift 2
            ;;
        -U|--username)
            USERNAME="$2"
            shift 2
            ;;
        -P|--password)
            PASSWORD="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}错误: 未知参数 $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# 验证必需参数
if [[ -z "$ENDPOINT" || -z "$API_URL" ]]; then
    echo -e "${RED}错误: --endpoint 和 --url 是必需参数${NC}"
    usage
    exit 1
fi

# 尝试从项目配置获取基础 URL
 detect_base_url() {
    # 1. 从环境变量获取
    if [[ -n "$API_BASE_URL" ]]; then
        echo "$API_BASE_URL"
        return
    fi

    # 2. 从 .env 文件获取
    if [[ -f ".env" ]]; then
        local url=$(grep -E "^(API_URL|BASE_URL|BACKEND_URL)=" .env | head -1 | cut -d'=' -f2 | tr -d '"')
        if [[ -n "$url" ]]; then
            echo "$url"
            return
        fi
    fi

    # 3. 从 AGENTS.md 获取
    if [[ -f "AGENTS.md" ]]; then
        local url=$(grep -E "http://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" AGENTS.md | head -1 | grep -oE "http://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+(:[0-9]+)?")
        if [[ -n "$url" ]]; then
            echo "$url"
            return
        fi
    fi

    # 4. 默认本地地址
    echo "http://localhost:3000"
}

# 设置基础 URL
if [[ -z "$BASE_URL" ]]; then
    BASE_URL=$(detect_base_url)
fi

# 构建完整 API URL
FULL_URL="${BASE_URL}/api/${ENDPOINT}${API_URL}"

# 日志输出
log() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${YELLOW}[INFO]${NC} $1"
    fi
}

log "基础 URL: $BASE_URL"
log "完整 URL: $FULL_URL"
log "HTTP 方法: $METHOD"

# 自动获取 Token
get_token() {
    # 如果已提供 token，直接使用
    if [[ -n "$TOKEN" ]]; then
        log "使用提供的 Token"
        return
    fi

    echo -e "${YELLOW}正在获取认证令牌...${NC}"

    # 根据端点确定登录接口和默认账号
    local login_url=""
    local login_data=""

    case "$ENDPOINT" in
        pc)
            login_url="${BASE_URL}/api/pc/auth/login"
            USERNAME="${USERNAME:-admin}"
            PASSWORD="${PASSWORD:-admin123}"
            login_data="{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}"
            ;;
        mobile)
            login_url="${BASE_URL}/api/mobile/auth/login"
            # 移动端可能需要手机号登录
            if [[ -n "$USERNAME" && -n "$PASSWORD" ]]; then
                login_data="{\"phone\":\"$USERNAME\",\"password\":\"$PASSWORD\"}"
            else
                echo -e "${RED}错误: 移动端登录需要提供手机号和密码${NC}"
                exit 1
            fi
            ;;
        merchant)
            login_url="${BASE_URL}/api/merchant/auth/login"
            USERNAME="${USERNAME:-merchant}"
            PASSWORD="${PASSWORD:-merchant123}"
            login_data="{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}"
            ;;
        public)
            # 公共接口不需要 token
            log "公共端点，跳过认证"
            return
            ;;
        *)
            echo -e "${RED}错误: 未知的端点类型: $ENDPOINT${NC}"
            exit 1
            ;;
    esac

    log "登录 URL: $login_url"
    log "登录用户: $USERNAME"

    # 执行登录请求
    local response=$(curl -s -w "\n%{http_code}" -X POST "$login_url" \
        -H "Content-Type: application/json" \
        -d "$login_data" 2>/dev/null || echo "{\"message\":\"请求失败\"}\n000")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    log "登录响应码: $http_code"
    log "登录响应: $body"

    # 从响应中提取 token
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [[ -z "$TOKEN" ]]; then
        # 尝试其他可能的字段名
        TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    fi

    if [[ -z "$TOKEN" ]]; then
        echo -e "${RED}错误: 无法获取认证令牌${NC}"
        echo "响应内容: $body"
        exit 1
    fi

    echo -e "${GREEN}成功获取 Token${NC}"
    log "Token: ${TOKEN:0:20}..."
}

# 执行 API 请求
call_api() {
    local curl_opts="-s -w \"\\n%{http_code}\""

    # 添加认证头
    if [[ -n "$TOKEN" ]]; then
        curl_opts="$curl_opts -H \"Authorization: Bearer $TOKEN\""
    fi

    # 添加方法和数据
    if [[ "$METHOD" != "GET" ]]; then
        curl_opts="$curl_opts -X $METHOD"
    fi

    if [[ -n "$DATA" ]]; then
        curl_opts="$curl_opts -H \"Content-Type: application/json\" -d '$DATA'"
    fi

    log "执行请求: curl $curl_opts \"$FULL_URL\""

    # 执行请求
    local response
    if [[ -n "$TOKEN" ]]; then
        if [[ -n "$DATA" ]]; then
            response=$(curl -s -w "\n%{http_code}" -X "$METHOD" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d "$DATA" "$FULL_URL" 2>/dev/null || echo "\n000")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$METHOD" \
                -H "Authorization: Bearer $TOKEN" \
                "$FULL_URL" 2>/dev/null || echo "\n000")
        fi
    else
        if [[ -n "$DATA" ]]; then
            response=$(curl -s -w "\n%{http_code}" -X "$METHOD" \
                -H "Content-Type: application/json" \
                -d "$DATA" "$FULL_URL" 2>/dev/null || echo "\n000")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$METHOD" \
                "$FULL_URL" 2>/dev/null || echo "\n000")
        fi
    fi

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    echo ""
    echo "=========================================="
    echo -e "${YELLOW}请求信息:${NC}"
    echo "  URL: $FULL_URL"
    echo "  方法: $METHOD"
    echo "  认证: $([[ -n "$TOKEN" ]] && echo "Bearer Token" || echo "无")"
    echo ""
    echo -e "${YELLOW}响应信息:${NC}"
    echo "  HTTP 状态码: $http_code"
    echo ""
    echo -e "${YELLOW}响应体:${NC}"

    # 格式化 JSON 输出
    if command -v python3 &> /dev/null; then
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    elif command -v jq &> /dev/null; then
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        echo "$body"
    fi

    echo "=========================================="

    # 判断结果
    if [[ "$http_code" =~ ^2 ]]; then
        echo -e "${GREEN}✓ 请求成功${NC}"

        # 检查业务状态码
        local code=$(echo "$body" | grep -o '"code":[0-9]*' | cut -d':' -f2)
        if [[ -n "$code" && "$code" != "0" && "$code" != "200" ]]; then
            echo -e "${YELLOW}⚠ 业务状态码非成功: $code${NC}"
        fi
    elif [[ "$http_code" == "401" ]]; then
        echo -e "${RED}✗ 认证失败 (401)${NC}"
        echo "  可能原因: Token 无效或已过期"
    elif [[ "$http_code" == "403" ]]; then
        echo -e "${RED}✗ 权限不足 (403)${NC}"
        echo "  可能原因: 用户权限不够"
    elif [[ "$http_code" == "404" ]]; then
        echo -e "${RED}✗ 接口不存在 (404)${NC}"
        echo "  请检查 URL 路径是否正确"
    elif [[ "$http_code" == "500" ]]; then
        echo -e "${RED}✗ 服务器错误 (500)${NC}"
        echo "  请检查后端日志"
    else
        echo -e "${RED}✗ 请求失败 (HTTP $http_code)${NC}"
    fi
}

# 主流程
main() {
    echo -e "${GREEN}API 测试工具${NC}"
    echo ""

    # 获取 token
    get_token

    # 执行 API 调用
    call_api
}

main
