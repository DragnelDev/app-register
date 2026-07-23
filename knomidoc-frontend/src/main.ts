import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth.store'
import './assets/styles/main.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)

const auth = useAuthStore()
if (auth.isAuthenticated) {
  // No bloquea el montaje: si falla (token vencido), el interceptor 401 y el
  // guard de rutas ya redirigen a /login.
  auth.fetchProfile().catch(() => auth.logout())
}

app.mount('#app')
