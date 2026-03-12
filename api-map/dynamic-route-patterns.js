/**
 * 动态路由模式定义
 * 已知使用动态路由的模块，避免误报
 */

/**
 * 动态路由白名单
 * key: 路由前缀
 * value: 允许的动态参数值
 */
const DYNAMIC_ROUTE_PATTERNS = {
  // Config 模块 - 配置键值动态路由
  '/api/pc/config': {
    param: ':key',
    allowedValues: [
      'home_full_config',
      'home_banners',
      'home_features',
      'home_quick_buttons',
      'home_attractions_config',
      'home_specialty_config',
      'home_homestays_config'
    ]
  },
  
  // System 模块 - 系统接口
  '/api/system': {
    param: ':path',
    allowedValues: [
      'env',
      'health',
      'version'
    ]
  },
  
  // 可以添加更多...
}

/**
 * 检查路径是否匹配动态路由模式
 * @param {string} frontendPath - 前端路径
 * @param {string} backendPattern - 后端模式（如 /api/pc/config/:key）
 * @returns {Object} 匹配结果
 */
function matchDynamicRoute(frontendPath, backendPattern) {
  // 将模式转换为正则
  // /api/pc/config/:key -> /api/pc/config/([^/]+)
  const pattern = backendPattern.replace(/:(\w+)/g, '([^/]+)')
  const regex = new RegExp(`^${pattern}$`)
  
  const match = frontendPath.match(regex)
  if (!match) {
    return { matched: false }
  }
  
  return {
    matched: true,
    params: match.slice(1)
  }
}

/**
 * 检查前端路径是否匹配已知的动态路由
 * @param {string} frontendPath - 前端路径
 * @returns {Object} 匹配结果
 */
function checkDynamicRouteWhitelist(frontendPath) {
  for (const [prefix, config] of Object.entries(DYNAMIC_ROUTE_PATTERNS)) {
    if (frontendPath.startsWith(prefix)) {
      const pattern = `${prefix}/${config.param}`
      const match = matchDynamicRoute(frontendPath, pattern)
      
      if (match.matched) {
        const paramValue = match.params[0]
        const isAllowed = config.allowedValues.includes(paramValue)
        
        return {
          isDynamic: true,
          pattern,
          param: config.param,
          value: paramValue,
          isAllowed,
          allowedValues: config.allowedValues
        }
      }
    }
  }
  
  return { isDynamic: false }
}

module.exports = {
  DYNAMIC_ROUTE_PATTERNS,
  matchDynamicRoute,
  checkDynamicRouteWhitelist
}
