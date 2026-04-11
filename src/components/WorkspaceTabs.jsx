import { useState } from 'react'

export default function WorkspaceTabs({ workspaces, activeWs, setActiveWs, onAddWorkspace, onRenameWorkspace, onDeleteWorkspace }) {
  const [renamingId, setRenamingId] = useState(null)
  const [renameVal, setRenameVal] = useState('')

  const startRename = (ws) => {
    setRenamingId(ws.id)
    setRenameVal(ws.name)
  }

  const commitRename = (id) => {
    if (renameVal.trim()) onRenameWorkspace(id, renameVal.trim())
    setRenamingId(null)
  }
 
  return (
    <div className="workspace-tabs">
      {workspaces.map(ws => (
        <div
          key={ws.id}
          className={`workspace-tab${ws.id === activeWs ? ' active' : ''}`}
          onClick={() => setActiveWs(ws.id)}
        >
          {renamingId === ws.id ? (
            <input
              autoFocus
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onBlur={() => commitRename(ws.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename(ws.id)
                if (e.key === 'Escape') setRenamingId(null)
              }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'transparent', border: 'none', color: 'inherit', font: 'inherit', width: '80px', outline: 'none' }}
            />
          ) : (
            <span onDoubleClick={e => { e.stopPropagation(); startRename(ws) }}>{ws.name}</span>
          )}
          {workspaces.length > 1 && (
            <button
              className="ws-del"
              onClick={e => { e.stopPropagation(); onDeleteWorkspace(ws.id) }}
              title="Delete workspace"
            >✕</button>
          )}
        </div>
      ))}
      <button className="ws-add-btn" onClick={onAddWorkspace}>+ Workspace</button>
    </div>
  )
}
