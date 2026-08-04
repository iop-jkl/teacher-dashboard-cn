import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[app] unhandled error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center px-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-md w-full p-6 text-center">
            <h1 className="text-base font-semibold text-gray-900 mb-2">
              页面出错了
            </h1>
            <p className="text-sm text-gray-500 break-all mb-4">
              {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#2dd4bf] text-white text-sm rounded-lg hover:bg-[#14b8a6] transition-colors"
            >
              刷新重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
