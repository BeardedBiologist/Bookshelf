import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { router } from './router'
import './styles/tokens.css'
import './styles/base.css'

import { installViewportGapFix } from './utils/viewportFix'

registerSW({ immediate: true })
installViewportGapFix()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
