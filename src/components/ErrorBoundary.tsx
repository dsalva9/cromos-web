'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches unhandled errors in the React component tree and displays
 * a Spanish fallback UI with a retry option.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * Or with custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#1F2937] px-4">
          <div className="max-w-md w-full bg-[#374151] border-2 border-black rounded-lg p-8 text-center space-y-6">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />

            <div>
              <h1 className="text-2xl font-black text-white mb-2 uppercase">
                ¡Ups! Algo salió mal
              </h1>
              <p className="text-gray-400">
                Lo sentimos, ha ocurrido un error inesperado. Por favor, intenta de nuevo.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left">
                <summary className="text-sm text-gray-400 cursor-pointer">
                  Detalles del error (solo en desarrollo)
                </summary>
                <pre className="mt-2 text-xs text-red-400 overflow-auto p-2 bg-black rounded">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold"
              >
                Intentar de Nuevo
              </Button>
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex-1 border-2 border-black text-white"
              >
                Ir al Inicio
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
