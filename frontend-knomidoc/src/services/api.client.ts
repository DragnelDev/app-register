import axios, { type InternalAxiosRequestConfig, AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth.store'
import router from '@/router'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  timeout: 15000,
})

// Adjunta el JWT en cada request saliente
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers = config.headers ?? {}
    if (typeof config.headers === 'object') {
      if ('set' in config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${auth.accessToken}`)
      } else {
        ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${auth.accessToken}`
      }
    }
  }
  return config
})

// Maneja expiración de sesión de forma centralizada
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      const currentRoute = router.currentRoute.value

      if (!isLoginRequest) {
        const auth = useAuthStore()
        auth.logout()
        if (currentRoute.name !== 'login') {
          router.replace({ name: 'login', query: { redirect: currentRoute.fullPath } })
        }
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
