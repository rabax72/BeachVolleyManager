import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';

interface State {
  error: Error | null;
}

/** Evita la pagina bianca: mostra un messaggio e permette di riprovare. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="card border-red-200 bg-red-50">
        <h2 className="mb-1 text-lg font-bold text-red-900">{t('common.errorTitle')}</h2>
        <p className="mb-2 text-sm text-red-900">{t('common.errorText')}</p>
        <pre className="mb-3 overflow-x-auto text-xs whitespace-pre-wrap text-red-800">
          {this.state.error.message}
        </pre>
        <button className="btn btn-secondary" onClick={() => this.setState({ error: null })}>
          {t('common.retry')}
        </button>
      </div>
    );
  }
}
