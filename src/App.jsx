import { useEffect, useMemo, useRef, useState } from 'react'
import Auth from './components/Auth'
import Toolbar from './components/Toolbar'
import WorkspaceTabs from './components/WorkspaceTabs'
import Sections from './components/Sections'
import Notes from './components/Notes'
import Settings from './components/Settings'
import { supabase } from './lib/supabase'
import './index.css'

const DEFAULT_THEME = {
  bg: '#0b0f17',
  text: '#e8eefc',
  accent: '#7dd3fc',
  card: '#111827cc',
  line: '#1f2937',
  cardRadius: 16,
  cardBlur: 10,
  pageWidth: 1400,
  font: 'Inter, system-ui, sans-serif',
  titleSize: 28,
  sectionTitleSize: 18,
  linkSize: 15,
  noteSize: 15,
  wallpaper: '',
  wallpaperFit: 'cover',
  wallpaperX: 50,
  wallpaperY: 50,
  wallpaperScale: 100,
  wallpaperBlur: 0,
  wallpaperDim: 35,
  wallpaperOpacity: 100,
  pageGap: 14,
  cardGap: 12,
  columns: 4,
  linkStyle: 'solid',
  sectionStyle: 'glass',
  cardShadow: 25,
  settingsSide: 'right',
}

function applyTheme(t) {
  const root = document.documentElement
  root.style.setProperty('--bg', t.bg)
  root.style.setProperty('--text', t.text)
  root.style.setProperty('--accent', t.accent)
  root.style.setProperty('--card', t.card)
  root.style.setProperty('--line', t.line)
  root.style.setProperty('--card-radius', `${t.cardRadius}px`)
  root.style.setProperty('--card-blur', `${t.cardBlur}px`)
  root.style.setProperty('--page-width', `${t.pageWidth}px`)
  root.style.setProperty('--font', t.font)
  root.style.setProperty('--title-size', `${t.titleSize}px`)
  root.style.setProperty('--section-title-size', `${t.sectionTitleSize}px`)
  root.style.setProperty('--link-size', `${t.linkSize}px`)
  root.style.setProperty('--note-size', `${t.noteSize}px`)
  root.style.setProperty('--wallpaper-fit', t.wallpaperFit || 'cover')
  root.style.setProperty('--wallpaper-x', `${t.wallpaperX ?? 50}%`)
  root.style.setProperty('--wallpaper-y', `${t.wallpaperY ?? 50}%`)
  root.style.setProperty('--wallpaper-scale', `${t.wallpaperScale ?? 100}%`)
  root.style.setProperty('--wallpaper-blur', `${t.wallpaperBlur ?? 0}px`)
  root.style.setProperty('--wallpaper-dim', `${(t.wallpaperDim ?? 35) / 100}`)
  root.style.setProperty('--wallpaper-opacity', `${(t.wallpaperOpacity ?? 100) / 100}`)
  root.style.setProperty('--page-gap', `${t.pageGap ?? 14}px`)
  root.style.setProperty('--card-gap', `${t.cardGap ?? 12}px`)
  root.style.setProperty('--columns', `${t.columns ?? 4}`)
  root.style.setProperty('--card-shadow', `${t.cardShadow ?? 25}px`)
  root.style.setProperty('--link-style', t.linkStyle || 'solid')
  root.style.setProperty('--section-style', t.sectionStyle || 'glass')
  document.body.style.fontFamily = t.font
  document.body.style.backgroundColor = t.bg
  document.body.style.color = t.text
}

