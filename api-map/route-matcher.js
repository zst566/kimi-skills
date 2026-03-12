/**
 * 路由匹配检测器
 * 对比前端期望的 API 路径与后端实际注册的路径
 */

const fs = require('fs')
const path = require('path')
const { getAllAvailableEndpoints } = require('./backend-route-scanner')

/**
 * 检测路径匹配问题
 * @param {Array} frontendAPIs - 前端扫描到的 API 列表
 * @param {string} backendDir - 后端代码目录
 * @returns {Object} 匹配检测结果
 */
async function detectRouteMismatches(frontendAPIs, backendDir) {
  console.log('[RouteMatcher] 开始检测路由匹配...')
  
  // 1. 扫描后端实际注册的路由
  const backendEndpoints = getAllAvailableEndpoints(backendDir)
  console.log(`[RouteMatcher] 后端路由: ${backendEndpoints.length} 个`)
  console.log(`[RouteMatcher] 前端 API: ${frontendAPIs.length} 个`)
  
  // 2. 构建后端路由查找表（支持模糊匹配）
  const backendRouteMap = buildRouteMap(backendEndpoints)
  
  // 3. 逐个检查前端 API
  const results = {
    matched: [],
    mismatched: [],
    notFound: [],
    suggestions: []
  }
  
  for (const api of frontendAPIs) {
    const frontendPath = api.endpoint
    const method = api.method || 'GET'
    
    // 标准化路径
    const normalizedPath = normalizePath(frontendPath)
    
    // 查找匹配的后端路由
    const match = findBestMatch(normalizedPath, method, backendRouteMap)
    
    if (match.exact) {
      results.matched.push({
        frontend: api,
        backend: match.endpoint,
        matchType: 'exact'
      })
    } else if (match.similar) {
      results.mismatched.push({
        frontend: api,
        expected: normalizedPath,
        actual: match.endpoint?.fullPath || null,
        similarity: match.similarity,
        reason: match.reason,
        suggestion: match.suggestion
      })
    } else {
      results.notFound.push({
        frontend: api,
        expected: normalizedPath,
        reason: '未找到匹配的后端路由'
      })
    }
  }
  
  // 4. 生成修复建议
  results.suggestions = generateFixSuggestions(results.mismatched)
  
  return results
}

/**
 * 构建后端路由查找表
 * @param {Array} endpoints - 后端端点列表
 * @returns {Object} 查找表
 */
function buildRouteMap(endpoints) {
  const map = {
    byExactPath: new Map(),
    byPathPattern: new Map(),
    all: endpoints
  }
  
  for (const ep of endpoints) {
    const key = `${ep.method} ${ep.fullPath}`
    map.byExactPath.set(key, ep)
    
    // 构建路径模式（统一参数格式）
    const pattern = pathToPattern(ep.fullPath)
    const patternKey = `${ep.method} ${pattern}`
    
    if (!map.byPathPattern.has(patternKey)) {
      map.byPathPattern.set(patternKey, [])
    }
    map.byPathPattern.get(patternKey).push(ep)
  }
  
  return map
}

/**
 * 标准化路径
 * @param {string} path - 路径
 * @returns {string} 标准化后的路径
 */
function normalizePath(path) {
  // 确保以 / 开头
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  // 移除末尾的 /
  path = path.replace(/\/$/, '')
  // 确保以 /api 开头
  if (!path.startsWith('/api/')) {
    path = '/api' + path
  }
  return path
}

/**
 * 将路径转换为模式（用于匹配）
 * @param {string} path - 路径
 * @returns {string} 路径模式
 */
function pathToPattern(path) {
  // 将前端模板变量 ${xxx} 和后端参数 :xxx 统一为占位符
  return path
    .replace(/\$\{(\w+)\}/g, ':$1')  // ${id} -> :id
    .replace(/:(\w+)/g, ':param')     // :id, :type -> :param
}

/**
 * 查找最佳匹配
 * @param {string} frontendPath - 前端路径
 * @param {string} method - HTTP 方法
 * @param {Object} backendMap - 后端路由表
 * @returns {Object} 匹配结果
 */
