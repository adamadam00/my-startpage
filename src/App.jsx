import { useEffect, useMemo, useRef, useState } from 'react'
import Auth from './components/Auth'
import Toolbar from './components/Toolbar'
import WorkspaceTabs from './components/WorkspaceTabs'
import Sections from './components/Sections'
import Notes from './components/Notes'
import Settings from './components/Settings'
import { supabase } from './lib/supabase'
import './index.css'

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT THEME
// Every CSS variable that index.css exposes is driven from here.
// applyTheme() maps each property to its CSS custom property.
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_THEME = {
  // ── Core surface colours ────────────────────────────────────
  bg:           '#0c0c0f',
  bg2:          '#13131a',
  bg3:          '#1a1a24',
  card:         '#13131a',
  cardOpacity:  1,

  // ── Border colours ──────────────────────────────────────────
  border:       '#2a2a3a',
  borderHover:  '#3d3d55',
  borderOpacity: 1,

  // ── Text colours ────────────────────────────────────────────
  text:         '#e8e8f0',
  textDim:      '#7878a0',
  titleColor:   '#7878a0',

  // ── Accent / state colours ──────────────────────────────────
  accent:       '#6c8fff',
  danger:       '#ff6b6b',
  success:      '#6bffb8',

  // ── Button colours ──────────────────────────────────────────
  btnBg:        '#1e3a8a',
  btnText:      '#ffffff',

  // ── Background preset & pattern ─────────────────────────────
  // bgPreset drives the CSS class applied to the .bg-layer div.
  // Options: solid | noise | dots | grid | gradient | mesh | aurora |
  //          stars | nebula | lines | starfield | plasma | inferno |
  //          mint | dusk | mono | fog | scan | vortex | ripple |
  //          filament | light-bokeh | silver-radial | wall-texture |
  //          timber-dark
  bgPreset:        'noise',
  patternColor:    '#2a2a3a',
  patternOpacity:  1,

  // ── Uploaded wallpaper (base64 data URL) ────────────────────
  wallpaper:        '',
  wallpaperFit:     'cover',
  wallpaperX:       50,
  wallpaperY:       50,
  wallpaperScale:   100,
  wallpaperBlur:    0,
  wallpaperDim:     35,
  wallpaperOpacity: 100,

  // ── Typography ───────────────────────────────────────────────
  font:          "'DM Mono', monospace",
  fontSize:      14,
  topbarFontSize: 12,

  // ── Clock widget ─────────────────────────────────────────────
  // Clock is always 12-hour format. This controls the widget size only.
  clockWidgetSize: 1,

  // ── Favicon ──────────────────────────────────────────────────
  faviconOpacity:   1,
  faviconSize:      13,
  faviconGreyscale: false,

  // ── Layout & spacing ─────────────────────────────────────────
  radius:        10,
  sectionRadius: 0,
  cardPadding:   0.75,
  linkGap:       0.5,
  sectionGap:    0,
  sectionGapH:   0,
  sectionsCols:  4,
  mainGapTop:    12,
  pageScale:     1,

  // ── Drag-handle opacity (0-100 maps to 0-1) ──────────────────
  handleOpacity: 15,

  // ── Notes panel ──────────────────────────────────────────────
  notesFontSize:   13,
  notesGap:        0,
  notesCardBg:     '#13131a',
  notesTextColor:  '#e8e8f0',
  notesTextBg:     '#0c0c0f',

  // ── Settings panel ───────────────────────────────────────────
  settingsSide: 'right',
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY THEME
// Sets every CSS custom property on :root and a handful of body styles.
// ─────────────────────────────────────────────────────────────────────────────
function applyTheme(t) {
  if (!t) return
  const root = document.documentElement
  const set  = (k, v) => (v !== undefined && v !== null) && root.style.setProperty(k, String(v))

  // Surface colours
  set('--bg',              t.bg)
  set('--bg2',             t.bg2)
  set('--bg3',             t.bg3)
  set('--card',            t.card)
  set('--card-opacity',    t.cardOpacity ?? 1)

  // Border
  set('--border',          t.border)
  set('--border-hover',    t.borderHover)
  set('--border-opacity',  t.borderOpacity ?? 1)

  // Text
  set('--text',            t.text)
  set('--text-dim',        t.textDim)
  set('--title-color',     t.titleColor ?? t.textDim)

  // Accent — also derive the semi-transparent versions
  set('--accent',          t.accent)
  if (t.accent) {
    set('--accent-dim',    t.accent + '33')
    set('--accent-glow',   t.accent + '22')
  }

  // State colours
  set('--danger',          t.danger)
  set('--success',         t.success)

  // Buttons
  set('--btn-bg',          t.btnBg)
  set('--btn-text',        t.btnText)

  // Pattern / background
  set('--pattern-color',   t.patternColor)
  set('--pattern-opacity', t.patternOpacity ?? 1)

  // Typography
  set('--font',            t.font)
  set('--font-size',       t.fontSize    ? t.fontSize    + 'px' : null)
  set('--topbar-font-size',t.topbarFontSize ? t.topbarFontSize + 'px' : null)

  // Clock widget
  set('--clock-widget-size', t.clockWidgetSize ? t.clockWidgetSize + 'rem' : null)

  // Favicon
  set('--favicon-opacity', t.faviconOpacity ?? 1)
  set('--favicon-size',    t.faviconSize ? t.faviconSize + 'px' : null)
  set('--favicon-filter',  t.faviconGreyscale ? 'grayscale(1)' : 'none')

  // Layout & spacing
  set('--radius',          t.radius      ? t.radius       + 'px' : null)
  set('--radius-sm',       t.radius      ? Math.max(2, t.radius - 4) + 'px' : null)
  set('--section-radius',  t.sectionRadius !== undefined ? t.sectionRadius + 'px' : null)
  set('--card-padding',    t.cardPadding ? t.cardPadding  + 'rem' : null)
  set('--link-gap',        t.linkGap     ? t.linkGap      + 'rem' : null)
  set('--section-gap',     t.sectionGap  !== undefined ? t.sectionGap  + 'px' : null)
  set('--section-gap-h',   t.sectionGapH !== undefined ? t.sectionGapH + 'px' : null)
  set('--columns',         t.sectionsCols ?? 4)
  set('--main-gap-top',    t.mainGapTop  !== undefined ? t.mainGapTop  + 'px' : null)

  // Page zoom
  if (t.pageScale && t.pageScale !== 1) {
    set('--page-scale', t.pageScale)
  } else {
    root.style.removeProperty('--page-scale')
  }

  // Drag-handle opacity — stored as 0-100 percentage, CSS needs 0-1 float
  set('--handle-opacity',  (t.handleOpacity ?? 15) / 100)

  // Notes panel
  set('--notes-font-size', t.notesFontSize ? t.notesFontSize + 'px' : null)
  set('--notes-gap',       t.notesGap      !== undefined ? t.notesGap + 'px' : null)
  set('--notes-card-bg',   t.notesCardBg   ?? null)
  set('--notes-text-color',t.notesTextColor ?? null)
  set('--notes-text-bg',   t.notesTextBg   ?? null)

  // Wallpaper
  set('--wallpaper-fit',   t.wallpaperFit || 'cover')
  set('--wallpaper-x',     (t.wallpaperX  ?? 50)  + '%')
  set('--wallpaper-y',     (t.wallpaperY  ?? 50)  + '%')
  set('--wallpaper-scale', (t.wallpaperScale ?? 100) + '%')
  set('--wallpaper-blur',  (t.wallpaperBlur  ?? 0)  + 'px')
  set('--wallpaper-dim',   (t.wallpaperDim   ?? 35) / 100)
  set('--wallpaper-opacity',(t.wallpaperOpacity ?? 100) / 100)

  // Body base styles
  document.body.style.fontFamily      = t.font || "'DM Mono', monospace"
  document.body.style.backgroundColor = t.bg   || '#0c0c0f'
  document.body.style.color           = t.text || '#e8e8f0'

  // Settings panel side — used by the CSS [data-side="left"] selector
  document.documentElement.dataset.settingsSide = t.settingsSide || 'right'
}

// ─────────────────────────────────────────────────────────────────────────────
// APP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession]   = useState(null)
  const sessionRef              = useRef(null)

  const [workspaces, setWorkspaces] = useState([])
  const [activeWs,   setActiveWs]   = useState(null)

  const [sections, setSections] = useState([])
  const [links,    setLinks]    = useState([])
  const [notes,    setNotes]    = useState([])

  const [theme, setTheme] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('current_theme'))
      return saved ? { ...DEFAULT_THEME, ...saved } : { ...DEFAULT_THEME }
    } catch {
      return { ...DEFAULT_THEME }
    }
  })

  const [search,          setSearch]          = useState('')
  const [settingsOpen,    setSettingsOpen]    = useState(false)
  const [loading,         setLoading]         = useState(true)
  const [importingBackup, setImportingBackup] = useState(false)

  const fileRef       = useRef(null)
  const backupFileRef = useRef(null)

  // ── Apply theme whenever it changes ──────────────────────────
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // ── Keep sessionRef in sync ───────────────────────────────────
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // ── Auth ──────────────────────────────────────────────────────
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

  // ── Bootstrap data once logged in ────────────────────────────
  useEffect(() => {
    if (!session) return
    const bootstrap = async () => {
      await ensureWorkspace()
      await handleRefresh()
    }
    bootstrap()
  }, [session])

  // ── Ensure at least one workspace exists ─────────────────────
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

  // ── Refresh all data for the current workspace ────────────────
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

    const [
      { data: secData,  error: secErr  },
      { data: linkData, error: linkErr },
      { data: noteData, error: noteErr },
    ] = await Promise.all([
      supabase.from('sections').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
      supabase.from('links').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
      supabase.from('notes').select('*').eq('workspace_id', currentWs).order('created_at', { ascending: true }),
    ])

    if (secErr)  return alert(secErr.message)
    if (linkErr) return alert(linkErr.message)
    if (noteErr) return alert(noteErr.message)

    setSections(secData  || [])
    setLinks(linkData    || [])
    setNotes(noteData    || [])
  }

  // Refresh whenever the active workspace changes
  useEffect(() => {
    if (!activeWs || !session) return
    handleRefresh()
  }, [activeWs])

  // ── Filtered links for search ─────────────────────────────────
  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return links
    return links.filter(l =>
      (l.title || '').toLowerCase().includes(q) ||
      (l.url   || '').toLowerCase().includes(q)
    )
  }, [links, search])

  // ─────────────────────────────────────────────────────────────
  // WORKSPACE CRUD
  // ─────────────────────────────────────────────────────────────

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
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name } : w))
  }

  const deleteWorkspace = async (id) => {
    if (!confirm('Delete this workspace and ALL its data? This cannot be undone.')) return

    // Delete child data first, then the workspace
    await Promise.all([
      supabase.from('links').delete().eq('workspace_id', id),
      supabase.from('sections').delete().eq('workspace_id', id),
      supabase.from('notes').delete().eq('workspace_id', id),
    ])

    const { error } = await supabase.from('workspaces').delete().eq('id', id)
    if (error) return alert(error.message)

    const next = workspaces.filter(w => w.id !== id)
    setWorkspaces(next)
    setActiveWs(next[0]?.id ?? null)
  }

  // ─────────────────────────────────────────────────────────────
  // SECTION CRUD
  // ─────────────────────────────────────────────────────────────

  const addSection = async () => {
    const name = prompt('Section name?')
    if (!name || !activeWs) return

    const { data, error } = await supabase
      .from('sections')
      .insert({
        user_id:      session.user.id,
        workspace_id: activeWs,
        name,
        position:     sections.length,
        collapsed:    false,
      })
      .select()
      .single()

    if (error) return alert(error.message)
    setSections(prev => [...prev, data])
  }

  const updateSection = async (id, patch) => {
    const { error } = await supabase.from('sections').update(patch).eq('id', id)
    if (error) return alert(error.message)
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  const deleteSection = async (id) => {
    if (!confirm('Delete this section and all its links?')) return

    const { error: linkErr } = await supabase.from('links').delete().eq('section_id', id)
    if (linkErr) return alert(linkErr.message)

    const { error } = await supabase.from('sections').delete().eq('id', id)
    if (error) return alert(error.message)

    setSections(prev => prev.filter(s => s.id !== id))
    setLinks(prev    => prev.filter(l => l.section_id !== id))
  }

  // ─────────────────────────────────────────────────────────────
  // LINK CRUD
  // ─────────────────────────────────────────────────────────────

  const addLink = async (sectionId) => {
    const title = prompt('Link title?')
    if (!title) return
    const url = prompt('URL?')
    if (!url) return

    const sectionLinks = links.filter(l => l.section_id === sectionId)

    const { data, error } = await supabase
      .from('links')
      .insert({
        user_id:      session.user.id,
        workspace_id: activeWs,
        section_id:   sectionId,
        title,
        url,
        position:     sectionLinks.length,
      })
      .select()
      .single()

    if (error) return alert(error.message)
    setLinks(prev => [...prev, data])
  }

  const updateLink = async (id, patch) => {
    const { error } = await supabase.from('links').update(patch).eq('id', id)
    if (error) return alert(error.message)
    setLinks(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  const deleteLink = async (id) => {
    const { error } = await supabase.from('links').delete().eq('id', id)
    if (error) return alert(error.message)
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  // ─────────────────────────────────────────────────────────────
  // NOTE CRUD
  // ─────────────────────────────────────────────────────────────

  const addNote = async () => {
    if (!activeWs) return

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id:      session.user.id,
        workspace_id: activeWs,
        content:      '',
      })
      .select()
      .single()

    if (error) return alert(error.message)
    setNotes(prev => [...prev, data])
  }

  const updateNote = async (id, content) => {
    const { error } = await supabase.from('notes').update({ content }).eq('id', id)
    if (error) return alert(error.message)
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n))
  }

  const deleteNote = async (id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) return alert(error.message)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  // ─────────────────────────────────────────────────────────────
  // RESET ALL LINKS IN ACTIVE WORKSPACE (keeps notes)
  // ─────────────────────────────────────────────────────────────

  const resetWorkspaceLinks = async () => {
    if (!activeWs) return
    if (!confirm('⚠ Delete ALL sections and links in this workspace?\n\nNotes will be kept. This cannot be undone.')) return

    await supabase.from('links').delete().eq('workspace_id', activeWs)
    await supabase.from('sections').delete().eq('workspace_id', activeWs)

    setSections([])
    setLinks([])
  }

  // ─────────────────────────────────────────────────────────────
  // WALLPAPER IMAGE UPLOAD
  // ─────────────────────────────────────────────────────────────

  const handleImageUpload = (file) => {
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

  // ─────────────────────────────────────────────────────────────
  // BACKGROUND IMAGE UPLOAD (bg-layer preset replacement)
  // ─────────────────────────────────────────────────────────────

  const handleBgImageUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      localStorage.setItem('bg_image', e.target.result)
      const next = { ...theme, bgPreset: 'image' }
      setTheme(next)
      applyTheme(next)
      localStorage.setItem('current_theme', JSON.stringify(next))
    }
    reader.readAsDataURL(file)
  }

  // ─────────────────────────────────────────────────────────────
  // EXPORT FULL BACKUP (all workspaces + theme)
  // ─────────────────────────────────────────────────────────────

  const exportFullBackup = async () => {
    const backup = {
      version:    2,
      exportedAt: new Date().toISOString(),
      theme,
      workspaces: [],
    }

    const { data: wsData, error: wsErr } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true })

    if (wsErr) return alert(wsErr.message)

    for (const ws of wsData || []) {
      const [
        { data: secData,  error: secErr  },
        { data: noteData, error: noteErr },
      ] = await Promise.all([
        supabase.from('sections').select('*').eq('workspace_id', ws.id).order('position', { ascending: true }),
        supabase.from('notes').select('*').eq('workspace_id', ws.id).order('created_at', { ascending: true }),
      ])

      if (secErr)  return alert(secErr.message)
      if (noteErr) return alert(noteErr.message)

      const sectionsWithLinks = []

      for (const sec of secData || []) {
        const { data: secLinks, error: lErr } = await supabase
          .from('links')
          .select('*')
          .eq('section_id', sec.id)
          .order('position', { ascending: true })

        if (lErr) return alert(lErr.message)

        sectionsWithLinks.push({
          name:      sec.name,
          position:  sec.position,
          collapsed: sec.collapsed,
          links: (secLinks || []).map(l => ({
            title:    l.title,
            url:      l.url,
            position: l.position,
          })),
        })
      }

      backup.workspaces.push({
        name:     ws.name,
        sections: sectionsWithLinks,
        notes:    (noteData || []).map(n => ({ content: n.content })),
      })
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'startpage-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─────────────────────────────────────────────────────────────
  // EXPORT CSV (sections + links, current workspace only)
  // ─────────────────────────────────────────────────────────────

  const exportCSV = async () => {
    const [{ data: secData }, { data: linkData }] = await Promise.all([
      supabase.from('sections').select('*').eq('workspace_id', activeWs).order('position', { ascending: true }),
      supabase.from('links').select('*').eq('workspace_id', activeWs),
    ])

    const rows = [['Section', 'Title', 'URL']]
    ;(secData || []).forEach(sec => {
      (linkData || [])
        .filter(l => l.section_id === sec.id)
        .sort((a, b) => a.position - b.position)
        .forEach(l => rows.push([sec.name, l.title, l.url]))
    })

    const csv = rows
      .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'startpage-links.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─────────────────────────────────────────────────────────────
  // IMPORT BACKUP — handles multiple formats
  // ─────────────────────────────────────────────────────────────

  const handleImportBackup = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    setImportingBackup(true)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const uid = sessionRef.current?.user?.id
        if (!uid) throw new Error('Not logged in')

        const ext  = f.name.split('.').pop().toLowerCase()
        const text = ev.target.result

        // ── CSV import ──────────────────────────────────────────
        if (ext === 'csv') {
          const lines      = text.trim().split('\n').slice(1)
          const sectionMap = {}
          let   pos        = 0

          for (const line of lines) {
            const [section, title, url] = line
              .split(',')
              .map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
            if (!section || !title || !url) continue

            if (!sectionMap[section]) {
              const { data: sec, error: secErr } = await supabase
                .from('sections')
                .insert({ user_id: uid, workspace_id: activeWs, name: section, position: pos++, collapsed: false })
                .select()
                .single()
              if (secErr) throw secErr
              sectionMap[section] = { id: sec.id, lpos: 0 }
            }

            const { error: lnkErr } = await supabase.from('links').insert({
              user_id:      uid,
              workspace_id: activeWs,
              section_id:   sectionMap[section].id,
              title,
              url: url.startsWith('http') ? url : 'https://' + url,
              position:     sectionMap[section].lpos++,
            })
            if (lnkErr) throw lnkErr
          }

          await handleRefresh()
          alert(`Imported ${lines.length} links from CSV.`)
          return
        }

        // ── JSON import ─────────────────────────────────────────
        const data = JSON.parse(text)

        // Format 1: simple array  [{name, bookmarks:[{name,url}]}]
        //        or nested array  [[{name, bookmarks:[...]}]]
        if (Array.isArray(data)) {
          const rows = (Array.isArray(data[0]) ? data[0] : data).filter(g => g && typeof g === 'object')

          for (let i = 0; i < rows.length; i++) {
            const grp = rows[i]

            const { data: sec, error: secErr } = await supabase
              .from('sections')
              .insert({
                user_id:      uid,
                workspace_id: activeWs,
                name:         grp.name ?? grp.title ?? 'Section',
                position:     i,
                collapsed:    false,
              })
              .select()
              .single()
            if (secErr) throw secErr

            const lnks = (grp.bookmarks ?? grp.links ?? []).map((b, j) => ({
              user_id:      uid,
              workspace_id: activeWs,
              section_id:   sec.id,
              title:        b.name ?? b.title ?? 'Link',
              url:          b.url,
              position:     j,
            }))

            if (lnks.length) {
              const { error: lnkErr } = await supabase.from('links').insert(lnks)
              if (lnkErr) throw lnkErr
            }
          }

          await handleRefresh()
          alert(`Imported ${rows.length} section(s) into current workspace.`)
          return
        }

        // Format 2: full backup  {version, workspaces:[...], theme:{...}}
        if (data.workspaces && Array.isArray(data.workspaces)) {
          if (!confirm(`Add ${data.workspaces.length} workspace(s)? Existing data is kept.`)) {
            setImportingBackup(false)
            return
          }

          for (const ws of data.workspaces) {
            const { data: newWs, error: wsErr } = await supabase
              .from('workspaces')
              .insert({ user_id: uid, name: ws.name })
              .select()
              .single()
            if (wsErr) throw wsErr

            for (let si = 0; si < (ws.sections ?? []).length; si++) {
              const sec = ws.sections[si]

              const { data: newSec, error: secErr } = await supabase
                .from('sections')
                .insert({
                  user_id:      uid,
                  workspace_id: newWs.id,
                  name:         sec.name,
                  position:     sec.position ?? si,
                  collapsed:    sec.collapsed ?? false,
                })
                .select()
                .single()
              if (secErr) throw secErr

              const lnks = (sec.links ?? []).map((l, j) => ({
                user_id:      uid,
                workspace_id: newWs.id,
                section_id:   newSec.id,
                title:        l.title ?? l.name ?? 'Link',
                url:          l.url,
                position:     l.position ?? j,
              }))

              if (lnks.length) {
                const { error: lnkErr } = await supabase.from('links').insert(lnks)
                if (lnkErr) throw lnkErr
              }
            }

            if (ws.notes?.length) {
              await supabase.from('notes').insert(
                ws.notes.map(n => ({
                  user_id:      uid,
                  workspace_id: newWs.id,
                  content:      n.content ?? '',
                }))
              )
            }
          }

          if (data.theme && Object.keys(data.theme).length > 0) {
            const restored = { ...DEFAULT_THEME, ...data.theme }
            setTheme(restored)
            applyTheme(restored)
            localStorage.setItem('current_theme', JSON.stringify(restored))
          }

          await handleRefresh()
          alert('Backup imported successfully!')
          return
        }

        // Format 3: sections-only  {sections:[...]}
        if (data.sections && Array.isArray(data.sections)) {
          for (let si = 0; si < data.sections.length; si++) {
            const sec = data.sections[si]

            const { data: newSec, error: secErr } = await supabase
              .from('sections')
              .insert({
                user_id:      uid,
                workspace_id: activeWs,
                name:         sec.name ?? 'Section',
                position:     sec.position ?? si,
                collapsed:    sec.collapsed ?? false,
              })
              .select()
              .single()
            if (secErr) throw secErr

            const lnks = (sec.links ?? []).map((l, j) => ({
              user_id:      uid,
              workspace_id: activeWs,
              section_id:   newSec.id,
              title:        l.title ?? l.name ?? 'Link',
              url:          l.url,
              position:     l.position ?? j,
            }))

            if (lnks.length) {
              const { error: lnkErr } = await supabase.from('links').insert(lnks)
              if (lnkErr) throw lnkErr
            }
          }

          await handleRefresh()
          alert(`Imported ${data.sections.length} section(s).`)
          return
        }

        // Format 4: theme-only  {bg, text, accent, ...}
        if (data.bg || data.text || data.accent) {
          const restored = { ...DEFAULT_THEME, ...data }
          setTheme(restored)
          applyTheme(restored)
          localStorage.setItem('current_theme', JSON.stringify(restored))
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
    reader.readAsText(f)
  }

  // ─────────────────────────────────────────────────────────────
  // SAVE THEME to localStorage
  // ─────────────────────────────────────────────────────────────

  const saveTheme = () => {
    localStorage.setItem('current_theme', JSON.stringify(theme))
    applyTheme(theme)
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  const activeWorkspace = workspaces.find(w => w.id === activeWs)

  // Background preset class — if a bg-image is stored use that, else use the preset CSS class
  const bgImageData = localStorage.getItem('bg_image')
  const bgLayerClass = bgImageData ? 'bg-layer bg-image' : `bg-layer bg-${theme.bgPreset || 'noise'}`
  const bgLayerStyle = bgImageData ? { backgroundImage: `url(${bgImageData})` } : {}

  if (loading) return <div className="center-fill">Loading…</div>
  if (!session) return <Auth />

  return (
    <div className="app-shell">
      {/* CSS-class-driven background layer (preset effects) */}
      <div className={bgLayerClass} style={bgLayerStyle} />

      {/* Uploaded wallpaper overlay */}
      {theme.wallpaper ? (
        <div
          className="wallpaper-layer"
          style={{
            backgroundImage:    `url(${theme.wallpaper})`,
            backgroundSize:     `${theme.wallpaperScale ?? 100}%`,
            backgroundPosition: `${theme.wallpaperX ?? 50}% ${theme.wallpaperY ?? 50}%`,
            filter:             `blur(${theme.wallpaperBlur ?? 0}px)`,
            opacity:            (theme.wallpaperOpacity ?? 100) / 100,
          }}
        />
      ) : null}

      {/* Dim overlay sits above wallpaper */}
      <div className="wallpaper-dim" />

      {/* Top toolbar */}
      <Toolbar
        search={search}
        setSearch={setSearch}
        onAddSection={addSection}
        onAddNote={addNote}
        onRefresh={handleRefresh}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main content area */}
      <main className="page-wrap">
        <WorkspaceTabs
          workspaces={workspaces}
          activeWs={activeWs}
          setActiveWs={setActiveWs}
          onAddWorkspace={addWorkspace}
          onRenameWorkspace={renameWorkspace}
          onDeleteWorkspace={deleteWorkspace}
        />

        <div className="page-title-row">
          <h1 className="page-title">{activeWorkspace?.name || 'Workspace'}</h1>
        </div>

        <Sections
          sections={sections}
          links={filteredLinks}
          onAddLink={addLink}
          onUpdateLink={updateLink}
          onDeleteLink={deleteLink}
          onUpdateSection={updateSection}
          onDeleteSection={deleteSection}
        />

        <Notes
          notes={notes}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
        />
      </main>

      {/* Settings side panel */}
      {settingsOpen && (
        <Settings
          theme={theme}
          setTheme={setTheme}
          onSave={saveTheme}
          onClose={() => setSettingsOpen(false)}
          onImageUpload={handleImageUpload}
          onBgImageUpload={handleBgImageUpload}
          onExportBackup={exportFullBackup}
          onExportCSV={exportCSV}
          onImportBackup={handleImportBackup}
          onResetWorkspaceLinks={resetWorkspaceLinks}
          fileRef={fileRef}
          backupFileRef={backupFileRef}
          importingBackup={importingBackup}
          workspaces={workspaces}
          activeWs={activeWs}
          onAddWorkspace={addWorkspace}
          onRenameWorkspace={renameWorkspace}
          onDeleteWorkspace={deleteWorkspace}
          onSetActiveWs={setActiveWs}
        />
      )}
    </div>
  )
  /* ── App shell (new wrapper classes) ── */
.app-shell {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wallpaper-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-repeat: no-repeat;
}

.wallpaper-dim {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: rgba(0,0,0,var(--wallpaper-dim,0.35));
}

.center-fill {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  opacity: 0.6;
}

.page-wrap {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--main-gap-top,12px) 0.75rem 0.75rem;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.page-title {
  font-size: var(--title-size, 28px);
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}

}