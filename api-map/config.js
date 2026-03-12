/**
 * API Inspector 配置文件
 * 管理不同端的扫描和测试配置
 */

// 各端的配置
const PLATFORM_CONFIG = {
  // PC 管理端
  pc: {
    name: 'PC管理端',
    routerFile: 'apps/pc-admin/src/router/index.js',
    apiDir: 'apps/pc-admin/src/api',
    viewsDir: 'apps/pc-admin/src/views',
    baseURL: 'http://192.168.31.188/api',
    loginEndpoint: '/pc/auth/login',
    // 登录凭证（实际使用时从环境变量或交互输入）
    credentials: {
      username: process.env.PC_TEST_USERNAME || 'admin',
      password: process.env.PC_TEST_PASSWORD || 'admin123'
    },
    // 输出配置
    output: {
      docDir: 'docs/api-inspector/pc',
      snapshotDir: 'docs/api-inspector/pc/snapshots'
    }
  },

  // 移动端 H5
  mobile: {
    name: '移动端H5',
    routerFile: 'apps/mobile-h5/src/router/index.js',
    apiDir: 'apps/mobile-h5/src/api',
    viewsDir: 'apps/mobile-h5/src/views',
    baseURL: 'http://192.168.31.188/api',
    // 移动端使用微信登录，需要特殊处理
    loginEndpoint: '/mobile/auth/wechat-login',
    credentials: {
      // H5使用token方式，可以通过先手动获取token
      token: process.env.MOBILE_TEST_TOKEN
    },
    output: {
      docDir: 'docs/api-inspector/mobile',
      snapshotDir: 'docs/api-inspector/mobile/snapshots'
    }
  },

  // 商户端 H5
  merchant: {
    name: '商户端H5',
    routerFile: 'apps/merchant-h5/src/router/index.js',
    apiDir: 'apps/merchant-h5/src/api',
    viewsDir: 'apps/merchant-h5/src/views',
    baseURL: 'http://192.168.31.188/api',
    loginEndpoint: '/merchant/auth/login',
    credentials: {
      phone: process.env.MERCHANT_TEST_PHONE || '13800138000',
      code: process.env.MERCHANT_TEST_CODE || '123456'
    },
    output: {
      docDir: 'docs/api-inspector/merchant',
      snapshotDir: 'docs/api-inspector/merchant/snapshots'
    }
  }
}

// 测试配置
const TEST_CONFIG = {
  // 请求超时时间
  timeout: 30000,
  
  // 并发请求数
  concurrency: 3,
  
  // 测试参数默认值
  defaultParams: {
    page: 1,
    size: 10,
    keyword: '测试',
    id: 1
  },
  
  // 需要跳过的API模式（如上传、导出等）
  skipPatterns: [
    '/upload',
    '/export',
    '/import',
    '/download',
    '/template',
    '/test-connection'  // 特殊操作
  ],
  
  // 只需要测试GET请求的API（查询类）
  readOnlyPatterns: [
    '/statistics',
    '/list',
    '/detail',
    '/options',
    '/tree'
  ]
}

// 文档模板配置
const DOC_CONFIG = {
  // 文档版本
  version: '1.0.0',
  
  // 生成日期格式
  dateFormat: 'YYYY-MM-DD HH:mm:ss',
  
  // 模板路径
  templates: {
    index: 'scripts/api-inspector/templates/index.md',
    module: 'scripts/api-inspector/templates/module.md',
    api: 'scripts/api-inspector/templates/api.md'
  }
}

module.exports = {
  PLATFORM_CONFIG,
  TEST_CONFIG,
  DOC_CONFIG
}