function findBestMatch(frontendPath, method, backendMap) {
  const exactKey = `${method} ${frontendPath}`
  
  // 1. 精确匹配
  if (backendMap.byExactPath.has(exactKey)) {
    return {
      exact: true,
      endpoint: backendMap.byExactPath.get(exactKey)
    }
  }
  
  // 2. 模式匹配（统一参数格式后匹配）
  const frontendPattern = pathToPattern(frontendPath)
  const patternKey = `${method} ${frontendPattern}`
  
  if (backendMap.byPathPattern.has(patternKey)) {
    const matches = backendMap.byPathPattern.get(patternKey)
    return {
      exact: true,  // 参数模式匹配视为完全匹配
      endpoint: matches[0],
      reason: '参数模式匹配',
      suggestion: null
    }
  }
  
  // 3. 路径层级不匹配检测（如 /ticket-types vs /ticket/ticket-types）
  for (const ep of backendMap.all) {
    // 检查是否是层级嵌套问题
    const nestedCheck = checkNestedMismatch(frontendPath, ep.fullPath)
    if (nestedCheck.isMismatch) {
      return {
        exact: false,
        similar: true,
        similarity: nestedCheck.similarity,
        endpoint: ep,
        reason: nestedCheck.reason,
        suggestion: nestedCheck.suggestion
      }
    }
  }
  
  // 4. 检查路径相似度（作为最后的备选）
  let bestMatch = null
  let bestSimilarity = 0
  
  for (const ep of backendMap.all) {
    const similarity = calculateSimilarity(frontendPath, ep.fullPath)
    if (similarity > bestSimilarity && similarity > 0.6) {
      bestSimilarity = similarity
      bestMatch = ep
    }
  }
  
  if (bestMatch) {
    return {
      exact: false,
      similar: true,
      similarity: bestSimilarity,
      endpoint: bestMatch,
      reason: '路径相似但结构不同',
      suggestion: `后端实际路径: ${bestMatch.fullPath}`
    }
  }
  
  return { exact: false, similar: false }
}

/**
 * 检查嵌套层级不匹配
 * @param {string} frontendPath - 前端路径
 * @param {string} backendPath - 后端路径
 * @returns {Object} 检查结果
 */
function checkNestedMismatch(frontendPath, backendPath) {
  const feParts = frontendPath.split('/').filter(Boolean)
  const beParts = backendPath.split('/').filter(Boolean)
  
  // 情况 1: 前端 /api/pc/ticket-types vs 后端 /api/pc/ticket/ticket-types
  // 说明前端期望扁平结构，但后端使用了嵌套
  if (beParts.length > feParts.length) {
    // 检查后端路径是否包含前端路径的所有部分
    const feSet = new Set(feParts)
    const beSet = new Set(beParts)
    
    let commonCount = 0
    for (const part of feParts) {
      if (beSet.has(part)) commonCount++
    }
    
    if (commonCount === feParts.length) {
      return {
        isMismatch: true,
        similarity: 0.9,
        reason: '路径嵌套层级不匹配: 前端期望扁平结构，后端使用了嵌套',
        suggestion: `需要在前端路由中独立挂载或修改后端路由结构。后端路径: ${backendPath}`
      }
    }
  }
  
  // 情况 2: 前端 /api/pc/ticket/ticket-types vs 后端 /api/pc/ticket-types
  // 说明后端使用了扁平结构，但前端期望了嵌套
  if (feParts.length > beParts.length) {
    const feSet = new Set(feParts)
    const beSet = new Set(beParts)
    
    let commonCount = 0
    for (const part of beParts) {
      if (feSet.has(part)) commonCount++
    }
    
    if (commonCount === beParts.length) {
      return {
        isMismatch: true,
        similarity: 0.85,
        reason: '路径嵌套层级不匹配: 后端使用扁平结构，前端期望了嵌套',
        suggestion: `前端应该使用路径: ${backendPath}`
      }
    }
  }
  
  return { isMismatch: false }
}

