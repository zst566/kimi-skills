#!/usr/bin/env node
/**
 * 代码复杂度扫描器
 * 分析 JavaScript/TypeScript 文件复杂度，识别需要拆分的代码
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    path: '.',
    threshold: 300,
    format: 'table',
    extensions: ['.js', '.ts'],
    ignore: ['node_modules', 'dist', 'build', '.git']
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--path':
      case '-p':
        options.path = args[++i];
        break;
      case '--threshold':
      case '-t':
        options.threshold = parseInt(args[++i]);
        break;
      case '--format':
      case '-f':
        options.format = args[++i];
        break;
      case '--ext':
      case '-e':
        options.extensions = args[++i].split(',');
        break;
      case '--ignore':
      case '-i':
        options.ignore = args[++i].split(',');
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
    }
  }

  return options;
}

function showHelp() {
  console.log(`
代码复杂度扫描器

用法: node complexity-scanner.js [选项]

选项:
  -p, --path <路径>       扫描路径 (默认: .)
  -t, --threshold <行数>  复杂度阈值，超过则标记 (默认: 300)
  -f, --format <格式>     输出格式: table, json, csv (默认: table)
  -e, --ext <扩展名>      文件扩展名，逗号分隔 (默认: .js,.ts)
  -i, --ignore <目录>     忽略的目录，逗号分隔
  -h, --help              显示帮助

示例:
  node complexity-scanner.js --path apps/backend/src --threshold 200
  node complexity-scanner.js -p src -t 150 -f json
`);
}

// 递归获取文件列表
function getFiles(dir, extensions, ignore, files = []) {
  if (!fs.existsSync(dir)) return files;

  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    if (extensions.some(ext => dir.endsWith(ext))) {
      files.push(dir);
    }
    return files;
  }

  if (ignore.some(ig => dir.includes(ig))) return files;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    getFiles(path.join(dir, item), extensions, ignore, files);
  }

  return files;
}

// 分析文件复杂度
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const totalLines = lines.length;

  // 统计空行和注释行
  let emptyLines = 0;
  let commentLines = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      emptyLines++;
    } else if (trimmed.startsWith('/*')) {
      inBlockComment = true;
      commentLines++;
    } else if (trimmed.includes('*/')) {
      inBlockComment = false;
      commentLines++;
    } else if (inBlockComment || trimmed.startsWith('//')) {
      commentLines++;
    }
  }

  const codeLines = totalLines - emptyLines - commentLines;

  // 统计函数定义
  const functionPatterns = [
    /function\s+\w+\s*\(/g,
    /const\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>/g,
    /\w+\s*:\s*(async\s*)?function/g,
    /router\.(get|post|put|delete|patch)\s*\(/g,
    /export\s+(async\s+)?function/g
  ];

  let functionCount = 0;
  for (const pattern of functionPatterns) {
    const matches = content.match(pattern);
    if (matches) functionCount += matches.length;
  }

  // 计算圈复杂度（简化版）
  const complexityPatterns = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bswitch\b/g,
    /\bcase\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\b&&\b/g,
    /\|\|/g,
    /\?\?/g,
    /\?\s*[^:]*\s*:/g  // 三元运算符
  ];

  let cyclomaticComplexity = 1;
  for (const pattern of complexityPatterns) {
    const matches = content.match(pattern);
    if (matches) cyclomaticComplexity += matches.length;
  }

  // 计算最大嵌套深度
  let maxDepth = 0;
  let currentDepth = 0;
  for (const line of lines) {
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    currentDepth += openBraces - closeBraces;
    maxDepth = Math.max(maxDepth, currentDepth);
  }

  // 检测拆分建议
  const suggestions = [];
  if (totalLines > 500) suggestions.push('文件过大，建议按功能拆分');
  if (functionCount > 20) suggestions.push('函数过多，建议模块化');
  if (cyclomaticComplexity > 50) suggestions.push('圈复杂度高，建议简化逻辑');
  if (maxDepth > 5) suggestions.push('嵌套过深，建议提取函数');

  return {
    file: filePath,
    totalLines,
    codeLines,
    emptyLines,
    commentLines,
    functionCount,
    cyclomaticComplexity,
    maxDepth,
    complexity: calculateComplexityScore(totalLines, functionCount, cyclomaticComplexity, maxDepth),
    suggestions
  };
}

// 计算综合复杂度分数
function calculateComplexityScore(lines, functions, cyclomatic, depth) {
  const lineScore = Math.min(lines / 10, 50);
  const funcScore = functions * 2;
  const cycloScore = cyclomatic;
  const depthScore = depth * 5;
  return Math.round(lineScore + funcScore + cycloScore + depthScore);
}

