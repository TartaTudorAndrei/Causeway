import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
interface Props {
    children: ReactNode;
    fallbackTitle?: string;
    fallbackMessage?: string;
    isDarkMode?: boolean;
}
interface State {
    hasError: boolean;
    error: Error | null;
}
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };
    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }
    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    }
    public handleReset = () => {
        this.setState({ hasError: false, error: null });
    };
    public render() {
        if (this.state.hasError) {
            const isDark = this.props.isDarkMode ?? true;
            return (<div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center space-y-4 my-4 ${isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800 shadow-sm'}`}>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center"></div>
          <div className="space-y-1 max-w-md">
            <h3 className="font-bold text-base text-zinc-100">
              {this.props.fallbackTitle || 'A apărut o eroare la afișare'}
            </h3>
            <p className="text-xs text-zinc-400">
              {this.props.fallbackMessage ||
                    this.state.error?.message ||
                    'Componenta nu a putut fi randată. Vă rugăm să reîncărcați sau să reîncercați.'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button type="button" onClick={this.handleReset} className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer flex items-center space-x-1.5"><span>Reîncearcă</span>
            </button>
            <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition cursor-pointer">
              Reîncarcă Pagina
            </button>
          </div>
        </div>);
        }
        return this.props.children;
    }
}
