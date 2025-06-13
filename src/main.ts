import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import routes from './router'
import { i18n } from './i18n'
import { MagicToastPlugin } from '@maas/vue-equipment/plugins'

// Start WASM preloading immediately at app startup
import { wasmPreloader } from './services/wasm-preloader'
console.log('🚀 App startup: WASM preloader initialized')

// Create the router instance
const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Create the Pinia store
const pinia = createPinia()

// Create and mount the app
const app = createApp(App)

app.use(router)
app.use(pinia)
app.use(i18n)
app.use(MagicToastPlugin)
app.mount('#app')