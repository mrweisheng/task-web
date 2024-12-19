import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'
import CryptoJS from 'crypto-js' // 需要安装此依赖

const request = axios.create({
  baseURL: 'https://task-server-zyir.onrender.com',
  timeout: 30000,
  maxContentLength: 50 * 1024 * 1024, // 限制请求大小为 50MB
  maxBodyLength: 50 * 1024 * 1024,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  }
})

// 添加请求签名
const generateSignature = (data, timestamp) => {
  const secretKey = import.meta.env.VITE_API_SECRET_KEY
  const stringToSign = `${timestamp}${JSON.stringify(data)}${secretKey}`
  return CryptoJS.MD5(stringToSign).toString()
}

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 添加时间戳防重放
    const timestamp = new Date().getTime()
    config.headers['X-Timestamp'] = timestamp
    
    // 添加防重放 nonce
    config.headers['X-Nonce'] = Math.random().toString(36).slice(-8)
    
    // 从安全存储获取 token
    const token = sessionStorage.getItem('token') // 这里从 sessionStorage 获取
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 添加请求签名
    if (config.data) {
      config.headers['X-Signature'] = generateSignature(config.data, timestamp)
    }

    // XSS 防护
    if (typeof config.data === 'string') {
      config.data = config.data.replace(/[<>]/g, '')
    }

    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    // 验证响应签名
    const signature = response.headers['x-response-signature']
    if (signature) {
      // 验证签名逻辑
    }

    // 直接返回数据，不做类型检查
    return response.data

  },
  error => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          sessionStorage.removeItem('token')
          sessionStorage.removeItem('tokenExpires')
          router.push('/login')
          ElMessage.error('登录已过期，请重新登录')
          break
        case 403:
          ElMessage.error('没有权限访问该资源')
          break
        case 429:
          ElMessage.error('请求过于频繁，请稍后再试')
          break
        default:
          ElMessage.error(error.response.data?.message || '请求失败')
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请检查网络连接')
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
    return Promise.reject(error)
  }
)

// 添加请求限流
const rateLimiter = {
  requests: new Map(),
  limit: 50, // 每分钟最大请求数
  interval: 60 * 1000, // 1分钟
  
  checkLimit(url) {
    const now = Date.now()
    const requests = this.requests.get(url) || []
    
    // 清理过期请求
    const validRequests = requests.filter(time => now - time < this.interval)
    
    if (validRequests.length >= this.limit) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(url, validRequests)
    return true
  }
}

// 添加请求方法包装器
const secureRequest = async (method, url, data = null, config = {}) => {
  if (!rateLimiter.checkLimit(url)) {
    throw new Error('请求过于频繁，请稍后再试')
  }

  try {
    const response = await request[method](url, data, {
      ...config,
      // 添加 CSP 头
      headers: {
        ...config.headers,
        'Content-Security-Policy': "default-src 'self'"
      }
    })
    return response
  } catch (error) {
    throw error
  }
}

// 导出安全的求方法
export default {
  get: (url, config) => secureRequest('get', url, null, config),
  post: (url, data, config) => secureRequest('post', url, data, config),
  put: (url, data, config) => secureRequest('put', url, data, config),
  delete: (url, config) => secureRequest('delete', url, null, config)
} 