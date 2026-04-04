import { useCallback, useSyncExternalStore } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

// Global toast store — works outside React tree (for mutation cache callbacks)
let toasts: Toast[] = []
let listeners: (() => void)[] = []

function notify() {
  for (const l of listeners) l()
}

export const toastStore = {
  add(message: string, type: Toast['type'] = 'info', duration = 4000) {
    const id = crypto.randomUUID()
    toasts = [...toasts, { id, message, type }]
    notify()
    if (duration > 0) {
      setTimeout(() => {
        toasts = toasts.filter(t => t.id !== id)
        notify()
      }, duration)
    }
  },
  dismiss(id: string) {
    toasts = toasts.filter(t => t.id !== id)
    notify()
  },
  subscribe(listener: () => void) {
    listeners = [...listeners, listener]
    return () => { listeners = listeners.filter(l => l !== listener) }
  },
  getSnapshot() {
    return toasts
  },
  success(message: string) { this.add(message, 'success') },
  error(message: string) { this.add(message, 'error', 6000) },
  info(message: string) { this.add(message, 'info') },
}

export function useToast() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot)
  return {
    toasts,
    success: useCallback((msg: string) => toastStore.success(msg), []),
    error: useCallback((msg: string) => toastStore.error(msg), []),
    info: useCallback((msg: string) => toastStore.info(msg), []),
  }
}

export function ToastContainer() {
  const { toasts } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-5 py-3 shadow-lg text-sm flex items-center gap-3 animate-slide-in ${
            toast.type === 'error' ? 'bg-red-600 text-white' :
            toast.type === 'success' ? 'bg-on-surface text-background' :
            'bg-on-surface text-background'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : toast.type === 'success' ? 'check_circle' : 'info'}
          </span>
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => toastStore.dismiss(toast.id)} className="opacity-60 hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slideIn 0.2s ease-out; }
      `}</style>
    </div>
  )
}
