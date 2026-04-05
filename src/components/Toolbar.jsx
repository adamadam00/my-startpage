export default function Toolbar({ search, setSearch, onAddSection, onAddNote, onRefresh, onOpenSettings }) {
  return (
    <div className="toolbar">
      <input
        className="toolbar-search"
        type="text"
        placeholder="Search links…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="toolbar-spacer" />
      <button className="toolbar-btn" onClick={onAddSection}>+ Section</button>
      <button className="toolbar-btn" onClick={onAddNote}>+ Note</button>
      <button className="toolbar-btn" onClick={onRefresh} title="Refresh">↻</button>
      <button className="toolbar-btn" onClick={onOpenSettings} title="Settings">⚙</button>
    </div>
  )
}
