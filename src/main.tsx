import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

let refreshing = false

registerSW({
  immediate: true,
  onRegisteredSW() {
    // 首次安装（页面尚无 controller）时接管不打断用户：避免每次新访问都被整页重载一遍；
    // 仅当已有旧 SW 被新版本接管时重载以生效新代码
    const firstInstall = !navigator.serviceWorker.controller
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      if (firstInstall) return
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
