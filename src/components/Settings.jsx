const FONTS = [
  { label: 'Inter',          value: 'Inter, system-ui, sans-serif' },
  { label: 'DM Mono',        value: "'DM Mono', monospace" },
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { label: 'IBM Plex Mono',  value: "'IBM Plex Mono', monospace" },
  { label: 'Geist',          value: "'Geist', system-ui, sans-serif" },
  { label: 'Outfit',         value: "'Outfit', system-ui, sans-serif" },
  { label: 'Space Grotesk',  value: "'Space Grotesk', system-ui, sans-serif" },
  { label: 'Figtree',        value: "'Figtree', system-ui, sans-serif" },
]

/* ─── small building blocks ──────────────────────────────── */

function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: '0.68em', fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.1em', color: 'var(--text-muted)',
      margin: '1.1rem 0 0.5rem',
      paddingBottom: '0.3rem',
      borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
    }}>
      {title}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: '0.5rem',
      marginBottom: '0.55rem',
    }}>
      <span style={{ fontSize: '0.82em', color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

function Slider({ value, min, max, step = 1, onChange, unit = '', width = 90 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width, accentColor: 'var(--accent)' }}
      />
      <span style={{ fontSize: '0.75em', color: 'var(--text-dim)', minWidth: '2.8rem', textAlign: 'right' }}>
        {value}{unit}
      </span>
    </div>
  )
}

function ColorSwatch({ value, onChange }) {
  return (
    <input
      type="color"
      value={(value || '#000000').slice(0, 7)}
      onChange={e => onChange(e.target.value)}
      style={{
        width: 34, height: 24,
        border: '1px solid var(--border)',
        borderRadius: 4,
        background: 'none',
        cursor: 'pointer',
        padding: 1,
      }}
    />
  )
}

function TabToggle({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
    }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '0.2rem 0.65rem',
            fontSize: '0.78em',
            background: value === o.value ? 'var(--accent-dim)' : 'transparent',
            color: value === o.value ? 'var(--accent)' : 'var(--text-dim)',
            border: 'none',
            borderLeft: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.12s',
            whiteSpace: 'nowrap',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ResetBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Reset to default"
      style={{
        fontSize: '0.7em', color: 'var(--text-muted)',
        background: 'none',
        border: '1px solid var(--border)',
        borderRadius: 3,
        padding: '0.1rem 0.3rem',
        cursor: 'pointer',
        lineHeight: 1,
      }}
    >
      ↺
    </button>
  )
}

/* ─── Main Settings component ────────────────────────────── */

