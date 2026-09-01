import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ApplicationProvider } from './state/ApplicationContext'
import { WebMcpProvider } from './webmcp/WebMcpContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <ApplicationProvider>
    <WebMcpProvider>
      <App />
    </WebMcpProvider>
  </ApplicationProvider>,
)
