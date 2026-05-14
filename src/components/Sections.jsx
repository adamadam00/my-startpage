import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "../lib/supabase";

const SWATCH_COLORS = [
  { label: "Reset", value: "" },
  { label: "Red", value: "#ff6b6b" },
  { label: "Orange", value: "#ff9f43" },
  { label: "Yellow", value: "#ffd32a" },
  { label: "Green", value: "#6bffb8" },
  { label: "Cyan", value: "#48dbfb" },
  { label: "Blue", value: "#6c8fff" },
  { label: "Purple", value: "#a29bfe" },
  { label: "Pink", value: "#fd79a8" },
];

function normalizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function getFavicon(url) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(
      normalizeUrl(url)
    ).hostname}&sz=32`;
  } catch {
    return null;
  }
}

function LinkRow({
  link,
  linkIndex,
  totalLinks,
  openInNewTab,
  faviconEnabled,
  onRefresh,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `link-${link.id}`,
    data: {
      type: "link",
      linkId: link.id,
      sectionId: link.section_id,
    },
  });

  const [showColors, setShowColors] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  const href = normalizeUrl(link.url);
  const favicon = getFavicon(href);

  async function handleRename(e) {
    e.preventDefault();
    e.stopPropagation();

    const nextTitle = window.prompt("Rename link title", link.title ?? "");
    if (nextTitle === null) return;

    const trimmed = nextTitle.trim();
    if (!trimmed) return;

    const { error } = await supabase
      .from("links")
      .update({ title: trimmed })
      .eq("id", link.id);

    if (error) {
      alert(error.message);
      return;
    }

    onRefresh?.();
  }

  async function handleEditUrl(e) {
    e.preventDefault();
    e.stopPropagation();

    const nextUrl = window.prompt("Edit link URL", link.url ?? "");
    if (nextUrl === null) return;

    const trimmed = nextUrl.trim();
    if (!trimmed) return;

    const { error } = await supabase
      .from("links")
      .update({ url: trimmed })
      .eq("id", link.id);

    if (error) {
      alert(error.message);
      return;
    }

    onRefresh?.();
  }

  async function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm("Delete this link?");
    if (!ok) return;

    const { error } = await supabase.from("links").delete().eq("id", link.id);
    if (error) {
      alert(error.message);
      return;
    }

    onRefresh?.();
  }

  async function handleColor(e, color) {
    e.preventDefault();
    e.stopPropagation();

    const { error } = await supabase
      .from("links")
      .update({ color })
      .eq("id", link.id);

    if (error) {
      alert(error.message);
      return;
    }

    setShowColors(false);
    onRefresh?.();
  }

  return (
    <div ref={setNodeRef} style={style} className="link-item">
      {faviconEnabled && favicon ? (
        <img
          className="link-favicon"
          src={favicon}
          alt=""
          width="16"
          height="16"
          loading="lazy"
        />
      ) : null}

      <div 
        style={{ flex: 1, minWidth: 0, display: 'flex', cursor: 'grab' }}
        {...attributes}
        {...listeners}
      >
        <a
          className="link-title"
          href={href}
          target={openInNewTab ? "_blank" : "_self"}
          rel={openInNewTab ? "noopener noreferrer" : undefined}
          title={link.title}
          style={link.color ? { color: link.color } : undefined}
          onClick={(e) => {
            // Allow click to navigate, but only if not dragging
            if (isDragging) {
              e.preventDefault();
            }
          }}
        >
          {link.title}
        </a>
      </div>

      <div
        className="link-actions-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="link-act"
          title="Actions"
          aria-label="Actions"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowActions((v) => !v);
          }}
          onMouseEnter={() => setShowActions(true)}
        >
          ⚙
        </button>

        {showActions && (
          <div 
            className={`link-actions-menu ${linkIndex >= totalLinks - 2 ? 'position-above' : ''}`}
            onMouseLeave={() => {
              setShowActions(false);
              setShowColors(false);
            }}
          >
            <button
              type="button"
              className="link-act"
              title="Rename title"
              aria-label="Rename title"
              onClick={handleRename}
            >
              ✎
            </button>

            <button
              type="button"
              className="link-act"
              title="Edit URL"
              aria-label="Edit URL"
              onClick={handleEditUrl}
            >
              🔗
            </button>

            <button
              type="button"
              className="link-act"
              title="Text colour"
              aria-label="Text colour"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowColors((v) => !v);
              }}
            >
              ●
            </button>

            {showColors &&
              SWATCH_COLORS.map((swatch) => (
                <button
                  key={swatch.label}
                  type="button"
                  className="color-swatch-inline"
                  title={swatch.label}
                  aria-label={swatch.label}
                  style={{
                    background: swatch.value || "linear-gradient(135deg, #666, #222)",
                    outline: !swatch.value ? "1px solid var(--border)" : "none",
                  }}
                  onClick={(e) => handleColor(e, swatch.value)}
                />
              ))}

            <button
              type="button"
              className="link-act link-act-del"
              title="Delete link"
              aria-label="Delete link"
              onClick={handleDelete}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LinksList({
  section,
  links,
  openInNewTab,
  faviconEnabled,
  onRefresh,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    const current = [...links];
    const oldIndex = current.findIndex((l) => `link-${l.id}` === String(active.id));
    const newIndex = current.findIndex((l) => `link-${l.id}` === String(over.id));

    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(current, oldIndex, newIndex);

    const results = await Promise.all(
      next.map((link, index) =>
        supabase
          .from("links")
          .update({ position: index })
          .eq("id", link.id)
      )
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      alert(failed.error.message);
      return;
    }

    onRefresh?.();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={links.map((link) => `link-${link.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="links-list">
          {links.map((link, index) => (
            <LinkRow
              key={link.id}
              link={link}
              linkIndex={index}
              totalLinks={links.length}
              openInNewTab={openInNewTab}
              faviconEnabled={faviconEnabled}
              onRefresh={onRefresh}
            />
          ))}
          {addingLink === section.id && (
            <form
              style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.35rem 0.5rem', borderTop: '1px solid var(--border)' }}
              onSubmit={async e => {
                e.preventDefault()
                const title = newLinkTitle.trim() || 'New Link'
                const url = newLinkUrl.trim()
                if (!url) return
                const { error } = await supabase.from('links').insert({
                  user_id: section.user_id,
                  workspace_id: section.workspace_id,
                  section_id: section.id,
                  title, url,
                  position: links.length
                })
                if (error) { alert('Error: ' + error.message); return }
                setAddingLink(null)
                await onRefresh?.()
              }}
            >
              <input autoFocus className="input"
                style={{ fontSize: '0.78em', padding: '0.2rem 0.4rem' }}
                placeholder="Link title…"
                value={newLinkTitle}
                onChange={e => setNewLinkTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setAddingLink(null) }}
              />
              <input className="input"
                style={{ fontSize: '0.78em', padding: '0.2rem 0.4rem' }}
                placeholder="https://…"
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setAddingLink(null) }}
              />
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button type="submit" className="btn-xs btn-primary" style={{ flex: 1 }}>Add</button>
                <button type="button" className="btn-xs" onClick={() => setAddingLink(null)}>✕</button>
              </div>
            </form>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SectionCard({
  section,
  isArchiveColumn,
  links,
  onToggleCollapse,
  onDeleteSection,
  onRenameSection,
  onRefresh,
  openInNewTab,
  faviconEnabled,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverCloseTimer = useRef(null);

  const handleArchiveMouseEnter = () => {
    if (!isArchiveColumn) return
    clearTimeout(hoverCloseTimer.current)
    setIsHovered(true)
  }
  const handleArchiveMouseLeave = () => {
    if (!isArchiveColumn) return
    hoverCloseTimer.current = setTimeout(() => setIsHovered(false), 300)
  }
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: String(section.id),
    data: {
      type: "section",
      sectionId: section.id,
      col_index: section.col_index ?? 0,
    },
  });

  // Archive cards: expand on hover, but use delay on close to prevent
  // layout-shift bug where expanding card A moves B into old C position
  const shouldShowContent = isArchiveColumn 
    ? (isHovered || !section.collapsed)
    : !section.collapsed;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 30 : (isArchiveColumn && isHovered ? 100 : 1),
    cursor: isDragging ? 'grabbing' : 'grab',
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.3)' : undefined,
    scale: isDragging ? '1.02' : '1',
    position: 'relative',
  };

  return (
    <>
      {isOver && <div className="drop-indicator" />}
      <div
        ref={setNodeRef}
        style={style}
        className={`section-card ${!shouldShowContent || isDragging ? "collapsed" : ""}`}
        data-section-id={section.id}
        onMouseEnter={handleArchiveMouseEnter}
        onMouseLeave={handleArchiveMouseLeave}
      >
      <div className="section-header">
        <div
          className="section-header-click"
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab' }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(section);
          }}
        >
          <div className="section-name" title={section.name}>
            {section.name}
          </div>
        </div>

        <div className="section-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="icon-btn"
            type="button"
            onClick={() => {
              setAddingLink(section.id)
              setNewLinkTitle('')
              setNewLinkUrl('')
            }}
            title="Add link"
          >
            +
          </button>

          {!isArchiveColumn && (
          <button
            className="icon-btn"
            type="button"
            onClick={() => onToggleCollapse(section)}
            title={section.collapsed ? "Expand" : "Collapse"}
          >
            {section.collapsed ? '▼' : '▲'}
          </button>
          )}

          <button
            className="icon-btn"
            type="button"
            onClick={() => onRenameSection(section)}
            title="Rename section"
          >
            ✎
          </button>

          <button
            className="icon-btn section-delete-btn"
            type="button"
            onClick={() => onDeleteSection(section.id)}
            title="Delete section"
          >
            ×
          </button>
        </div>
      </div>

      {shouldShowContent && (
        <LinksList
          section={section}
          links={links}
          openInNewTab={openInNewTab}
          faviconEnabled={faviconEnabled}
          onRefresh={onRefresh}
        />
      )}
    </div>
    </>
  );
}