export default function Settings({
  theme, setTheme,
  onSave, onClose,
  onImageUpload,
  onExportBackup, onImportBackup,
  fileRef, backupFileRef,
  importingBackup,
}) {
  const up = patch => setTheme(prev => ({ ...prev, ...patch }))
  const side = theme.settingsSide || 'right'

  const panelStyle = {
    position: 'fixed',
    top: 0,
    bottom: 0,
    [side]: 0,
    width: 'min(460px, 78vw)',
    background: 'var(--bg2, #13131a)',
    borderLeft: side === 'right' ? '1px solid var(--border)' : 'none',
    borderRight: side === 'left'  ? '1px solid var(--border)' : 'none',
    boxShadow: side === 'right'
      ? '-20px 0 60px rgba(0,0,0,0.55)'
      : '20px 0 60px rgba(0,0,0,0.55)',
    zIndex: 101,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--font)',
    fontSize: 'var(--settings-font-size, 13px)',
    animation: side === 'right' ? 'slide-in 0.2s ease' : 'slide-in-left 0.2s ease',
  }

  const footerStyle = {
    position: 'sticky',
    bottom: 0,
    [side]: 0,
    padding: '0.85rem 1.5rem',
    background: 'var(--bg2, #13131a)',
    borderTop: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
    display: 'flex',
    gap: '0.6rem',
    flexShrink: 0,
  }

  return (
    <>
      {/* veil */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.25)' }}
      />

      <div style={panelStyle} data-side={side}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem 0.75rem',
          borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.92em' }}>Settings</span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'var(--text-dim)',
              fontSize: '1.1em', cursor: 'pointer',
              padding: '0.15rem 0.4rem', borderRadius: 4,
            }}
          >✕</button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.5rem 1rem' }}>

          {/* PANEL */}
          <SectionHeader title="Panel" />
          <Row label="Position">
            <TabToggle
              options={[{ label: '← Left', value: 'left' }, { label: 'Right →', value: 'right' }]}
              value={side}
              onChange={v => up({ settingsSide: v })}
            />
          </Row>

          {/* COLORS */}
          <SectionHeader title="Colors" />
          <Row label="Background">
            <ColorSwatch value={theme.bg} onChange={v => up({ bg: v })} />
          </Row>
          <Row label="Text">
            <ColorSwatch value={theme.text} onChange={v => up({ text: v })} />
          </Row>
          <Row label="Accent">
            <ColorSwatch value={theme.accent} onChange={v => up({ accent: v })} />
          </Row>
          <Row label="Card">
            <ColorSwatch
              value={(theme.card || '#111827').slice(0, 7)}
              onChange={v => {
                const alpha = (theme.card || '#111827cc').slice(7) || 'cc'
                up({ card: v + alpha })
              }}
            />
          </Row>
          <Row label="Line / border">
            <ColorSwatch value={theme.line} onChange={v => up({ line: v })} />
          </Row>

          {/* LAYOUT */}
          <SectionHeader title="Layout" />
          <Row label="Columns">
            <Slider value={theme.columns ?? 4} min={1} max={8} onChange={v => up({ columns: v })} />
          </Row>
          <Row label="Page width">
            <Slider value={theme.pageWidth ?? 1400} min={800} max={2400} step={50} onChange={v => up({ pageWidth: v })} unit="px" width={80} />
          </Row>
          <Row label="Top gap">
            <Slider value={theme.mainGapTop ?? 12} min={0} max={120} onChange={v => up({ mainGapTop: v })} unit="px" />
          </Row>
          <Row label="Page gap">
            <Slider value={theme.pageGap ?? 14} min={0} max={60} onChange={v => up({ pageGap: v })} unit="px" />
          </Row>
          <Row label="Card gap">
            <Slider value={theme.cardGap ?? 12} min={0} max={40} onChange={v => up({ cardGap: v })} unit="px" />
          </Row>

          {/* CARDS */}
          <SectionHeader title="Cards" />
          <Row label="Corner radius">
            <Slider value={theme.cardRadius ?? 16} min={0} max={32} onChange={v => up({ cardRadius: v })} unit="px" />
          </Row>
          <Row label="Blur">
            <Slider value={theme.cardBlur ?? 10} min={0} max={40} onChange={v => up({ cardBlur: v })} unit="px" />
          </Row>
          <Row label="Shadow">
            <Slider value={theme.cardShadow ?? 25} min={0} max={60} onChange={v => up({ cardShadow: v })} unit="px" />
          </Row>
          <Row label="Link style">
            <TabToggle
              options={[{ label: 'Solid', value: 'solid' }, { label: 'Glass', value: 'glass' }]}
              value={theme.linkStyle || 'solid'}
              onChange={v => up({ linkStyle: v })}
            />
          </Row>
          <Row label="Section style">
            <TabToggle
              options={[{ label: 'Glass', value: 'glass' }, { label: 'Flat', value: 'flat' }]}
              value={theme.sectionStyle || 'glass'}
              onChange={v => up({ sectionStyle: v })}
            />
          </Row>

          {/* TYPOGRAPHY */}
          <SectionHeader title="Typography" />
          <Row label="Font">
            <select
              value={theme.font}
              onChange={e => up({ font: e.target.value })}
              style={{
                fontSize: '0.8em',
                background: 'var(--bg3, #1a1a24)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '0.22rem 0.5rem',
                cursor: 'pointer',
                maxWidth: 160,
              }}
            >
              {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Row>
          <Row label="Title size">
            <Slider value={theme.titleSize ?? 28} min={16} max={48} onChange={v => up({ titleSize: v })} unit="px" />
          </Row>
          <Row label="Section title">
            <Slider value={theme.sectionTitleSize ?? 18} min={10} max={28} onChange={v => up({ sectionTitleSize: v })} unit="px" />
          </Row>
          <Row label="Link size">
            <Slider value={theme.linkSize ?? 15} min={10} max={22} onChange={v => up({ linkSize: v })} unit="px" />
          </Row>

          {/* SECTIONS */}
          <SectionHeader title="Sections" />
          <Row label="Handle opacity">
            <Slider
              value={Math.round((theme.handleOpacity ?? 0.15) * 100)}
              min={0} max={100}
              onChange={v => up({ handleOpacity: v / 100 })}
              unit="%"
            />
          </Row>

          {/* NOTES */}
          <SectionHeader title="Notes" />
          <Row label="Font size">
            <Slider value={theme.noteSize ?? 15} min={10} max={22} onChange={v => up({ noteSize: v })} unit="px" />
          </Row>
          <Row label="Gap between notes">
            <Slider value={theme.notesGap ?? 8} min={0} max={40} onChange={v => up({ notesGap: v })} unit="px" />
          </Row>
          <Row label="Card color">
            <ColorSwatch
              value={theme.notesCard || theme.card?.slice(0, 7) || '#111827'}
              onChange={v => up({ notesCard: v })}
            />
            <ResetBtn onClick={() => up({ notesCard: '' })} />
          </Row>
          <Row label="Text color">
            <ColorSwatch
              value={theme.notesText || theme.text || '#e8eefc'}
              onChange={v => up({ notesText: v })}
            />
            <ResetBtn onClick={() => up({ notesText: '' })} />
          </Row>
          <Row label="Background color">
            <ColorSwatch
              value={theme.notesBg || theme.bg || '#0b0f17'}
              onChange={v => up({ notesBg: v })}
            />
            <ResetBtn onClick={() => up({ notesBg: '' })} />
          </Row>

          {/* WALLPAPER */}
          <SectionHeader title="Wallpaper" />
          <Row label="Image">
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                fontSize: '0.8em', padding: '0.25rem 0.65rem',
                background: 'var(--bg3, #1a1a24)', border: '1px solid var(--border)',
                borderRadius: 4, color: 'var(--text)', cursor: 'pointer',
              }}
            >
              Upload
            </button>
            {theme.wallpaper && (
              <button
                onClick={() => setTheme(p => ({ ...p, wallpaper: '' }))}
                style={{
                  fontSize: '0.78em', padding: '0.25rem 0.5rem',
                  background: 'none', border: '1px solid var(--danger)',
                  borderRadius: 4, color: 'var(--danger)', cursor: 'pointer',
                }}
              >
                ✕ Remove
              </button>
            )}
            <input
              ref={fileRef} type="file" accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { onImageUpload(e.target.files?.[0]); e.target.value = '' }}
            />
          </Row>
          {theme.wallpaper && (
            <>
              <Row label="Fit">
                <TabToggle
                  options={[
                    { label: 'Cover', value: 'cover' },
                    { label: 'Contain', value: 'contain' },
                    { label: 'Fill', value: 'fill' },
                  ]}
                  value={theme.wallpaperFit || 'cover'}
                  onChange={v => up({ wallpaperFit: v })}
                />
              </Row>
              <Row label="Blur">
                <Slider value={theme.wallpaperBlur ?? 0} min={0} max={40} onChange={v => up({ wallpaperBlur: v })} unit="px" />
              </Row>
              <Row label="Dim">
                <Slider value={theme.wallpaperDim ?? 35} min={0} max={100} onChange={v => up({ wallpaperDim: v })} unit="%" />
              </Row>
              <Row label="Opacity">
                <Slider value={theme.wallpaperOpacity ?? 100} min={0} max={100} onChange={v => up({ wallpaperOpacity: v })} unit="%" />
              </Row>
              <Row label="Scale">
                <Slider value={theme.wallpaperScale ?? 100} min={50} max={200} onChange={v => up({ wallpaperScale: v })} unit="%" />
              </Row>
              <Row label="X position">
                <Slider value={theme.wallpaperX ?? 50} min={0} max={100} onChange={v => up({ wallpaperX: v })} unit="%" />
              </Row>
              <Row label="Y position">
                <Slider value={theme.wallpaperY ?? 50} min={0} max={100} onChange={v => up({ wallpaperY: v })} unit="%" />
              </Row>
            </>
          )}

          {/* BACKUP */}
          <SectionHeader title="Backup" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <button
              onClick={onExportBackup}
              style={{
                padding: '0.38rem 0.75rem', fontSize: '0.82em', textAlign: 'left',
                background: 'var(--bg3, #1a1a24)', border: '1px solid var(--border)',
                borderRadius: 4, color: 'var(--text)', cursor: 'pointer',
              }}
            >
              ⬇ Export backup
            </button>
            <button
              onClick={() => backupFileRef.current?.click()}
              disabled={importingBackup}
              style={{
                padding: '0.38rem 0.75rem', fontSize: '0.82em', textAlign: 'left',
                background: 'var(--bg3, #1a1a24)', border: '1px solid var(--border)',
                borderRadius: 4,
                color: importingBackup ? 'var(--text-muted)' : 'var(--text)',
                cursor: importingBackup ? 'default' : 'pointer',
                opacity: importingBackup ? 0.6 : 1,
              }}
            >
              {importingBackup ? '⟳ Importing…' : '⬆ Import backup'}
            </button>
            <input
              ref={backupFileRef} type="file" accept=".json"
              style={{ display: 'none' }}
              onChange={onImportBackup}
            />
          </div>

        </div>

        {/* ── Footer ── */}
        <div style={footerStyle}>
          <button
            onClick={onSave}
            style={{
              flex: 1, padding: '0.45rem',
              fontSize: '0.84em', fontWeight: 600,
              background: 'var(--accent)', color: '#000',
              border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            Save theme
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.45rem 1rem', fontSize: '0.84em',
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

      </div>
    </>
  )
}