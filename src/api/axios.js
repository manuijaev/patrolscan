import axios from 'axios'
import { getToken } from '../auth/authStore'

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function normalizeApiUrl(url) {
  if (!url) return url
  const trimmed = url.replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

function alternateApiUrl(url) {
  if (!url) return url
  const trimmed = url.replace(/\/+$/, '')
  if (trimmed.endsWith('/api')) return trimmed.replace(/\/api$/, '')
  return `${trimmed}/api`
}

const API_URL = normalizeApiUrl(RAW_API_URL)

console.log('API_URL:', API_URL)

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

api.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const status = error?.response?.status
    const originalRequest = error?.config

    if (!originalRequest || status !== 404 || originalRequest._retryWithAlternateBase) {
      return Promise.reject(error)
    }

    const currentBase = (originalRequest.baseURL || API_URL || '').replace(/\/+$/, '')
    const fallbackBase = alternateApiUrl(currentBase)

    if (!fallbackBase || fallbackBase === currentBase) {
      return Promise.reject(error)
    }

    originalRequest._retryWithAlternateBase = true
    originalRequest.baseURL = fallbackBase
    console.warn(`API 404 retry: ${currentBase} -> ${fallbackBase}`)
    return api.request(originalRequest)
  }
)

export default api
