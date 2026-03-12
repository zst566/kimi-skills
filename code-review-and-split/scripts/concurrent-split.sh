#!/bin/bash
#
# 并发代码拆分执行脚本
# 使用多个子代理并行拆分复杂代码文件
#

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    echo -e "${CYAN}[SPLIT]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 显示用法
usage() {
    cat << EOF
并发代码拆分执行脚本

用法:
    $0 --file <源文件> --plan <拆分方案文件> [选项]

必需参数:
    -f, --file <文件>         要拆分的源文件路径
    -p, --plan <文件>         拆分方案 JSON 文件

可选参数:
    -o, --output <目录>       输出目录 (默认: 源文件所在目录)
    -j, --jobs <数量>         并发任务数 (默认: 3)
    -d, --dry-run            模拟运行，不实际执行
    -h, --help               显示帮助

拆分方案 JSON 格式:
{
  "source": "apps/backend/src/routes/pc/ticket.js",
  "output_dir": "apps/backend/src/routes/pc/ticket",
  "modules": [
    {
      "id": "types",
      "name": "票根类型管理",
      "lines": [1, 110],
      "routes": ["/ticket-types"],
      "target": "types.js"
    },
    ...
  ]
}

EOF
}

# 解析参数
SOURCE_FILE=""
PLAN_FILE=""
OUTPUT_DIR=""
JOBS=3
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            SOURCE_FILE="$2"
            shift 2
            ;;
        -p|--plan)
            PLAN_FILE="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -j|--jobs)
            JOBS="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "未知参数: $1"
            usage
            exit 1
            ;;
    esac
done

# 验证必需参数
if [[ -z "$SOURCE_FILE" || -z "$PLAN_FILE" ]]; then
    error "缺少必需参数: --file 和 --plan"
    usage
    exit 1
fi

if [[ ! -f "$SOURCE_FILE" ]]; then
    error "源文件不存在: $SOURCE_FILE"
    exit 1
fi

if [[ ! -f "$PLAN_FILE" ]]; then
    error "拆分方案文件不存在: $PLAN_FILE"
    exit 1
fi

# 读取拆分方案
log "读取拆分方案: $PLAN_FILE"
MODULES=$(cat "$PLAN_FILE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('modules', [])))" 2>/dev/null || echo "[]")

if [[ "$MODULES" == "[]" ]]; then
    error "拆分方案文件格式错误或为空"
    exit 1
fi

# 设置输出目录
if [[ -z "$OUTPUT_DIR" ]]; then
    OUTPUT_DIR=$(python3 -c "import sys,json; d=json.load(open('$PLAN_FILE')); print(d.get('output_dir', ''))" 2>/dev/null)
fi

if [[ -z "$OUTPUT_DIR" ]]; then
    OUTPUT_DIR="$(dirname "$SOURCE_FILE")/$(basename "$SOURCE_FILE" .js)"
fi