// 获取复杂度等级
function getComplexityLevel(score, lines) {
  if (score > 200 || lines > 500) return { level: 'HIGH', color: 'red' };
  if (score > 100 || lines > 300) return { level: 'MEDIUM', color: 'yellow' };
  return { level: 'LOW', color: 'green' };
}

// 输出表格格式
function outputTable(results, threshold) {
  log('\n📊 代码复杂度扫描结果\n', 'cyan');

  const filtered = results.filter(r => r.totalLines >= threshold);

  if (filtered.length === 0) {
    log(`未找到超过 ${threshold} 行的文件`, 'green');
    return;
  }

  // 表头
  console.log('─'.repeat(120));
  console.log(
    `${'文件路径'.padEnd(40)} ` +
    `${'总行'.padStart(6)} ` +
    `${'代码'.padStart(6)} ` +
    `${'函数'.padStart(5)} ` +
    `${'圈复杂度'.padStart(8)} ` +
    `${'嵌套深度'.padStart(8)} ` +
    `${'分数'.padStart(6)} ` +
    `${'等级'.padStart(8)} `
  );
  console.log('─'.repeat(120));

  // 排序并显示
  filtered
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 50)  // 只显示前50个
    .forEach(r => {
      const { level, color } = getComplexityLevel(r.complexity, r.totalLines);
      const relativePath = r.file.replace(process.cwd() + '/', '');
      console.log(
        `${relativePath.slice(-40).padStart(40)} ` +
        `${String(r.totalLines).padStart(6)} ` +
        `${String(r.codeLines).padStart(6)} ` +
        `${String(r.functionCount).padStart(5)} ` +
        `${String(r.cyclomaticComplexity).padStart(8)} ` +
        `${String(r.maxDepth).padStart(8)} ` +
        `${String(r.complexity).padStart(6)} ` +
        `${colors[color]}${level.padStart(8)}${colors.reset}`
      );
    });

  console.log('─'.repeat(120));

  // 统计
  const high = filtered.filter(r => getComplexityLevel(r.complexity, r.totalLines).level === 'HIGH').length;
  const medium = filtered.filter(r => getComplexityLevel(r.complexity, r.totalLines).level === 'MEDIUM').length;

  log(`\n总计: ${filtered.length} 个文件`, 'cyan');
  log(`高风险: ${high} 个`, 'red');
  log(`中风险: ${medium} 个`, 'yellow');

  // 显示拆分建议
  log('\n🔧 拆分建议:', 'cyan');
  filtered
    .filter(r => r.suggestions.length > 0)
    .slice(0, 10)
    .forEach(r => {
      const relativePath = r.file.replace(process.cwd() + '/', '');
      log(`\n${relativePath}:`, 'yellow');
      r.suggestions.forEach(s => console.log(`  • ${s}`));
    });
}

// 输出 JSON 格式
function outputJSON(results, threshold) {
  const filtered = results.filter(r => r.totalLines >= threshold);
  console.log(JSON.stringify(filtered, null, 2));
}

// 输出 CSV 格式
function outputCSV(results, threshold) {
  const filtered = results.filter(r => r.totalLines >= threshold);
  console.log('file,totalLines,codeLines,functionCount,cyclomaticComplexity,maxDepth,complexity');
  filtered.forEach(r => {
    console.log(`${r.file},${r.totalLines},${r.codeLines},${r.functionCount},${r.cyclomaticComplexity},${r.maxDepth},${r.complexity}`);
  });
}

// 主函数
function main() {
  const options = parseArgs();

  log(`🔍 扫描路径: ${options.path}`, 'cyan');
  log(`📏 阈值: ${options.threshold} 行\n`, 'cyan');

  const files = getFiles(options.path, options.extensions, options.ignore);
  log(`📁 找到 ${files.length} 个文件`, 'gray');

  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (i % 50 === 0) {
      process.stdout.write(`\r📊 分析中: ${i + 1}/${files.length}`);
    }
    try {
      const analysis = analyzeFile(file);
      results.push(analysis);
    } catch (err) {
      // 忽略无法解析的文件
    }
  }
  process.stdout.write(`\r📊 分析完成: ${files.length}/${files.length}\n`);

  switch (options.format) {
    case 'json':
      outputJSON(results, options.threshold);
      break;
    case 'csv':
      outputCSV(results, options.threshold);
      break;
    case 'table':
    default:
      outputTable(results, options.threshold);
      break;
  }
}

main();
