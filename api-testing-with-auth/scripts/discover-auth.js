#!/usr/bin/env node
/**
 * 自动发现项目认证配置脚本
 * 分析后端代码，输出认证相关信息
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 查找路由文件
function findRouteFiles(basePath) {
  const routes = [];
  const endpoints = ['mobile', 'pc', 'merchant', 'public'];

  for (const endpoint of endpoints) {
    const routePath = path.join(basePath, 'src', 'routes', endpoint);
    if (fs.existsSync(routePath)) {
      const files = fs.readdirSync(routePath)
        .filter(f => f.endsWith('.js'))
        .map(f => ({
          endpoint,
          file: f,
          fullPath: path.join(routePath, f)
        }));
      routes.push(...files);
    }
  }

  return routes;
}

// 分析登录接口
function analyzeLoginInterfaces(routes) {
  const logins = [];

  for (const route of routes) {
    const content = fs.readFileSync(route.fullPath, 'utf8');

    // 查找登录相关路由
    const loginPatterns = [
      /router\.(post|get)\s*\(\s*['"`]([^'"`]*login[^'"`]*)['"`]/gi,
      /router\.(post|get)\s*\(\s*['"`]([^'"`]*signin[^'"`]*)['"`]/gi,
      /router\.(post|get)\s*\(\s*['"`]([^'"`]*auth[^'"`]*)['"`]/gi
    ];

    for (const pattern of loginPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const urlPath = match[2];

        // 查找参数定义
        const paramMatch = content.substring(match.index, match.index + 500)
          .match(/req\.body\.([a-zA-Z_]+)/g);
        const params = paramMatch
          ? [...new Set(paramMatch.map(p => p.replace('req.body.', '')))]
          : [];

        logins.push({
          endpoint: route.endpoint,
          method,
          path: urlPath,
          file: route.file,
          params
        });
      }
    }
  }

  return logins;
}

// 分析认证中间件
function analyzeAuthMiddleware(routes) {
  const authPatterns = [];

  for (const route of routes) {
    const content = fs.readFileSync(route.fullPath, 'utf8');

    // 查找使用 authenticate 中间件的路由
    const authRoutes = [];
    const pattern = /router\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`],\s*authenticate/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      authRoutes.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }

    if (authRoutes.length > 0) {
      authPatterns.push({
        endpoint: route.endpoint,
        file: route.file,
        protectedRoutes: authRoutes.slice(0, 5) // 只显示前5个
      });
    }
  }

  return authPatterns;
}

// 查找测试账号
function findTestAccounts(basePath) {
  const accounts = [];

  // 搜索配置文件和文档
  const searchFiles = [
    'AGENTS.md',
    'README.md',
    '.env.example',
    'scripts/test*.sh',
    'scripts/test*.js'
  ];

  for (const pattern of searchFiles) {
    const fullPath = path.join(basePath, '..', '..', pattern);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');

      // 查找账号密码模式
      const accountPatterns = [
        /(admin|test|user)[\s:：]+([^\s\n]+)/gi,
        /(password|pwd)[\s:：]+([^\s\n]+)/gi,
        /账号[\s:：]+([^\s\n]+)/gi,
        /密码[\s:：]+([^\s\n]+)/gi
      ];

      for (const pattern of accountPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          accounts.push({
            source: path.basename(fullPath),
            match: match[0]
          });
        }
      }
    }
  }

  return accounts.slice(0, 10); // 限制数量
}

// 主函数
function main() {
  log('🔍 正在分析项目认证配置...\n', 'cyan');

  // 查找后端路径
  let backendPath = null;
  const possiblePaths = [
    './apps/backend',
    './backend',
    '../backend',
    '../../apps/backend'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      backendPath = p;
      break;
    }
  }

  if (!backendPath) {
    log('❌ 未找到后端项目路径', 'red');
    process.exit(1);
  }

  log(`📁 后端路径: ${backendPath}\n`, 'green');

  // 查找路由文件
  const routes = findRouteFiles(backendPath);
  log(`📄 找到 ${routes.length} 个路由文件\n`, 'yellow');

  // 分析登录接口
  log('🔐 登录接口分析:', 'cyan');
  const logins = analyzeLoginInterfaces(routes);

  if (logins.length === 0) {
    log('  未找到登录接口\n', 'yellow');
  } else {
    for (const login of logins) {
      log(`  [${login.endpoint.toUpperCase()}] ${login.method} ${login.path}`, 'green');
      if (login.params.length > 0) {
        log(`    参数: ${login.params.join(', ')}`, 'reset');
      }
    }
    log('');
  }

  // 分析受保护路由
  log('🔒 受保护路由示例 (需要认证):', 'cyan');
  const authRoutes = analyzeAuthMiddleware(routes);

  for (const route of authRoutes) {
    log(`  [${route.endpoint.toUpperCase()}] ${route.file}:`, 'yellow');
    for (const r of route.protectedRoutes) {
      log(`    ${r.method} ${r.path}`, 'reset');
    }
  }
  log('');

  // 查找测试账号
  log('👤 可能的测试账号 (从配置中提取):', 'cyan');
  const accounts = findTestAccounts(backendPath);

  if (accounts.length === 0) {
    log('  未找到测试账号信息\n', 'yellow');
  } else {
    for (const acc of accounts) {
      log(`  [${acc.source}] ${acc.match}`, 'reset');
    }
  }

  // 输出建议配置
  log('\n💡 建议的测试配置:', 'cyan');
  const suggestions = [];

  for (const endpoint of ['pc', 'mobile', 'merchant']) {
    const hasRoutes = routes.some(r => r.endpoint === endpoint);
    if (hasRoutes) {
      const login = logins.find(l => l.endpoint === endpoint);
      if (login) {
        suggestions.push({
          endpoint,
          loginPath: `/api/${endpoint}${login.path}`,
          defaultCreds: endpoint === 'pc' ? 'admin/admin123' :
                       endpoint === 'merchant' ? 'merchant/merchant123' : '手机号/密码'
        });
      }
    }
  }

  for (const s of suggestions) {
    log(`  ${s.endpoint.toUpperCase()} 端:`, 'yellow');
    log(`    登录: POST ${s.loginPath}`, 'reset');
    log(`    默认账号: ${s.defaultCreds}`, 'reset');
  }

  log('\n✅ 分析完成', 'green');
}

main();
