import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WeatherGPT Uncaught Error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-amber-400 flex items-center justify-center mb-4 shadow-xl shadow-sky-500/25">
            <span className="text-3xl">🌦️</span>
          </div>
          <h1 className="text-xl font-black mb-2">WeatherGPT</h1>
          <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
            Application encountered an issue. Tap below to continue to the dashboard.
          </p>
          {this.state.error && (
            <div className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-800/80 p-3 rounded-2xl max-w-xs overflow-auto text-left mb-6 font-mono break-words">
              {this.state.error.message}
            </div>
          )}
          <div className="flex flex-col space-y-2.5 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-black text-sm shadow-xl shadow-sky-500/30 transition-all active:scale-95"
            >
              Open WeatherGPT Dashboard
            </button>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-xs transition-all"
            >
              Reset App Data & Re-onboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
