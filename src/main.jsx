// React 진입점. 전역 CSS와 App을 연결하고 개발 중 StrictMode로 effect 정리 누락을 점검합니다.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
