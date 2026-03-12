/**
 * 混合路由验证器
 * 结合静态分析和运行时探测，提供准确的路由匹配检测
 */

const { detectRouteMismatches } = require('./route-matcher')
const { detectRoutesRuntime } = require('./runtime-route-detector')

/**
 * 混合验证 - 先静态分析，再运行时确认
 * @param {Array} frontendAPIs - 前端API列表
 * @param {string} backendDir - 后端目录
 * @param {Object} runtimeConfig - 运行时配置 {baseURL, token}
 * @returns {Object} 验证结果
 */
async function hybridVerify(frontendAPIs, backendDir, runtimeConfig) {
  console.log('🔍 混合路由验证（静态分析 + 运行时探测）\n')
  console.log('=' .repeat(60))
  
  // 步骤1: 静态分析
  console.log('\n📋 步骤1: 静态代码分析...')
  const staticResults = await detectRouteMismatches(frontendAPIs, backendDir)
  
  // 步骤2: 运行时探测（针对静态分析中"不匹配"和"未找到"的API）
  console.log('\n🌐 步骤2: 运行时探测...')
  const suspiciousAPIs = [
    ...staticResults.mismatched.map(r => r.frontend),
    ...staticResults.notFound.map(r => r.frontend)
  ]
  
  const runtimeResults = await detectRoutesRuntime(
    suspiciousAPIs,
    runtimeConfig.baseURL,
    runtimeConfig.token
  )
  
  // 步骤3: 合并结果，消除误报
  console.log('\n🧩 步骤3: 合并分析结果...')
  const finalResults = mergeResults(staticResults, runtimeResults)
  
  return finalResults
}

/**
 * 合并静态和运行时结果
 * @param {Object} staticResults - 静态分析结果
 * @param {Object} runtimeResults - 运行时探测结果
 * @returns {Object} 合并后的结果
 */
function mergeResults(staticResults, runtimeResults) {
  // 创建运行时结果的快速查找表
  const runtimeConfirmed = new Map()
  runtimeResults.confirmed.forEach(r => {
    runtimeConfirmed.set(r.api.functionName, r)
  })
  
  const runtimeMissing = new Map()
  runtimeResults.missing.forEach(r => {
    runtimeMissing.set(r.api.functionName, r)
  })
  
  // 重新分类
  const results = {
    confirmed: [],        // 静态匹配 或 运行时确认存在
    mismatched: [],       // 静态不匹配 + 运行时确认不匹配
    missing: [],          // 静态未找到 + 运行时确认不存在
    falsePositives: [],   // 静态报告问题但运行时正常（误报）
    needReview: []        // 无法确定，需要人工检查
  }
  
  // 处理静态匹配的结果
  staticResults.matched.forEach(match => {
    results.confirmed.push({
      ...match,
      verifiedBy: 'static',
      confidence: 'high'
    })
  })
  
  // 处理静态不匹配的结果
  staticResults.mismatched.forEach(mismatch => {
    const funcName = mismatch.frontend.functionName
    const runtimeResult = runtimeConfirmed.get(funcName)
    
    if (runtimeResult) {
      // 运行时确认存在 → 误报
      results.falsePositives.push({
        ...mismatch,
        runtimeStatus: runtimeResult.actualStatus,
        reason: '静态分析误报，运行时确认API存在'
      })
    } else if (runtimeMissing.has(funcName)) {
      // 运行时确认不存在 → 真实问题
      results.mismatched.push({
        ...mismatch,
        verifiedBy: 'runtime',
        confidence: 'high'
      })
    } else {
      // 无法确定
      results.needReview.push(mismatch)
    }
  })
  
  // 处理静态未找到的结果
  staticResults.notFound.forEach(notFound => {
    const funcName = notFound.frontend.functionName
    const runtimeResult = runtimeConfirmed.get(funcName)
    
    if (runtimeResult) {
      // 运行时确认存在 → 误报
      results.falsePositives.push({
        ...notFound,
        runtimeStatus: runtimeResult.actualStatus,
        reason: '静态分析未找到，但运行时确认API存在（可能是动态路由）'
      })
    } else if (runtimeMissing.has(funcName)) {
      // 运行时确认不存在 → 真实缺失
      results.missing.push({
        ...notFound,
        verifiedBy: 'runtime',
        confidence: 'high'
      })
    } else {
      // 无法确定
      results.needReview.push(notFound)
    }
  })
  
  return results
}

/**
 * 生成混合验证报告
 * @param {Object} results - 验证结果
 * @returns {string} Markdown报告
 */
function generateHybridReport(results) {
  let report = `# API 路由混合验证报告\n\n`
  report += `生成时间: ${new Date().toLocaleString()}\n\n`
  
  // 统计
  report += `## 验证统计\n\n`
  report += `- ✅ 确认正常: ${results.confirmed.length}\n`
  report += `- ❌ 路径不匹配: ${results.mismatched.length}\n`
  report += `- ❌ 接口缺失: ${results.missing.length}\n`
  report += `- ⚠️ 扫描器误报: ${results.falsePositives.length}\n`
  report += `- 🔍 需要人工检查: ${results.needReview.length}\n\n`
  
  // 误报详情
  if (results.falsePositives.length > 0) {
    report += `## ⚠️ 扫描器误报（已排除）\n\n`
    report += `以下API被静态扫描器报告为问题，但运行时探测确认正常:\n\n`
    report += `| API 函数 | 前端路径 | 运行时状态 | 原因 |\n`
    report += `|---------|---------|-----------|------|\n`
    results.falsePositives.forEach(fp => {
      report += `| ${fp.frontend.functionName} | ${fp.frontend.endpoint} | ${fp.runtimeStatus} | ${fp.reason} |\n`
    })
    report += `\n`
  }
  
  // 真实问题
  if (results.mismatched.length > 0 || results.missing.length > 0) {
    report += `## ❌ 确认的问题（需要修复）\n\n`
    
    if (results.mismatched.length > 0) {
      report += `### 路径不匹配\n\n`
      report += `| API 函数 | 前端期望 | 后端实际 |\n`
      report += `|---------|---------|---------|\n`
      results.mismatched.forEach(m => {
        report += `| ${m.frontend.functionName} | ${m.expected} | ${m.actual} |\n`
      })
      report += `\n`
    }
    
    if (results.missing.length > 0) {
      report += `### 接口缺失\n\n`
      report += `| API 函数 | 前端路径 |\n`
      report += `|---------|---------|\n`
      results.missing.forEach(m => {
        report += `| ${m.frontend.functionName} | ${m.frontend.endpoint} |\n`
      })
      report += `\n`
    }
  }
  
  return report
}

module.exports = {
  hybridVerify,
  mergeResults,
  generateHybridReport
}