function SectionColumn({ col, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
    data: {
      type: "column",
      col_index: col.index,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`section-col${isOver ? " is-over" : ""}`}
      data-col-id={col.id}
    >
      {children}
    </div>
  );
}

export default function Sections({
  sections = [],
  links = [],
  userId,
  workspaceId,
  onRefresh,
  colCount = 4,
  triggerCollapseAll,
  triggerExpandAll,
  openInNewTab = true,
  faviconEnabled = true,
  onAddSection,
}) {
  const [localSections, setLocalSections] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [addingSectionName, setAddingSectionName] = useState(null); // null=hidden, string=editing
  const [addingLink, setAddingLink] = useState(null); // null or section.id
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const isSavingLayoutRef = useRef(false);
  const lastSavedLayoutRef = useRef("");

  useEffect(() => {
    const normalized = [...sections].map((s, i) => ({
      ...s,
      position: Number.isFinite(s.position) ? s.position : i,
      col_index: Number.isFinite(s.col_index)
        ? s.col_index
        : Number.isFinite(s.colindex)
          ? s.colindex
          : 0,
      // Archive column sections (last col) always start collapsed on load
      collapsed: (Number.isFinite(s.col_index) ? s.col_index : 0) === (Math.max(1, Number(colCount || 1)) - 1)
        ? true
        : !!s.collapsed,
    }));

    const incomingSignature = JSON.stringify(
      normalized.map((s) => ({
        id: s.id,
        position: s.position,
        col_index: s.col_index,
        collapsed: !!s.collapsed,
      }))
    );

    if (
      isSavingLayoutRef.current &&
      incomingSignature !== lastSavedLayoutRef.current
    ) {
      return;
    }

    setLocalSections(normalized);

    if (incomingSignature === lastSavedLayoutRef.current) {
      isSavingLayoutRef.current = false;
    }
  }, [sections]);

  const collapseExpandAll = async (collapsedValue, baseSections = localSections) => {
    const next = baseSections.map((s) => ({
      ...s,
      collapsed: collapsedValue,
    }));

    setLocalSections(next);

    const results = await Promise.all(
      next.map((s) =>
        supabase
          .from("sections")
          .update({ collapsed: collapsedValue })
          .eq("id", s.id)
          .eq("workspace_id", workspaceId)
      )
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error("Collapse/expand all failed:", failed.error.message);
      await onRefresh?.();
    }
  };

  useEffect(() => {
    if (!localSections.length) return;
    collapseExpandAll(true, localSections);
  }, [triggerCollapseAll]);

  useEffect(() => {
    if (!localSections.length) return;
    collapseExpandAll(false, localSections);
  }, [triggerExpandAll]);

  // Simplified collision detection - prioritize what's directly under the pointer
  const customCollisionDetection = (args) => {
    // Always use pointer position for most intuitive dragging
    const pointerCollisions = pointerWithin(args);
    
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    
    // Fallback to rect intersection
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }
    
    // Last resort: use closest center
    return closestCenter(args);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { 
        distance: 1,
      },
    })
  );

  const safeColCount = Math.max(1, Number(colCount || 1));

  const columns = useMemo(() => {
    const cols = Array.from({ length: safeColCount }, (_, i) => ({
      id: `col-${i}`,
      index: i,
      items: [],
    }));

    const maxColIndex = localSections.reduce((max, s) => {
      const ci = Number.isFinite(s.col_index) ? s.col_index : 0
      return Math.max(max, ci)
    }, 0)

    ;[...localSections]
      .sort((a, b) => {
        const ca = Number.isFinite(a.col_index) ? a.col_index : 0;
        const cb = Number.isFinite(b.col_index) ? b.col_index : 0;
        if (ca !== cb) return ca - cb;
        return (a.position ?? 0) - (b.position ?? 0);
      })
      .forEach((section) => {
        const raw = Number.isFinite(section.col_index) ? section.col_index : 0;
        const isArchive = maxColIndex > 0 && raw >= maxColIndex
        const col = isArchive
          ? safeColCount - 1
          : Math.min(raw, Math.max(safeColCount - 2, 0))
        cols[col].items.push(section);
      });

    return cols;
  }, [localSections, safeColCount]);

  function findContainer(id) {
    if (!id) return null;
    const asString = String(id);

    if (asString.startsWith("col-")) return asString;

    for (const col of columns) {
      if (col.items.some((item) => String(item.id) === asString)) {
        return `col-${col.index}`;
      }
    }

    return null;
  }

  function buildUpdatedSections(itemsByCol) {
    const next = [];
    const lastColIndex = itemsByCol.length - 1;
    
    itemsByCol.forEach((items, col_index) => {
      items.forEach((item, position) => {
        next.push({
          ...item,
          col_index,
          position,
          // Auto-collapse if moved to archive column (last column)
          collapsed: col_index === lastColIndex ? true : item.collapsed,
        });
      });
    });
    return next;
  }

  async function persistSections(nextSections) {
    const results = await Promise.all(
      nextSections.map((s) =>
        supabase
          .from("sections")
          .update({
            col_index: s.col_index ?? 0,
            position: s.position ?? 0,
            collapsed: s.collapsed ?? false,
          })
          .eq("id", s.id)
          .eq("workspace_id", workspaceId)
      )
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  }

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);
    
    if (!active || !over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceColId = findContainer(activeId);
    const targetColId = findContainer(overId);

    if (!sourceColId || !targetColId) return;

    const sourceIndex = Number(sourceColId.replace("col-", ""));
    const targetIndex = Number(targetColId.replace("col-", ""));

    const itemsByCol = columns.map((c) => [...c.items]);

    const fromIndex = itemsByCol[sourceIndex].findIndex(
      (s) => String(s.id) === activeId
    );
    if (fromIndex === -1) return;

    const [moved] = itemsByCol[sourceIndex].splice(fromIndex, 1);

    if (overId.startsWith("col-")) {
      itemsByCol[targetIndex].push(moved);
    } else {
      const targetItemIndex = itemsByCol[targetIndex].findIndex(
        (s) => String(s.id) === overId
      );
      const insertAt =
        targetItemIndex === -1 ? itemsByCol[targetIndex].length : targetItemIndex;
      itemsByCol[targetIndex].splice(insertAt, 0, moved);
    }

    const nextSections = buildUpdatedSections(itemsByCol);
    const nextSignature = JSON.stringify(
      nextSections.map((s) => ({
        id: s.id,
        position: s.position,
        col_index: s.col_index,
        collapsed: !!s.collapsed,
      }))
    );

    isSavingLayoutRef.current = true;
    lastSavedLayoutRef.current = nextSignature;
    setLocalSections(nextSections);

    try {
      await persistSections(nextSections);
    } catch (err) {
      isSavingLayoutRef.current = false;
      console.error("Section reorder failed:", err?.message || err);
      await onRefresh?.();
    }
  }

  async function handleToggleCollapse(section) {
    const nextCollapsed = !section.collapsed;
    const isInArchiveColumn = section.col_index === (safeColCount - 1);

    // If this is an archive column section being OPENED, close all other archive sections
    if (isInArchiveColumn && !nextCollapsed) {
      setLocalSections((prev) =>
        prev.map((s) => {
          if (s.id === section.id) {
            return { ...s, collapsed: false }; // Open this one
          } else if (s.col_index === (safeColCount - 1)) {
            return { ...s, collapsed: true }; // Close other archive sections
          }
          return s;
        })
      );

      // Update all archive column sections in database
      const archiveSections = localSections.filter(s => s.col_index === (safeColCount - 1));
      await Promise.all(
        archiveSections.map(s =>
          supabase
            .from("sections")
            .update({ collapsed: s.id === section.id ? false : true })
            .eq("id", s.id)
            .eq("workspace_id", workspaceId)
        )
      );
    } else {
      // Normal toggle for non-archive sections
      setLocalSections((prev) =>
        prev.map((s) =>
          s.id === section.id ? { ...s, collapsed: nextCollapsed } : s
        )
      );

      const { error } = await supabase
        .from("sections")
        .update({ collapsed: nextCollapsed })
        .eq("id", section.id)
        .eq("workspace_id", workspaceId);

      if (error) {
        console.error("Collapse update failed:", error.message);
        await onRefresh?.();
      }
    }
  }

  async function handleRenameSection(section) {
    const nextName = window.prompt("Rename section", section.name ?? "");
    if (nextName === null) return;

    const trimmed = nextName.trim();
    if (!trimmed) return;

    const { error } = await supabase
      .from("sections")
      .update({ name: trimmed })
      .eq("id", section.id)
      .eq("workspace_id", workspaceId);

    if (error) {
      alert(error.message);
      return;
    }

    await onRefresh?.();
  }

  async function handleDeleteSection(sectionId) {
    const ok = window.confirm("Delete this section?");
    if (!ok) return;

    const { error: linksError } = await supabase
      .from("links")
      .delete()
      .eq("section_id", sectionId)
      .eq("workspace_id", workspaceId);

    if (linksError) {
      alert(linksError.message);
      return;
    }

    const { error: sectionError } = await supabase
      .from("sections")
      .delete()
      .eq("id", sectionId)
      .eq("workspace_id", workspaceId);

    if (sectionError) {
      alert(sectionError.message);
      return;
    }

    await onRefresh?.();
  }

  const activeSection = activeId 
    ? localSections.find(s => String(s.id) === String(activeId))
    : null;

  // Empty state when no sections exist
  if (localSections.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        gap: '1.5rem',
        minHeight: '50vh'
      }}>
        <div style={{
          fontSize: '3rem',
          opacity: 0.3
        }}>📑</div>
        <div style={{
          fontSize: '1.1em',
          color: 'var(--text)',
          fontWeight: 500,
          textAlign: 'center'
        }}>
          This workspace is empty
        </div>
        <div style={{
          fontSize: '0.9em',
          color: 'var(--text-dim)',
          textAlign: 'center',
          maxWidth: '400px',
          lineHeight: 1.6
        }}>
          Create your first section to organize your bookmarks
        </div>
        {addingSectionName !== null ? (
          <form style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.75rem' }}
            onSubmit={async e => {
              e.preventDefault()
              const name = addingSectionName.trim() || 'New Section'
              const { error } = await supabase.from('sections').insert({
                user_id: userId, workspace_id: workspaceId,
                name, position: 0, collapsed: false
              })
              if (error) { alert('Error: ' + error.message); return }
              setAddingSectionName(null)
              await onRefresh?.()
            }}>
            <input autoFocus className="input"
              style={{ fontSize: '0.9em', padding: '0.4rem 0.7rem' }}
              placeholder="Section name…"
              value={addingSectionName}
              onChange={e => setAddingSectionName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setAddingSectionName(null) }}
            />
            <button type="submit" className="btn btn-primary">Create</button>
            <button type="button" className="icon-btn" onClick={() => setAddingSectionName(null)}>✕</button>
          </form>
        ) : (
        <button
          className="btn btn-primary"
          onClick={() => setAddingSectionName('')}
          style={{
            fontSize: '0.95em',
            padding: '0.6rem 1.5rem',
            marginTop: '0.5rem'
          }}
        >
          + Create First Section
        </button>
        )}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="sections-col-header-row" style={{ gridTemplateColumns: `repeat(${safeColCount}, 1fr)` }}>
        {columns.map((col) => {
          const isArchiveColumn = col.index === columns.length - 1
          return (
            <div key={col.id} className="sections-col-header">
              {col.index === 0 && (
                addingSectionName !== null ? (
                  <form style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                    onSubmit={e => {
                      e.preventDefault()
                      onAddSection(addingSectionName.trim() || 'New Section')
                      setAddingSectionName(null)
                    }}>
                    <input autoFocus className="input"
                      style={{ fontSize: '0.75em', padding: '0.2rem 0.4rem', width: '120px' }}
                      placeholder="Section name…"
                      value={addingSectionName}
                      onChange={e => setAddingSectionName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') setAddingSectionName(null) }}
                    />
                    <button type="submit" className="icon-btn" style={{ color: 'var(--accent)' }}>✓</button>
                    <button type="button" className="icon-btn" onClick={() => setAddingSectionName(null)}>✕</button>
                  </form>
                ) : (
                  <button
                    className="icon-btn col-header-btn"
                    title="Add new section"
                    onClick={() => setAddingSectionName('')}
                    style={{ fontSize: '1.2em', color: 'var(--col-header-color)' }}
                  >+</button>
                )
              )}
              {isArchiveColumn && (
                <span className="col-header-label" style={{ color: 'var(--col-header-color)' }}>
                  Archive Column
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="sections-grid">
        {columns.map((col) => {
          const isArchiveColumn = col.index === columns.length - 1;
          
          return (
          <SortableContext
            key={col.id}
            id={col.id}
            items={col.items.map((s) => String(s.id))}
            strategy={verticalListSortingStrategy}
          >
            <SectionColumn col={col}>
              {col.items.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  isArchiveColumn={isArchiveColumn}
                  links={[...links]
                    .filter((l) => l.section_id === section.id)
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))}
                  onToggleCollapse={handleToggleCollapse}
                  onDeleteSection={handleDeleteSection}
                  onRenameSection={handleRenameSection}
                  onRefresh={onRefresh}
                  openInNewTab={openInNewTab}
                  faviconEnabled={faviconEnabled}
                />
              ))}
            </SectionColumn>
          </SortableContext>
        )})}
      </div>
      <DragOverlay>
        {activeSection ? (
          <div style={{
            opacity: 1,
            cursor: 'grabbing',
          }}>
            <div className="section-card collapsed" style={{
              background: 'var(--card)',
              border: '1px solid var(--accent)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            }}>
              <div className="section-header">
                <div className="section-name" style={{ padding: '0.5rem 1rem' }}>
                  {activeSection.name}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}