/**
 * 计算路径相似度
 * @param {string} path1 - 路径1
 * @param {string} path2 - 路径2
 * @returns {number} 相似度 (0-1)
 */
function calculateSimilarity(path1, path2) {
  const parts1 = path1.split('/').filter(Boolean)
  const parts2 = path2.split('/').filter(Boolean)
  
  const maxLen = Math.max(parts1.length, parts2.length)
  let matches = 0
  
  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    if (parts1[i] === parts2[i]) {
      matches++
    } else if (parts1[i].startsWith(':') || parts2[i].startsWith(':')) {
      matches += 0.5 // 参数占位符算半匹配
    }
  }
  
  return matches / maxLen
}

/**
 * 生成修复建议
 * @param {Array} mismatched - 不匹配项列表
 * @returns {Array} 修复建议列表
 */
function generateFixSuggestions(mismatched) {
  const suggestions = []
  
  for (const item of mismatched) {
    const fePath = item.expected
    const bePath = item.actual
    
    if (!bePath) continue
    
    // 检测是否是 /ticket/ticket-types 问题
    if (bePath.includes('/ticket/') && fePath === bePath.replace('/ticket/', '/')) {
      suggestions.push({
        type: 'route_mount',
        severity: 'error',
        problem: `前端请求 ${fePath} 但后端路由注册在 ${bePath}`,
        solution: `在 routes/pc/index.js 中添加独立挂载：`,
        code: `// 票根类型管理（独立挂载，前端直接访问 ${fePath}）
import ticketTypesRouter from './ticket/types.js'
router.use('${fePath.replace('/api/pc', '')}', ticketTypesRouter)`,
        files: ['apps/backend/src/routes/pc/index.js']
      })
    }
    
    // 其他匹配模式...
  }
  
  return suggestions
}

/**
 * 生成路由匹配报告
 * @param {Object} results - 匹配结果
 * @returns {string} Markdown 报告
 */
function generateMatchReport(results) {
  let report = `# 路由匹配检测报告\n\n`
  report += `生成时间: ${new Date().toLocaleString()}\n\n`
  
  // 统计
  const total = results.matched.length + results.mismatched.length + results.notFound.length
  const passRate = ((results.matched.length / total) * 100).toFixed(1)
  
  report += `## 统计概览\n\n`
  report += `- 总 API 数: ${total}\n`
  report += `- ✅ 匹配成功: ${results.matched.length} (${passRate}%)\n`
  report += `- ⚠️ 路径不匹配: ${results.mismatched.length}\n`
  report += `- ❌ 未找到路由: ${results.notFound.length}\n\n`
  
  // 不匹配详情
  if (results.mismatched.length > 0) {
    report += `## ⚠️ 路径不匹配问题\n\n`
    report += `| 前端期望路径 | 后端实际路径 | 原因 | 建议 |\n`
    report += `|-------------|-------------|------|------|\n`
    
    for (const item of results.mismatched) {
      const reason = item.reason?.replace(/\|/g, '\\|') || '-'
      const suggestion = item.suggestion?.replace(/\|/g, '\\|') || '-'
      report += `| ${item.expected} | ${item.actual || '-'} | ${reason} | ${suggestion} |\n`
    }
    report += `\n`
  }
  
  // 修复建议
  if (results.suggestions.length > 0) {
    report += `## 🔧 修复建议\n\n`
    
    for (let i = 0; i < results.suggestions.length; i++) {
      const s = results.suggestions[i]
      report += `### ${i + 1}. ${s.problem}\n\n`
      report += `- **类型**: ${s.type}\n`
      report += `- **严重程度**: ${s.severity}\n`
      report += `- **涉及文件**: ${s.files.join(', ')}\n\n`
      report += `**解决方案**:\n\n${s.solution}\n\n`
      report += `\`\`\`javascript\n${s.code}\n\`\`\`\n\n`
    }
  }
  
  return report
}

module.exports = {
  detectRouteMismatches,
  generateMatchReport,
  normalizePath,
  calculateSimilarity
}
