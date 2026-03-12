/**
 * 运行时路由探测器
 * 通过实际HTTP请求探测后端路由，解决静态分析无法识别动态路由的问题
 */

const axios = require('axios')

/**
 * 探测路由是否存在
 * @param {string} url - 探测URL
 * @param {string} token - 认证token
 * @returns {Object} 探测结果
 */
async function probeRoute(url, token) {
  try {
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 5000,
      validateStatus: () => true // 不抛出HTTP错误
    })
    
    // 404 = 路由不存在
    // 401/403 = 路由存在但需认证/无权限
    // 200/400/422 = 路由存在但参数错误
    // 500 = 路由存在但服务器错误
    
    const exists = response.status !== 404
    
    return {
      url,
      status: response.status,
      exists,
      isDynamic: response.status === 400 || response.status === 422,
      data: response.data
    }
  } catch (error) {
    return {
      url,
      status: 0,
      exists: false,
      error: error.message
    }
  }
}

/**
 * 批量探测前端API列表
 * @param {Array} frontendAPIs - 前端API列表
 * @param {string} baseURL - 后端基础URL
 * @param {string} token - 认证token
 * @returns {Object} 探测结果
 */
async function detectRoutesRuntime(frontendAPIs, baseURL, token) {
  console.log('[RuntimeDetector] 开始运行时路由探测...')
  
  const results = {
    confirmed: [],      // 确认存在的路由
    missing: [],        // 确认缺失的路由
    dynamic: [],        // 可能是动态路由
    errors: []
  }
  
  for (const api of frontendAPIs) {
    const url = `${baseURL}${api.endpoint}`
    
    // 替换模板参数为测试值
    const testUrl = url
      .replace(/\$\{(\w+)\}/g, '1')  // ${id} -> 1
      .replace(/:(\w+)/g, '1')       // :id -> 1
    
    const result = await probeRoute(testUrl, token)
    
    if (result.exists) {
      results.confirmed.push({
        api,
        actualStatus: result.status,
        isDynamic: result.isDynamic
      })
    } else {
      results.missing.push({
        api,
        testedUrl: testUrl,
        status: result.status
      })
    }
    
    // 延迟避免请求过快
    await new Promise(r => setTimeout(r, 100))
  }
  
  console.log(`[RuntimeDetector] 探测完成:`)
  console.log(`  ✅ 确认存在: ${results.confirmed.length}`)
  console.log(`  ❌ 确认缺失: ${results.missing.length}`)
  console.log(`  🔄 动态路由: ${results.dynamic.length}`)
  
  return results
}

module.exports = {
  probeRoute,
  detectRoutesRuntime
}
