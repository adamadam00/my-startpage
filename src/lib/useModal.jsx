import { useState, useCallback, useRef } from 'react'

// Custom modal to replace window.alert / window.confirm / window.prompt
// Returns { modal, alert, confirm, prompt } — render <modal /> in your component tree

export function useModal() {
  const [state, setState] = useState(null)
  const resolveRef = useRef(null)

  const open = useCallback((config) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState(config)
    })
  }, [])

  const close = useCallback((value) => {
    setState(null)
    resolveRef.current?.(value)
    resolveRef.current = null
  }, [])

  const alert = useCallback((message) => open({ type: 'alert', message }), [open])
  const confirm = useCallback((message) => open({ type: 'confirm', message }), [open])
  const prompt = useCallback((message, defaultValue = '') => open({ type: 'prompt', message, defaultValue }), [open])

  const Modal = useCallback(() => {
    if (!state) return null
    return <ModalUI state={state} onClose={close} />
  }, [state, close])

  return { Modal, alert, confirm, prompt }
}

function ModalUI({ state, onClose }) {
  const [value, setValue] = useState(state.defaultValue || '')
  const inputRef = useRef(null)

  // Focus input or OK button on mount
  const containerRef = useCallback((el) => {
    if (!el) return
    setTimeout(() => {
      if (state.type === 'prompt') inputRef.current?.focus()
      else el.querySelector('.modal-ok')?.focus()
    }, 50)
  }, [state.type])

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      if (state.type === 'alert') onClose(undefined)
      else if (state.type === 'confirm') onClose(true)
      else if (state.type === 'prompt') onClose(value)
    }
    if (e.key === 'Escape') {
      if (state.type === 'alert') onClose(undefined)
      else onClose(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(state.type === 'alert' ? undefined : false) }}
    >
      <div
        ref={containerRef}
        onKeyDown={handleKey}
        style={{
          background: 'var(--bg2, #1a1a2e)',
          border: '1px solid var(--border, #333)',
          borderRadius: 'var(--radius, 8px)',
          padding: '1.25rem 1.5rem',
          minWidth: '280px',
          maxWidth: '420px',
          width: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          fontFamily: 'var(--font, sans-serif)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text, #fff)', lineHeight: 1.5 }}>
          {state.message}
        </p>

        {state.type === 'prompt' && (
          <input
            ref={inputRef}
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ fontSize: '0.85em' }}
          />
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          {state.type !== 'alert' && (
            <button
              className="btn"
              style={{ fontSize: '0.82em' }}
              onClick={() => onClose(state.type === 'confirm' ? false : null)}
            >
              Cancel
            </button>
          )}
          <button
            className="btn btn-primary modal-ok"
            style={{ fontSize: '0.82em' }}
            onClick={() => {
              if (state.type === 'alert') onClose(undefined)
              else if (state.type === 'confirm') onClose(true)
              else onClose(value)
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
