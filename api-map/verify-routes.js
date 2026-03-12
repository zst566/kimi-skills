#!/usr/bin/env node
/**
 * 路由验证脚本
 * 一键检测前端 API 与后端路由的匹配情况
 * 
 * Usage: node verify-routes.js [backend-dir]
 * Example: node verify-routes.js ../../apps/backend
 */

const fs = require('fs')
const path = require('path')

// 尝试从多个位置加载模块
function loadModule(name) {
  const skillDir = __dirname
  const projectScriptDir = path.resolve(skillDir, '../../../scripts/api-inspector')
  
  // 先尝试技能目录
  try {
    return require(path.join(skillDir, name))
  } catch (e) {
    // 再尝试项目脚本目录
    try {
      return require(path.join(projectScriptDir, name))
    } catch (e2) {
      throw new Error(`无法加载模块: ${name}`)
    }
  }
}

const { detectRouteMismatches, generateMatchReport } = require('./route-matcher')
const { scanAPIDir } = loadModule('scanner')

// 默认配置
const DEFAULT_BACKEND_DIR = '../../apps/backend'
const DEFAULT_FRONTEND_API_DIR = '../../apps/pc-admin/src/api'

async function main() {
  console.log('🔍 API 路由匹配检测\n')
  console.log('=' .repeat(50))
  
  // 解析参数
  const backendDir = path.resolve(process.argv[2] || DEFAULT_BACKEND_DIR)
  const frontendApiDir = path.resolve(process.argv[3] || DEFAULT_FRONTEND_API_DIR)
  
  console.log(`\n📁 后端目录: ${backendDir}`)
  console.log(`📁 前端 API 目录: ${frontendApiDir}\n`)
  
  // 验证目录存在
  if (!fs.existsSync(backendDir)) {
    console.error(`❌ 后端目录不存在: ${backendDir}`)
    console.log('\n使用方法:')
    console.log('  node verify-routes.js <backend-dir> [frontend-api-dir]')
    console.log('')
    console.log('示例:')
    console.log('  node verify-routes.js ../../apps/backend ../../apps/pc-admin/src/api')
    process.exit(1)
  }
  
  if (!fs.existsSync(frontendApiDir)) {
    console.error(`❌ 前端 API 目录不存在: ${frontendApiDir}`)
    process.exit(1)
  }
  
  // 1. 扫描前端 API
  console.log('📡 扫描前端 API...')
  const apiModules = scanAPIDir(frontendApiDir)
  
  // 展平为列表
  const frontendAPIs = []
  for (const [module, apis] of Object.entries(apiModules)) {
    for (const api of apis) {
      frontendAPIs.push({
        ...api,
        module,
        fullEndpoint: `/api/pc${api.endpoint}`
      })
    }
  }
  console.log(`   发现 ${frontendAPIs.length} 个前端 API\n`)
  
  // 2. 检测匹配
  console.log('🔄 对比后端路由...')
  const results = await detectRouteMismatches(frontendAPIs, backendDir)
  
  // 3. 显示结果
  console.log('\n' + '='.repeat(50))
  console.log('📊 检测结果\n')
  
  const total = results.matched.length + results.mismatched.length + results.notFound.length
  const passRate = ((results.matched.length / total) * 100).toFixed(1)
  
  console.log(`✅ 完全匹配:     ${results.matched.length} (${passRate}%)`)
  console.log(`⚠️  路径不匹配:  ${results.mismatched.length}`)
  console.log(`❌ 未找到路由:   ${results.notFound.length}`)
  console.log(`────────────────────────────────`)
  console.log(`总计:           ${total}`)
  
  // 4. 显示不匹配详情
  if (results.mismatched.length > 0) {
    console.log('\n⚠️ 路径不匹配详情:\n')
    console.log('─'.repeat(80))
    
    for (const item of results.mismatched) {
      console.log(`\n🔸 ${item.frontend.functionName}`)
      console.log(`   前端期望: ${item.expected}`)
      console.log(`   后端实际: ${item.actual || '未找到'}`)
      console.log(`   原因: ${item.reason}`)
      if (item.suggestion) {
        console.log(`   💡 建议: ${item.suggestion}`)
      }
    }
  }
  
  // 5. 显示未找到的路由
  if (results.notFound.length > 0) {
    console.log('\n❌ 未找到路由的 API:\n')
    console.log('─'.repeat(80))
    
    for (const item of results.notFound) {
      console.log(`   • ${item.frontend.functionName}: ${item.expected}`)
    }
  }
  
  // 6. 生成报告文件
  const reportDir = path.join(process.cwd(), 'docs', 'api-map')
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }
  
  const reportPath = path.join(reportDir, 'route-mismatch-report.md')
  const report = generateMatchReport(results)
  fs.writeFileSync(reportPath, report, 'utf-8')
  
  console.log(`\n📄 详细报告已保存: ${reportPath}`)
  
  // 7. 返回码
  if (results.mismatched.length > 0 || results.notFound.length > 0) {
    console.log('\n⚠️ 检测到路由问题，请查看报告并修复')
    process.exit(1)
  } else {
    console.log('\n✅ 所有路由匹配正常')
    process.exit(0)
  }
}

// 运行
main().catch(err => {
  console.error('❌ 错误:', err.message)
  console.error(err.stack)
  process.exit(1)
})
