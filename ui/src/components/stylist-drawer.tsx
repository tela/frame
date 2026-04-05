import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { useRouterState } from '@tanstack/react-router'
import {
  useActiveStylistSession,
  useStylistSession,
  useStartStylistSession,
  useEndStylistSession,
  useSendStylistMessage,
  useCharacter,
  thumbUrl,
} from '@/lib/api'
import type { StylistMessage, StylistSessionContext } from '@/lib/types'
import { Sheet, SheetContent } from '@/components/ui/sheet'

// ===== Context for global drawer state =====

interface StylistDrawerState {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const StylistDrawerContext = createContext<StylistDrawerState>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
})

export function useStylistDrawer() {
  return useContext(StylistDrawerContext)
}

export function StylistDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <StylistDrawerContext.Provider value={{
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen(prev => !prev),
    }}>
      {children}
      <StylistDrawerSheet isOpen={isOpen} onOpenChange={setIsOpen} />
    </StylistDrawerContext.Provider>
  )
}

// ===== Derive context from route =====

function useRouteContext(): StylistSessionContext {
  const routerState = useRouterState()
  const path = routerState.location.pathname
  const ctx: StylistSessionContext = {}

  // /characters/:id
  const charMatch = path.match(/\/characters\/([^/]+)/)
  if (charMatch) ctx.character_id = charMatch[1]

  // /characters/:id/eras/:eraId
  const eraMatch = path.match(/\/characters\/[^/]+\/eras\/([^/]+)/)
  if (eraMatch) ctx.era_id = eraMatch[1]

  // Screen name from path
  if (path.includes('/studio')) ctx.screen = 'studio'
  else if (path.includes('/triage')) ctx.screen = 'triage'
  else if (path.includes('/eras/')) ctx.screen = 'era_workspace'
  else if (charMatch) ctx.screen = 'character_detail'
  else if (path.includes('/wardrobe')) ctx.screen = 'wardrobe'
  else ctx.screen = 'library'

  return ctx
}

// ===== Sheet wrapper =====

