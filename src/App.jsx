import { useMemo } from 'react'

const fonts = [
  'Inter, system-ui, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  '"Times New Roman", serif',
  'Verdana, sans-serif',
  '"Trebuchet MS", sans-serif',
  '"Courier New", monospace',
  '"Fira Code", monospace',
]

const wallpapers = [
  { name: 'None', url: '' },
  { name: 'Mountains', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop' },
  { name: 'Ocean', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop' },
  { name: 'Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1600&auto=format&fit=crop' },
  { name: 'City', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1600&auto=format&fit=crop' },
  { name: 'Space', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1600&auto=format&fit=crop' },
]

export default function Settings({
  theme,
  setTheme,
  onSave,
  onClose,
  onImageUpload,
  onExportBackup,
  onImportBackup,
  fileRef,
  backupFileRef,
  importingBackup = false,
}) {
  const previewStyle = useMemo(() => ({
    '--bg': theme.bg,
    '--text': theme.text,
    '--accent': theme.accent,
    '--card': theme.card,
    '--line': theme.line,
    '--card-radius': `${theme.cardRadius}px`,
    '--font': theme.font,
  }), [theme])

  const set = (patch) => setTheme(prev => ({ ...prev, ...patch }))

  return (
    <>
      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>

      <div className="settings-backdrop" onClick={onClose} />

      <aside className="settings-panel" data-side={theme.settingsSide || 'right'}>
        <div className="settings-header">
          <div>
            <div className="settings-kicker">Appearance</div>
            <h2>Settings</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="settings-body">
          <section className="settings-section">
            <h3>Colors</h3>
            <div className="grid-2">
              <label>
                <span>Background</span>
                <input type="color" value={theme.bg} onChange={(e) => set({ bg: e.target.value })} />
              </label>

              <label>
                <span>Text</span>
                <input type="color" value={theme.text} onChange={(e) => set({ text: e.target.value })} />
              </label>

              <label>
                <span>Accent</span>
                <input type="color" value={theme.accent} onChange={(e) => set({ accent: e.target.value })} />
              </label>

              <label>
                <span>Card</span>
                <input type="color" value={theme.card.slice(0, 7)} onChange={(e) => set({ card: e.target.value + 'cc' })} />
              </label>

              <label>
                <span>Line</span>
                <input type="color" value={theme.line} onChange={(e) => set({ line: e.target.value })} />
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>Typography</h3>
            <div className="grid-2">
              <label>
                <span>Font</span>
                <select value={theme.font} onChange={(e) => set({ font: e.target.value })}>
                  {fonts.map(font => <option key={font} value={font}>{font}</option>)}
                </select>
              </label>

              <label>
                <span>Title size</span>
                <input
                  type="range"
                  min="18"
                  max="48"
                  value={theme.titleSize}
                  onChange={(e) => set({ titleSize: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Section title size</span>
                <input
                  type="range"
                  min="14"
                  max="28"
                  value={theme.sectionTitleSize}
                  onChange={(e) => set({ sectionTitleSize: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Link size</span>
                <input
                  type="range"
                  min="12"
                  max="22"
                  value={theme.linkSize}
                  onChange={(e) => set({ linkSize: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Note size</span>
                <input
                  type="range"
                  min="12"
                  max="22"
                  value={theme.noteSize}
                  onChange={(e) => set({ noteSize: Number(e.target.value) })}
                />
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>Layout</h3>
            <div className="grid-2">
              <label>
                <span>Page width</span>
                <input
                  type="range"
                  min="900"
                  max="1800"
                  step="10"
                  value={theme.pageWidth}
                  onChange={(e) => set({ pageWidth: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Columns</span>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={theme.columns}
                  onChange={(e) => set({ columns: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Page gap</span>
                <input
                  type="range"
                  min="4"
                  max="40"
                  value={theme.pageGap}
                  onChange={(e) => set({ pageGap: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Card gap</span>
                <input
                  type="range"
                  min="4"
                  max="32"
                  value={theme.cardGap}
                  onChange={(e) => set({ cardGap: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Card radius</span>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={theme.cardRadius}
                  onChange={(e) => set({ cardRadius: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Card blur</span>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={theme.cardBlur}
                  onChange={(e) => set({ cardBlur: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Shadow</span>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={theme.cardShadow}
                  onChange={(e) => set({ cardShadow: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Settings side</span>
                <select value={theme.settingsSide || 'right'} onChange={(e) => set({ settingsSide: e.target.value })}>
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                </select>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>Styles</h3>
            <div className="grid-2">
              <label>
                <span>Link style</span>
                <select value={theme.linkStyle || 'solid'} onChange={(e) => set({ linkStyle: e.target.value })}>
                  <option value="solid">Solid</option>
                  <option value="soft">Soft</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>

              <label>
                <span>Section style</span>
                <select value={theme.sectionStyle || 'glass'} onChange={(e) => set({ sectionStyle: e.target.value })}>
                  <option value="glass">Glass</option>
                  <option value="solid">Solid</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>Wallpaper</h3>
            <div className="grid-2">
              <label>
                <span>Preset</span>
                <select
                  value={theme.wallpaper}
                  onChange={(e) => set({ wallpaper: e.target.value })}
                >
                  {wallpapers.map(w => (
                    <option key={w.name} value={w.url}>{w.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Fit</span>
                <select
                  value={theme.wallpaperFit || 'cover'}
                  onChange={(e) => set({ wallpaperFit: e.target.value })}
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="auto">Auto</option>
                </select>
              </label>

              <label>
                <span>X position</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={theme.wallpaperX ?? 50}
                  onChange={(e) => set({ wallpaperX: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Y position</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={theme.wallpaperY ?? 50}
                  onChange={(e) => set({ wallpaperY: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Scale</span>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={theme.wallpaperScale ?? 100}
                  onChange={(e) => set({ wallpaperScale: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Blur</span>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={theme.wallpaperBlur ?? 0}
                  onChange={(e) => set({ wallpaperBlur: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Dim</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={theme.wallpaperDim ?? 35}
                  onChange={(e) => set({ wallpaperDim: Number(e.target.value) })}
                />
              </label>

              <label>
                <span>Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={theme.wallpaperOpacity ?? 100}
                  onChange={(e) => set({ wallpaperOpacity: Number(e.target.value) })}
                />
              </label>
            </div>

            <div className="settings-row">
              <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                Upload image
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => onImageUpload(e.target.files?.[0])}
              />
            </div>
          </section>

          <section className="settings-section">
            <h3>Backup</h3>
            <div className="settings-row" style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
              <button className="btn btn-ghost" style={{ fontSize:'0.8em' }} onClick={onExportBackup}>
                Export backup
              </button>

              <button
                className="btn btn-ghost"
                style={{ fontSize:'0.8em', display:'flex', alignItems:'center', gap:'0.3rem' }}
                onClick={() => !importingBackup && backupFileRef.current?.click()}
                disabled={importingBackup}
              >
                {importingBackup
                  ? <><span style={{ display:'inline-block', animation:'spin 0.8s linear infinite' }}>⟳</span> Importing…</>
                  : 'Import backup'}
              </button>

              <input
                ref={backupFileRef}
                type="file"
                accept=".json"
                style={{ display:'none' }}
                onChange={onImportBackup}
              />
            </div>
          </section>

          <section className="settings-section">
            <h3>Preview</h3>
            <div className="settings-preview" style={previewStyle}>
              <div className="preview-card">
                <div className="preview-title">Section</div>
                <div className="preview-link">Example link</div>
                <div className="preview-link">Another item</div>
              </div>
            </div>
          </section>
        </div>

        <div className="settings-footer" data-side={theme.settingsSide || 'right'} style={{ zIndex: 102 }}>
          <button
            className="btn btn-primary"
            style={{ flex:1 }}
            onClick={() => { onSave(); onClose() }}
          >
            Save & Exit
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </>
  )
}