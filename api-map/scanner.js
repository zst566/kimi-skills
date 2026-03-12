/**
 * API 扫描器
 * 扫描前端项目的导航菜单、API定义和页面依赖关系
 */

const fs = require('fs')
const path = require('path')

/**
 * 扫描路由配置，提取导航菜单结构
 * @param {string} routerFile - 路由文件路径
 * @returns {Array} 菜单结构数组
 */
function scanRouter(routerFile) {
  console.log(`[Scanner] 扫描路由文件: ${routerFile}`)
  
  const content = fs.readFileSync(routerFile, 'utf-8')
  const routes = []
  
  // 匹配路由配置对象
  const routePattern = /\{\s*path:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]\s*,\s*component:\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)[^}]*meta:\s*\{([^}]*)\}/g
  
  let match
  while ((match = routePattern.exec(content)) !== null) {
    const [, routePath, name, componentPath, metaContent] = match
    
    // 解析meta信息
    const meta = {}
    const metaPattern = /(\w+):\s*['"]([^'"]*)['"]/g
    let metaMatch
    while ((metaMatch = metaPattern.exec(metaContent)) !== null) {
      meta[metaMatch[1]] = metaMatch[2]
    }
    
    // 检查是否需要管理员权限
    const requireAdmin = metaContent.includes('requireAdmin:\s*true')
    
    routes.push({
      path: routePath,
      name,
      component: componentPath,
      title: meta.title || name,
      icon: meta.icon || '',
      requireAdmin,
      // 推断页面文件路径 (去掉 @/ 和 .vue)
      viewFile: componentPath.replace('@/', '').replace('.vue', '').replace(/^views\//, '')
    })
  }
  
  console.log(`[Scanner] 发现 ${routes.length} 个菜单项`)
  return routes
}

/**
 * 扫描API目录，提取所有接口定义
 * @param {string} apiDir - API目录路径
 * @returns {Object} API模块映射
 */
function scanAPIDir(apiDir) {
  console.log(`[Scanner] 扫描API目录: ${apiDir}`)
  
  const apiModules = {}
  const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.js'))
  
  for (const file of files) {
    const filePath = path.join(apiDir, file)
    const moduleName = file.replace('.js', '')
    
    apiModules[moduleName] = parseAPIFile(filePath)
  }
  
  console.log(`[Scanner] 发现 ${Object.keys(apiModules).length} 个API模块`)
  return apiModules
}

/**
 * 解析单个API文件
 * @param {string} filePath - API文件路径
 * @returns {Array} API定义数组
 */
function parseAPIFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const apis = []
  
  // 按行分割，逐行分析
  const lines = content.split('\n')
  let currentJSDoc = []
  let inJSDoc = false
  let funcName = null
  let funcParams = ''
  let funcStartLine = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 检测JSDoc开始
    if (line.trim() === '/**') {
      inJSDoc = true
      currentJSDoc = [line]
      continue
    }
    
    // 收集JSDoc内容
    if (inJSDoc) {
      currentJSDoc.push(line)
      if (line.trim() === '*/') {
        inJSDoc = false
      }
      continue
    }
    
    // 检测export function
    const funcMatch = line.match(/export\s+function\s+(\w+)\s*\(([^)]*)\)/)
    if (funcMatch) {
      funcName = funcMatch[1]
      funcParams = funcMatch[2]
      funcStartLine = i
      continue
    }
    
    // 在函数体内查找return request.xxx()
    if (funcName && i > funcStartLine) {
      // 检测函数结束（简单检测下一个export或文件结束）
      if (line.match(/^export\s+/) || line.match(/^\/\*\*/)) {
        funcName = null
        currentJSDoc = []
        continue
      }
      
      // 匹配return request.xxx('endpoint')
      const returnMatch = line.match(/return\s+request\.(\w+)\(['"`]([^'"`]+)['"`]/)
      if (returnMatch) {
        const method = returnMatch[1].toUpperCase()
        const endpoint = returnMatch[2]
        
        // 解析JSDoc
        const docInfo = parseJSDoc(currentJSDoc.join('\n'))
        
        apis.push({
          functionName: funcName,
          method,
          endpoint,
          params: parseParams(funcParams),
          description: docInfo.description || '',
          paramDocs: docInfo.params || {},
          returns: docInfo.returns || ''
        })
        
        funcName = null
        currentJSDoc = []
      }
    }
  }
  
  return apis
}

/**
 * 解析JSDoc注释
 * @param {string} jsdoc - JSDoc字符串
 * @returns {Object} 解析后的文档信息
 */
function parseJSDoc(jsdoc) {
  const info = {
    description: '',
    params: {},
    returns: ''
  }
  
  // 提取描述（第一行没有标签的内容）
  const descMatch = jsdoc.match(/^\s*\*\s*([^@\n]+)/m)
  if (descMatch) {
    info.description = descMatch[1].trim()
  }
  
  // 提取@param
  const paramPattern = /@param\s*\{([^}]+)\}\s*(?:\[)?(\w+)(?:\])?\s*-?\s*(.*)/g
  let paramMatch
  while ((paramMatch = paramPattern.exec(jsdoc)) !== null) {
    const [, type, name, description] = paramMatch
    info.params[name] = { type, description: description.trim() }
  }
  
  // 提取@returns
  const returnsMatch = jsdoc.match(/@returns\s*\{([^}]+)\}/)
  if (returnsMatch) {
    info.returns = returnsMatch[1]
  }
  
  return info
}

/**
 * 解析函数参数
 * @param {string} paramsStr - 参数字符串
 * @returns {Array} 参数数组
 */
function parseParams(paramsStr) {
  if (!paramsStr.trim()) return []
  
  return paramsStr.split(',').map(p => {
    const trimmed = p.trim()
    // 解构参数如 { page, size }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return {
        type: 'destructured',
        name: 'params',
        properties: trimmed.slice(1, -1).split(',').map(s => s.trim())
      }
    }
    // 普通参数
    const [name, defaultValue] = trimmed.split('=').map(s => s.trim())
    return { type: 'simple', name, defaultValue }
  })
}

/**
 * 扫描页面文件，分析其调用的API
 * @param {string} viewFile - 页面文件相对路径
 * @param {string} viewsDir - 视图目录
 * @returns {Array} 页面使用的API列表
 */
function scanPageAPIs(viewFile, viewsDir) {
  // 尝试找到页面文件
  const possiblePaths = [
    path.join(viewsDir, viewFile + '.vue'),
    path.join(viewsDir, viewFile, 'Index.vue'),
    path.join(viewsDir, viewFile, 'index.vue')
  ]
  
  let filePath = null
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p
      break
    }
  }
  
  if (!filePath) {
    return []
  }
  
  const content = fs.readFileSync(filePath, 'utf-8')
  const usedAPIs = []
  
  // 匹配导入的API模块
  const importPattern = /import\s*\{([^}]+)\}\s*from\s*['"]@\/api\/([^'"]+)['"]/g
  let importMatch
  while ((importMatch = importPattern.exec(content)) !== null) {
    const functions = importMatch[1].split(',').map(f => f.trim())
    const moduleName = importMatch[2].replace('.js', '')
    
    // 检查这些函数是否在页面中被调用
    for (const func of functions) {
      const callPattern = new RegExp(`\\b${func}\\s*\\(`)
      if (callPattern.test(content)) {
        usedAPIs.push({
          functionName: func,
          module: moduleName,
          calledIn: extractCallerContext(content, func)
        })
      }
    }
  }
  
  return usedAPIs
}

/**
 * 提取API调用的上下文信息
 * @param {string} content - 页面内容
 * @param {string} funcName - 函数名
 * @returns {string} 调用上下文
 */
function extractCallerContext(content, funcName) {
  // 找到函数调用的位置，提取周围代码作为上下文
  const pattern = new RegExp(`([\w$]+)\s*[:=]\s*await\s+${funcName}|([\w$]+)\s*[:=]\s*${funcName}\\(`, 'g')
  const match = pattern.exec(content)
  
  if (match) {
    return match[1] || match[2] || '直接调用'
  }
  return '直接调用'
}

/**
 * 完整扫描一个端的所有信息
 * @param {string} platform - 平台标识 (pc/mobile/merchant)
 * @param {Object} config - 平台配置
 * @returns {Object} 完整的扫描结果
 */
function scanPlatform(platform, config) {
  console.log(`\n========== 扫描平台: ${config.name} ==========`)
  
  // 1. 扫描路由/菜单
  const menuItems = scanRouter(config.routerFile)
  
  // 2. 扫描所有API模块
  const apiModules = scanAPIDir(config.apiDir)
  
  // 3. 为每个菜单项分析其使用的API
  const modules = []
  for (const menu of menuItems) {
    console.log(`[Scanner] 分析页面: ${menu.title}`)
    
    const usedAPIs = scanPageAPIs(menu.viewFile, config.viewsDir)
    
    // 将使用的API与API定义关联
    const apiDetails = usedAPIs.map(used => {
      const moduleAPIs = apiModules[used.module] || []
      const apiDef = moduleAPIs.find(a => a.functionName === used.functionName)
      
      return {
        ...used,
        definition: apiDef || null,
        endpoint: apiDef?.endpoint || '未知',
        method: apiDef?.method || 'GET'
      }
    })
    
    modules.push({
      ...menu,
      apis: apiDetails,
      apiCount: apiDetails.length
    })
  }
  
  return {
    platform,
    name: config.name,
    baseURL: config.baseURL,
    scannedAt: new Date().toISOString(),
    menuCount: menuItems.length,
    modules,
    allAPIs: apiModules
  }
}

module.exports = {
  scanRouter,
  scanAPIDir,
  parseAPIFile,
  scanPageAPIs,
  scanPlatform
}