function StylistDrawerSheet({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[450px] p-0 flex flex-col border-l border-surface shadow-[-20px_0_40px_rgba(47,51,51,0.04)]">
        <StylistDrawerContent onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

// ===== Main drawer content =====

function StylistDrawerContent({ onClose }: { onClose: () => void }) {
  const routeCtx = useRouteContext()
  const { data: activeSession } = useActiveStylistSession()
  const sessionId = activeSession?.id ?? null
  const { data: session } = useStylistSession(sessionId)
  const startSession = useStartStylistSession()
  const endSession = useEndStylistSession()
  const sendMessage = useSendStylistMessage()

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Character name for header.
  const { data: character } = useCharacter(routeCtx.character_id ?? '')

  const currentSession = session ?? activeSession

  // Auto-scroll on new messages.
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight
      }
    }
  }, [currentSession?.messages?.length])

  // Focus input when drawer opens.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = () => {
    const content = input.trim()
    if (!content) return

    if (!currentSession) {
      // Start a new session then send.
      startSession.mutate(routeCtx, {
        onSuccess: (sess) => {
          sendMessage.mutate({ sessionId: sess.id, content })
          setInput('')
        },
      })
    } else {
      sendMessage.mutate({ sessionId: currentSession.id, content })
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const messages = currentSession?.messages ?? []
  const characterName = character?.display_name ?? routeCtx.character_id
  const eraLabel = character?.eras?.find(e => e.id === routeCtx.era_id)?.label

  return (
    <>
      {/* Header */}
      <div className="p-6 pt-8 border-b border-surface-low">
        <div className="flex justify-between items-start mb-1">
          <span className="text-ui text-[10px] font-bold tracking-[0.2em] text-on-surface">STYLIST</span>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {characterName && (
          <div className="flex items-baseline gap-2">
            <h2 className="font-display italic text-xl text-on-surface">{characterName}</h2>
            {eraLabel && (
              <>
                <span className="text-xs text-muted">·</span>
                <span className="text-ui text-[11px] text-muted">{eraLabel}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !currentSession && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-[40px] text-muted/20 mb-4 block">auto_fix_high</span>
            <p className="text-sm text-muted mb-1">Start a conversation with the Stylist</p>
            <p className="text-[11px] text-muted/60">Ask about looks, wardrobe, or generation workflows</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {(sendMessage.isPending || (messages.length > 0 && messages[messages.length - 1].role === 'user')) && (
          <ActivityIndicator text="Thinking..." />
        )}
      </div>

      {/* Input */}
      <div className="p-6 pb-8 border-t border-surface-low">
        <div className="flex flex-col gap-3">
          {/* Context chips */}
          {routeCtx.screen && (
            <div className="flex gap-2">
              {routeCtx.screen !== 'library' && (
                <span className="px-2 py-1 bg-surface-low text-[10px] text-ui text-primary-dim rounded-sm">
                  {routeCtx.screen.replace('_', ' ')}
                </span>
              )}
              {characterName && (
                <span className="px-2 py-1 bg-surface-low text-[10px] text-ui text-primary-dim rounded-sm">
                  {characterName}
                </span>
              )}
            </div>
          )}

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-surface-low border-0 rounded-sm py-3.5 pl-4 pr-12 text-sm resize-none placeholder:text-muted focus:ring-0 focus:outline-none"
              placeholder="Discuss style adjustments..."
              rows={1}
              disabled={sendMessage.isPending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sendMessage.isPending}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface hover:opacity-70 transition-opacity disabled:opacity-20"
            >
              <span className="material-symbols-outlined">north_east</span>
            </button>
          </div>

          {/* Bottom bar */}
          <div className="flex justify-between items-center px-1">
            <div className="flex gap-4">
              <button className="text-muted hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              </button>
              <button className="text-muted hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">draw</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              {currentSession && (
                <button
                  onClick={() => endSession.mutate(currentSession.id)}
                  className="text-[10px] text-ui text-muted hover:text-accent transition-colors"
                >
                  End Session
                </button>
              )}
              <span className="text-[10px] text-ui text-muted/50">
                Agent Pending
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ===== Message bubble =====

function MessageBubble({ message }: { message: StylistMessage }) {
  const isUser = message.role === 'user'
  const time = new Date(message.sent_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`${isUser ? 'max-w-[85%] bg-surface p-4 rounded-sm' : 'max-w-full space-y-4'}`}>
        {/* Text content */}
        <div className="text-sm leading-relaxed text-on-surface whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Image strip (stylist messages only) */}
        {message.images && message.images.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 mt-3">
            {message.images.map((img) => (
              <div key={img.id} className="flex-shrink-0 w-44 group relative">
                <div className="aspect-[3/4] bg-surface-high overflow-hidden rounded-sm">
                  <img
                    src={img.thumb_url || thumbUrl(img.id)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Triage hover actions */}
                  <div className="absolute inset-x-0 bottom-0 p-2 flex justify-center gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
                    <button className="bg-surface-lowest h-8 w-8 rounded-full flex items-center justify-center shadow-sm text-on-surface hover:bg-on-surface hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </button>
                    <button className="bg-surface-lowest h-8 w-8 rounded-full flex items-center justify-center shadow-sm text-on-surface hover:bg-on-surface hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <span className="text-[10px] text-ui tracking-[0.15em] text-muted mt-2">{time}</span>
    </div>
  )
}

// ===== Activity indicator =====

function ActivityIndicator({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
        <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
      <span className="text-[10px] text-ui tracking-[0.15em] text-muted italic">{text}</span>
    </div>
  )
}

// ===== Trigger button for nav sidebar =====

export function StylistTriggerButton() {
  const { toggle } = useStylistDrawer()
  const { data: activeSession } = useActiveStylistSession()

  return (
    <button
      onClick={toggle}
      className="text-ui text-[13px] transition-colors flex items-center gap-3 text-muted hover:text-primary w-full"
    >
      <span className="material-symbols-outlined text-[18px]" style={activeSession ? { fontVariationSettings: "'FILL' 1" } : {}}>
        auto_fix_high
      </span>
      Stylist
      {activeSession && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto" />
      )}
    </button>
  )
}
