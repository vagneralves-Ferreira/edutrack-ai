import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Catches unexpected runtime errors in child routes and renders a friendly recovery UI. */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Erro capturado pelo ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bento-card max-w-md w-full rounded-3xl p-7 text-center space-y-4">
            <h2 className="text-lg font-extrabold text-white">Algo deu errado</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ocorreu um erro inesperado ao exibir esta tela. Clique abaixo para recarregar o aplicativo.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs font-bold cursor-pointer"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