export default function App() {
  const [session, setSession] = useState(null)
  const sessionRef = useRef(null)

  const [workspaces, setWorkspaces] = useState([])
  const [activeWs, setActiveWs] = useState(null)

  const [sections, setSections] = useState([])
  const [links, setLinks] = useState([])
  const [notes, setNotes] = useState([])

  const [theme, setTheme] = useState(() => {
    try {
      return { ...DEFAULT_THEME, ...(JSON.parse(localStorage.getItem('current_theme')) || {}) }
    } catch {
      return DEFAULT_THEME
    }
  })

  const [search, setSearch] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [importingBackup, setImportingBackup] = useState(false)

  const fileRef = useRef(null)
  const backupFileRef = useRef(null)

  useEffect(() => { applyTheme(theme) }, [theme])

  useEffect(() => {
    document.documentElement.dataset.settingsSide = theme.settingsSide || 'right'
  }, [theme.settingsSide])

  useEffect(() => { sessionRef.current = session }, [session])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    const bootstrap = async () => {
      await ensureWorkspace()
      await handleRefresh()
    }
    bootstrap()
  }, [session])

  const ensureWorkspace = async () => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) { alert(error.message); return }
    if (!data || data.length === 0) {
      const { data: created, error: createErr } = await supabase
        .from('workspaces')
        .insert({ user_id: session.user.id, name: 'Home' })
        .select()
        .single()
      if (createErr) { alert(createErr.message); return }
      setWorkspaces([created])
      setActiveWs(created.id)
      return
    }
    setWorkspaces(data)
    setActiveWs(prev => prev ?? data[0]?.id ?? null)
  }

  const handleRefresh = async () => {
    if (!sessionRef.current?.user?.id) return
    const { data: wsData, error: wsErr } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true })
    if (wsErr) { alert(wsErr.message); return }
    setWorkspaces(wsData || [])
    const currentWs = activeWs ?? wsData?.[0]?.id ?? null
    if (!currentWs) return
    if (!activeWs) setActiveWs(currentWs)
    const [{ data: secData, error: secErr }, { data: linkData, error: linkErr }, { data: noteData, error: noteErr }] =
      await Promise.all([
        supabase.from('sections').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
        supabase.from('links').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
        supabase.from('notes').select('*').eq('workspace_id', currentWs).order('created_at', { ascending: true }),
      ])
    if (secErr) return alert(secErr.message)
    if (linkErr) return alert(linkErr.message)
    if (noteErr) return alert(noteErr.message)
    setSections(secData || [])
    setLinks(linkData || [])
    setNotes(noteData || [])
  }

  useEffect(() => {
    if (!activeWs || !session) return
    handleRefresh()
  }, [activeWs])

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return links
    return links.filter(l =>
      (l.title || '').toLowerCase().includes(q) ||
      (l.url || '').toLowerCase().includes(q)
    )
  }, [links, search])

  const addWorkspace = async () => {
    const name = prompt('Workspace name?')
    if (!name) return
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ user_id: session.user.id, name })
      .select()
      .single()
    if (error) return alert(error.message)
    setWorkspaces(prev => [...prev, data])
    setActiveWs(data.id)
  }

  const renameWorkspace = async (id, name) => {
    const { error } = await supabase.from('workspaces').update({ name }).eq('id', id)
    if (error) return alert(error.message)
    setWorkspaces(prev => prev.map(w => (w.id === id ? { ...w, name } : w)))
  }

  const deleteWorkspace = async (id) => {
    if (!confirm('Delete this workspace?')) return
    const { error } = await supabase.from('workspaces').delete().eq('id', id)
    if (error) return alert(error.message)
    const next = workspaces.filter(w => w.id !== id)
    setWorkspaces(next)
    setActiveWs(next[0]?.id ?? null)
  }

  const handleImageUpload = async (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const next = { ...theme, wallpaper: e.target.result }
      setTheme(next)
      applyTheme(next)
      localStorage.setItem('current_theme', JSON.stringify(next))
    }
    reader.readAsDataURL(file)
  }

  const exportFullBackup = async () => {
    const backup = { version: 2, exportedAt: new Date().toISOString(), theme, workspaces: [] }
    const { data: wsData, error: wsErr } = await supabase
      .from('workspaces').select('*').order('created_at', { ascending: true })
    if (wsErr) return alert(wsErr.message)
    for (const ws of wsData || []) {
      const [{ data: secData, error: secErr }, { data: noteData, error: noteErr }] =
        await Promise.all([
          supabase.from('sections').select('*').eq('workspace_id', ws.id).order('position', { ascending: true }),
          supabase.from('notes').select('*').eq('workspace_id', ws.id).order('created_at', { ascending: true }),
        ])
      if (secErr) return alert(secErr.message)
      if (noteErr) return alert(noteErr.message)
      const sectionsWithLinks = []
      for (const sec of secData || []) {
        const { data: secLinks, error: lErr } = await supabase
          .from('links').select('*').eq('section_id', sec.id).order('position', { ascending: true })
        if (lErr) return alert(lErr.message)
        sectionsWithLinks.push({
          name: sec.name, position: sec.position, collapsed: sec.collapsed,
          links: (secLinks || []).map(l => ({ title: l.title, url: l.url, position: l.position })),
        })
      }
      backup.workspaces.push({
        name: ws.name,
        sections: sectionsWithLinks,
        notes: (noteData || []).map(n => ({ content: n.content })),
      })
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'startpage-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const saveTheme = () => {
    localStorage.setItem('current_theme', JSON.stringify(theme))
    applyTheme(theme)
  }

  const activeWorkspace = workspaces.find(w => w.id === activeWs)

  if (loading) return <div className="center-fill">Loading…</div>
  if (!session) return <Auth />

  return (
    <div className="app-shell">
      {theme.wallpaper ? (
        <div
          className="wallpaper-layer"
          style={{
            backgroundImage: `url(${theme.wallpaper})`,
            backgroundSize: `${theme.wallpaperScale ?? 100}%`,
            backgroundPosition: `${theme.wallpaperX ?? 50}% ${theme.wallpaperY ?? 50}%`,
            filter: `blur(${theme.wallpaperBlur ?? 0}px)`,
            opacity: (theme.wallpaperOpacity ?? 100) / 100,
          }}
        />
      ) : null}
      <div className="wallpaper-dim" />

      <Toolbar
        search={search}
        setSearch={setSearch}
        onAddSection={() => {}}
        onAddNote={() => {}}
        onRefresh={handleRefresh}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <WorkspaceTabs
        workspaces={workspaces}
        activeWs={activeWs}
        setActiveWs={setActiveWs}
        onAddWorkspace={addWorkspace}
        onRenameWorkspace={renameWorkspace}
        onDeleteWorkspace={deleteWorkspace}
      />

      <main
        className="main-layout"
        style={{ gridTemplateColumns: `1fr var(--notes-width, 240px)` }}
      >
        <div className="main-col">
          <div className="page-title-row">
            <h1 className="page-title">{activeWorkspace?.name || 'Workspace'}</h1>
          </div>
          <Sections
            sections={sections}
            links={filteredLinks}
            userId={session.user.id}
            workspaceId={activeWs}
            onRefresh={handleRefresh}
            colCount={theme.columns}
          />
        </div>
        <div className="side-col">
          <Notes
            notes={notes}
            workspaceId={activeWs}
            userId={session.user.id}
            onRefresh={handleRefresh}
          />
        </div>
      </main>

      {settingsOpen && (
        <Settings
          theme={theme}
          setTheme={setTheme}
          onSave={saveTheme}
          onClose={() => setSettingsOpen(false)}
          onImageUpload={handleImageUpload}
          onExportBackup={exportFullBackup}
          onImportBackup={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            e.target.value = ''
            setImportingBackup(true)
            const r = new FileReader()
            r.onload = async (ev) => {
              try {
                const data = JSON.parse(ev.target.result)
                const uid = sessionRef.current?.user?.id
                if (!uid) throw new Error('Not logged in')
                if (Array.isArray(data)) {
                  const rows = (Array.isArray(data[0]) ? data[0] : data).filter(g => g && typeof g === 'object')
                  for (let i = 0; i < rows.length; i++) {
                    const grp = rows[i]
                    const { data: sec, error: secErr } = await supabase
                      .from('sections')
                      .insert({ user_id: uid, workspace_id: activeWs, name: grp.name ?? grp.title ?? 'Section', position: i, collapsed: false })
                      .select().single()
                    if (secErr) throw secErr
                    const lnks = (grp.bookmarks ?? grp.links ?? []).map((b, j) => ({
                      user_id: uid, workspace_id: activeWs, section_id: sec.id,
                      title: b.name ?? b.title ?? 'Link', url: b.url, position: j,
                    }))
                    if (lnks.length) { const { error: lnkErr } = await supabase.from('links').insert(lnks); if (lnkErr) throw lnkErr }
                  }
                  await handleRefresh()
                  alert('Imported ' + rows.length + ' section(s) into current workspace.')
                  return
                }
                if (data.workspaces && Array.isArray(data.workspaces)) {
                  if (!confirm('Add ' + data.workspaces.length + ' workspace(s)? Existing data is kept.')) { setImportingBackup(false); return }
                  for (const ws of data.workspaces) {
                    const { data: newWs, error: wsErr } = await supabase.from('workspaces').insert({ user_id: uid, name: ws.name }).select().single()
                    if (wsErr) throw wsErr
                    for (let si = 0; si < (ws.sections ?? []).length; si++) {
                      const sec = ws.sections[si]
                      const { data: newSec, error: secErr } = await supabase
                        .from('sections')
                        .insert({ user_id: uid, workspace_id: newWs.id, name: sec.name, position: sec.position ?? si, collapsed: sec.collapsed ?? false })
                        .select().single()
                      if (secErr) throw secErr
                      const lnks = (sec.links ?? []).map((l, j) => ({
                        user_id: uid, workspace_id: newWs.id, section_id: newSec.id,
                        title: l.title ?? l.name ?? 'Link', url: l.url, position: l.position ?? j,
                      }))
                      if (lnks.length) { const { error: lnkErr } = await supabase.from('links').insert(lnks); if (lnkErr) throw lnkErr }
                    }
                    if (ws.notes?.length) {
                      await supabase.from('notes').insert(ws.notes.map(n => ({ user_id: uid, workspace_id: newWs.id, content: n.content ?? '' })))
                    }
                  }
                  if (data.theme && Object.keys(data.theme).length > 0) {
                    const t = { ...DEFAULT_THEME, ...data.theme }
                    setTheme(t); applyTheme(t)
                    localStorage.setItem('current_theme', JSON.stringify(t))
                  }
                  await handleRefresh()
                  alert('Backup imported successfully!')
                  return
                }
                if (data.bg || data.text || data.accent) {
                  const t = { ...DEFAULT_THEME, ...data }
                  setTheme(t); applyTheme(t)
                  localStorage.setItem('current_theme', JSON.stringify(t))
                  alert('Theme imported.')
                  return
                }
                alert('Unrecognised file format.')
              } catch (err) {
                alert('Import failed: ' + err.message)
              } finally {
                setImportingBackup(false)
              }
            }
            r.readAsText(f)
          }}
          fileRef={fileRef}
          backupFileRef={backupFileRef}
          importingBackup={importingBackup}
        />
      )}
    </div>
  )
}