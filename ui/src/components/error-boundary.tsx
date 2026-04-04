import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-accent mb-4">error</span>
          <h2 className="font-display text-2xl text-on-surface mb-2">Something went wrong</h2>
          <p className="text-muted text-[13px] mb-6 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold tracking-widest hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
