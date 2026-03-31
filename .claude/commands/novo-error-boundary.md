Crie um Error Boundary completo com retry e fallback customizavel no padrao SISAM.

Entrada: $ARGUMENTS (nome do projeto ou "default")

## Criar `components/error-boundary.tsx`
```typescript
'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary:', error, errorInfo)
    }
    // Em producao: enviar para servico de monitoramento (Sentry, etc.)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Algo deu errado</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Ocorreu um erro ao carregar este componente.
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <span className="block mt-2 text-sm text-red-600 font-mono">{this.state.error.message}</span>
              )}
            </p>
            <button onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary

// HOC wrapper para componentes funcionais
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}
```

## Uso no layout raiz
```typescript
import ErrorBoundary from '@/components/error-boundary'

export default function RootLayout({ children }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ErrorBoundary>
  )
}
```

## Uso em paginas especificas
```typescript
<ErrorBoundary fallback={<p>Erro ao carregar grafico</p>}>
  <GraficoComplexo dados={dados} />
</ErrorBoundary>
```

## Regras
- SEMPRE envolver o layout raiz com ErrorBoundary
- Envolver componentes complexos (graficos, mapas) individualmente
- Em dev: mostrar mensagem do erro
- Em prod: mensagem generica + botao retry
- Nunca expor stack trace em producao
