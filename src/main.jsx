import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#fff', color: '#ff0000', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>⚠️ React App Crashed</h1>
          <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <strong style={{ fontSize: '18px' }}>Error:</strong>
            <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', color: '#d9534f' }}>{this.state.error?.toString()}</pre>
          </div>
          {this.state.error?.stack && (
            <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <strong>Stack Trace:</strong>
              <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', fontSize: '12px', color: '#333' }}>{this.state.error.stack}</pre>
            </div>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