log "源文件: $SOURCE_FILE"
log "输出目录: $OUTPUT_DIR"
log "并发任务数: $JOBS"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 模拟运行模式
if [[ "$DRY_RUN" == true ]]; then
    log "模拟运行模式 - 显示将要执行的任务"
    echo ""
    
    MODULE_COUNT=$(echo "$MODULES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
    log "将创建 $MODULE_COUNT 个任务模块:"
    
    echo "$MODULES" | python3 -c "
import sys, json
modules = json.load(sys.stdin)
for m in modules:
    print(f\"  • {m['id']}: 行 {m['lines'][0]}-{m['lines'][1]} -> {m['target']}\")
"
    exit 0
fi

# 生成任务执行脚本
TASK_DIR=$(mktemp -d)
log "创建临时任务目录: $TASK_DIR"

generate_task_script() {
    local module_id=$1
    local module_name=$2
    local start_line=$3
    local end_line=$4
    local target_file=$5
    local routes=$6
    
    cat > "$TASK_DIR/task_${module_id}.sh" << 'INNERSCRIPT'
#!/bin/bash
# 任务脚本: {MODULE_ID}
# 生成时间: $(date)

SOURCE_FILE="{SOURCE_FILE}"
TARGET_FILE="{OUTPUT_DIR}/{TARGET_FILE}"
START_LINE={START_LINE}
END_LINE={END_LINE}

echo "开始执行任务: {MODULE_NAME}"
echo "  源文件: $SOURCE_FILE"
echo "  目标文件: $TARGET_FILE"
echo "  代码范围: 行 $START_LINE - $END_LINE"

# 创建目标文件目录
mkdir -p "$(dirname "$TARGET_FILE")"

# 提取代码并创建新文件
cat > "$TARGET_FILE" << 'EOF'
// {TARGET_FILE}
// 功能: {MODULE_NAME}
// 从 {SOURCE_FILE} 拆分而来 (行 {START_LINE}-{END_LINE})

import express from 'express'
import { prisma } from '../../utils/prisma.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

// TODO: 将 {SOURCE_FILE} 行 {START_LINE}-{END_LINE} 的代码复制到这里
// 路由: {ROUTES}

export default router
EOF

echo "任务完成: {MODULE_ID}"
echo "输出文件: $TARGET_FILE"
INNERSCRIPT

    # 替换变量
    sed -i '' \
        -e "s|{SOURCE_FILE}|$SOURCE_FILE|g" \
        -e "s|{OUTPUT_DIR}|$OUTPUT_DIR|g" \
        -e "s|{MODULE_ID}|$module_id|g" \
        -e "s|{MODULE_NAME}|$module_name|g" \
        -e "s|{START_LINE}|$start_line|g" \
        -e "s|{END_LINE}|$end_line|g" \
        -e "s|{TARGET_FILE}|$target_file|g" \
        -e "s|{ROUTES}|$routes|g" \
        "$TASK_DIR/task_${module_id}.sh" 2>/dev/null || \
    sed -i \
        -e "s|{SOURCE_FILE}|$SOURCE_FILE|g" \
        -e "s|{OUTPUT_DIR}|$OUTPUT_DIR|g" \
        -e "s|{MODULE_ID}|$module_id|g" \
        -e "s|{MODULE_NAME}|$module_name|g" \
        -e "s|{START_LINE}|$start_line|g" \
        -e "s|{END_LINE}|$end_line|g" \
        -e "s|{TARGET_FILE}|$target_file|g" \
        -e "s|{ROUTES}|$routes|g" \
        "$TASK_DIR/task_${module_id}.sh"
    
    chmod +x "$TASK_DIR/task_${module_id}.sh"
}

# 为每个模块生成任务脚本
log "生成任务脚本..."
echo "$MODULES" | python3 -c "
import sys, json
modules = json.load(sys.stdin)
for m in modules:
    print(f\"{m['id']}|{m['name']}|{m['lines'][0]}|{m['lines'][1]}|{m['target']}|{','.join(m.get('routes', []))}\")
" | while IFS='|' read -r id name start end target routes; do
    generate_task_script "$id" "$name" "$start" "$end" "$target" "$routes"
    log "  生成任务: $id -> $target"
done

# 创建索引文件
create_index_file() {
    log "创建索引文件..."
    
    local index_file="$OUTPUT_DIR/index.js"
    
    cat > "$index_file" << EOF
// $index_file
// 自动生成的路由索引文件
// 从 $(basename "$SOURCE_FILE") 拆分而来

import express from 'express'

EOF

    # 添加导入语句
    echo "$MODULES" | python3 -c "
import sys, json
modules = json.load(sys.stdin)
for m in modules:
    print(f\"import {m['id']}Router from './{m['target'].replace('.js', '')}.js'\")
" >> "$index_file"

    cat >> "$index_file" << EOF

const router = express.Router()

// 挂载子路由
EOF

    # 添加路由挂载
    echo "$MODULES" | python3 -c "
import sys, json
modules = json.load(sys.stdin)
for m in modules:
    routes = m.get('routes', [])
    if routes:
        for r in routes:
            print(f\"router.use('{r}', {m['id']}Router)\")
" >> "$index_file"

    cat >> "$index_file" << EOF

export default router
EOF

    success "索引文件创建: $index_file"
}

# 串行执行任务（实际并发应由调用方使用 Task 工具实现）
log "执行任务..."
for task_script in "$TASK_DIR"/task_*.sh; do
    if [[ -f "$task_script" ]]; then
        log "执行: $(basename "$task_script")"
        bash "$task_script"
    fi
done

# 创建索引文件
create_index_file

# 清理临时文件
log "清理临时文件..."
rm -rf "$TASK_DIR"

# 输出总结
echo ""
success "拆分完成!"
log "输出目录: $OUTPUT_DIR"
log "生成的文件:"
ls -la "$OUTPUT_DIR"

echo ""
log "下一步:"
echo "  1. 检查生成的文件内容"
echo "  2. 从原文件复制对应代码到新文件"
echo "  3. 更新原文件的引用"
echo "  4. 运行测试验证功能"
