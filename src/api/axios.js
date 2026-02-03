import axios from 'axios'
import { getToken } from '../auth/authStore'

const API_URL = 'https://patrolscan.onrender.com/api'

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
