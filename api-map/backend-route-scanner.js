/**
 * 后端路由扫描器 - 改进版
 * 扫描 Express 后端路由注册情况，提取实际可用的 API 路径
 * 
 * 改进点:
 * 1. 递归解析被挂载的路由模块
 * 2. 正确处理子路由模块中的根路径 '/'
 * 3. 区分实际端点和挂载点
 */

const fs = require('fs')
const path = require('path')

/**
 * 扫描后端路由目录
 * @param {string} routesDir - 后端路由目录
 * @returns {Object} 路由树结构
 */
function scanBackendRoutes(routesDir) {
  console.log(`[BackendScanner] 扫描后端路由: ${routesDir}`)
  
  const routes = {
    basePath: '/api',
    children: {}
  }
  
  // 扫描 pc/ mobile/ 等子目录
  const platformDirs = fs.readdirSync(routesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
  
  for (const platform of platformDirs) {
    const platformPath = path.join(routesDir, platform)
    routes.children[platform] = scanPlatformRoutes(platformPath, `/api/${platform}`)
  }
  
  return routes
}

/**
 * 扫描平台路由（pc/mobile）
 * @param {string} platformDir - 平台路由目录
 * @param {string} basePath - 基础路径
 * @returns {Object} 平台路由树
 */
function scanPlatformRoutes(platformDir, basePath) {
  const result = {
    basePath,
    endpoints: [],
    children: {}
  }
  
  // 读取 index.js 获取路由挂载信息
  const indexFile = path.join(platformDir, 'index.js')
  if (fs.existsSync(indexFile)) {
    result.endpoints = parseRouterMounts(indexFile, basePath)
  }
  
  return result
}

/**
 * 解析路由挂载文件（index.js）- 递归解析被挂载的路由
 * @param {string} filePath - 文件路径
 * @param {string} basePath - 基础路径
 * @returns {Array} 路由端点列表（包括被挂载的路由中的端点）
 */
function parseRouterMounts(filePath, basePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const endpoints = []
  const dir = path.dirname(filePath)
  
  // 先提取所有导入语句，建立映射表
  const importMap = new Map()
  const importPattern = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
  let importMatch
  while ((importMatch = importPattern.exec(content)) !== null) {
    const [, routerName, importPath] = importMatch
    importMap.set(routerName, importPath)
  }
  
  // 匹配 router.use('/path', routerName)
  const usePattern = /router\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)\s*\)/g
  
  let match
  while ((match = usePattern.exec(content)) !== null) {
    const [, mountPath, routerName] = match
    const fullPath = mountPath === '/' ? basePath : `${basePath}${mountPath}`
    
    // 从导入映射表中查找源文件
    const importPath = importMap.get(routerName)
    
    if (importPath) {
      const resolvedPath = resolveImportPath(dir, importPath)
      
      if (resolvedPath && fs.existsSync(resolvedPath)) {
        const stats = fs.statSync(resolvedPath)
        
        if (stats.isDirectory()) {
          // 是目录，解析其 index.js
          const subIndexFile = path.join(resolvedPath, 'index.js')
          if (fs.existsSync(subIndexFile)) {
            // 递归解析子路由模块
            const subEndpoints = parseSubRouterModule(subIndexFile, fullPath)
            endpoints.push(...subEndpoints)
          }
        } else if (resolvedPath.endsWith('/index.js') || resolvedPath.endsWith('\\index.js')) {
          // 是 index.js 文件（如 ./attraction/index.js）
          // 递归解析该子路由模块
          const subEndpoints = parseSubRouterModule(resolvedPath, fullPath)
          endpoints.push(...subEndpoints)
        } else {
          // 是普通路由文件
          const fileEndpoints = parseRouteFile(resolvedPath, fullPath)
          endpoints.push(...fileEndpoints.endpoints || [])
        }
      }
    }
  }
  
  return endpoints
}

/**
 * 解析子路由模块（如 attraction/index.js）- 递归处理内部挂载
 * @param {string} filePath - index.js 路径
 * @param {string} basePath - 基础路径
 * @returns {Array} 所有端点列表
 */
