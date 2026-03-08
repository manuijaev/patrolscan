import axios from 'axios'
import { getToken } from '../auth/authStore'

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function normalizeApiUrl(url) {
  if (!url) return url
  const trimmed = url.replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
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

export default api
