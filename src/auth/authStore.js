// src/auth/authStore.js

const TOKEN_KEY = 'patrol_token'
const USER_KEY = 'patrol_user'
const AUTH_MODE_KEY = 'patrol_auth_mode'

function getItemFromStores(key) {
  const sessionValue = sessionStorage.getItem(key)
  if (sessionValue) return sessionValue
  return localStorage.getItem(key)
}

function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function saveAuth(token, user, remember = true) {
  clearAuthStorage()

  const store = remember ? localStorage : sessionStorage
  store.setItem(TOKEN_KEY, token)
  store.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem(AUTH_MODE_KEY, remember ? 'persistent' : 'session')
}

export function getToken() {
  return getItemFromStores(TOKEN_KEY)
}

export function getUser() {
  const raw = getItemFromStores(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return !!getToken()
}

export function logout() {
  clearAuthStorage()
  localStorage.removeItem(AUTH_MODE_KEY)
}