function parseSubRouterModule(filePath, basePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const endpoints = []
  const dir = path.dirname(filePath)
  
  // 1. 解析当前文件中的直接端点定义（router.get/post/put/delete）
  const directEndpoints = parseDirectEndpoints(content, basePath, filePath)
  endpoints.push(...directEndpoints)
  
  // 2. 先提取所有导入语句，建立映射表
  const importMap = new Map()
  const importPattern = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
  let importMatch
  while ((importMatch = importPattern.exec(content)) !== null) {
    const [, routerName, importPath] = importMatch
    importMap.set(routerName, importPath)
  }
  
  // 3. 解析 router.use() 挂载的子路由
  const usePattern = /router\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)\s*\)/g
  
  let match
  while ((match = usePattern.exec(content)) !== null) {
    const [, mountPath, routerName] = match
    
    // 从导入映射表中查找源文件
    const importPath = importMap.get(routerName)
    
    if (importPath) {
      const resolvedPath = resolveImportPath(dir, importPath)
      
      if (resolvedPath && fs.existsSync(resolvedPath)) {
        // 计算子路由的完整路径
        const subPath = mountPath === '/' ? basePath : `${basePath}${mountPath}`
        
        // 判断是目录还是文件
        const stats = fs.statSync(resolvedPath)
        if (stats.isDirectory()) {
          // 子目录，递归解析
          const subIndexFile = path.join(resolvedPath, 'index.js')
          if (fs.existsSync(subIndexFile)) {
            const subEndpoints = parseSubRouterModule(subIndexFile, subPath)
            endpoints.push(...subEndpoints)
          }
        } else {
          // 文件，解析端点
          const fileEndpoints = parseRouteFile(resolvedPath, subPath)
          endpoints.push(...fileEndpoints.endpoints || [])
        }
      }
    }
  }
  
  return endpoints
}

/**
 * 解析文件中的直接端点定义
 * @param {string} content - 文件内容
 * @param {string} basePath - 基础路径
 * @param {string} sourceFile - 源文件路径
 * @returns {Array} 端点列表
 */
function parseDirectEndpoints(content, basePath, sourceFile) {
  const endpoints = []
  
  // 匹配 router.METHOD(path, handler)
  const methodPattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi
  
  let match
  while ((match = methodPattern.exec(content)) !== null) {
    const [, method, routePath] = match
    const fullPath = routePath === '/' ? basePath : `${basePath}${routePath}`
    
    endpoints.push({
      type: 'endpoint',
      method: method.toUpperCase(),
      routePath,
      fullPath,
      sourceFile
    })
  }
  
  return endpoints
}

/**
 * 解析单个路由文件，提取端点定义
 * @param {string} filePath - 路由文件路径
 * @param {string} basePath - 基础路径
 * @returns {Object} 路由端点
 */
function parseRouteFile(filePath, basePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const endpoints = parseDirectEndpoints(content, basePath, filePath)
  
  return {
    basePath,
    endpoints,
    sourceFile: filePath
  }
}

/**
 * 解析导入路径
 * @param {string} baseDir - 基础目录
 * @param {string} importPath - 导入路径
 * @returns {string|null} 解析后的绝对路径
 */
function resolveImportPath(baseDir, importPath) {
  // 处理相对路径
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const resolved = path.resolve(baseDir, importPath)
    
    // 尝试添加 .js 扩展名
    if (fs.existsSync(resolved)) {
      return resolved
    }
    if (fs.existsSync(resolved + '.js')) {
      return resolved + '.js'
    }
    if (fs.existsSync(resolved + '/index.js')) {
      return resolved
    }
  }
  
  return null
}

/**
 * 展平路由树为路径列表
 * @param {Object} routeTree - 路由树
 * @returns {Array} 所有端点路径列表
 */
function flattenRoutes(routeTree, result = []) {
  // 处理当前层的端点
  if (routeTree.endpoints) {
    result.push(...routeTree.endpoints)
  }
  
  // 递归处理子路由
  if (routeTree.children) {
    for (const child of Object.values(routeTree.children)) {
      flattenRoutes(child, result)
    }
  }
  
  return result
}

/**
 * 获取所有可用的 API 路径
 * @param {string} backendDir - 后端代码目录
 * @returns {Array} 所有可用的 API 端点
 */
function getAllAvailableEndpoints(backendDir) {
  const routesDir = path.join(backendDir, 'src/routes')
  
  if (!fs.existsSync(routesDir)) {
    console.warn(`[BackendScanner] 路由目录不存在: ${routesDir}`)
    return []
  }
  
  const routeTree = scanBackendRoutes(routesDir)
  const endpoints = flattenRoutes(routeTree)
  
  // 去重并排序
  const unique = new Map()
  for (const ep of endpoints) {
    const key = `${ep.method} ${ep.fullPath}`
    if (!unique.has(key)) {
      unique.set(key, ep)
    }
  }
  
  return Array.from(unique.values()).sort((a, b) => a.fullPath.localeCompare(b.fullPath))
}

module.exports = {
  scanBackendRoutes,
  scanPlatformRoutes,
  parseRouterMounts,
  parseSubRouterModule,
  parseRouteFile,
  getAllAvailableEndpoints,
  flattenRoutes
}
