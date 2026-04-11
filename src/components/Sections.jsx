import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
<<<<<<< HEAD
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Links from './Links'
 
function parseAFineStart(raw) {
  let data
  try { data = JSON.parse(raw) } catch { throw new Error('Not valid JSON — paste the export code exactly.') }
  const extractBookmarks = (bms) => bms
    .map(b => ({ title: b.name || b.title || 'Link', url: b.url || b.href }))
    .filter(b => b.url)
  const groups = []
  if (Array.isArray(data) && data.every(i => Array.isArray(i))) {
    data.forEach(col => col.forEach(g => { if (g?.name) groups.push({ name: g.name, links: extractBookmarks(g.bookmarks || []) }) }))
    if (groups.length) return groups
  }
  if (Array.isArray(data) && data[0]?.name) {
    data.forEach(g => { if (g?.name) groups.push({ name: g.name, links: extractBookmarks(g.bookmarks || g.links || []) }) })
    if (groups.length) return groups
  }
  const root = data.columns || data.groups || data.data || null
  if (Array.isArray(root)) {
    root.forEach(item => {
      if (Array.isArray(item)) item.forEach(g => { if (g?.name) groups.push({ name: g.name, links: extractBookmarks(g.bookmarks || []) }) })
      else if (item?.name) groups.push({ name: item.name, links: extractBookmarks(item.bookmarks || item.links || []) })
    })
    if (groups.length) return groups
  }
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    const bms = node.bookmarks || node.links || node.items
    if ((node.name || node.title) && Array.isArray(bms)) {
      groups.push({ name: node.name || node.title, links: extractBookmarks(bms) }); return
    }
    ;(Array.isArray(node) ? node : Object.values(node)).forEach(walk)
  }
  walk(data)
  if (groups.length) return groups
  throw new Error(`No groups found. Keys: ${Object.keys(data).join(', ')}`)
}

function buildColumns(sections = [], colCount = 2) {
  const cols = Math.max(colCount, 1)
  const result = Array.from({ length: cols }, () => [])
  const sorted = [...sections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const allZero = sorted.length > 0 && sorted.every(s => (s.colindex ?? 0) === 0)
  sorted.forEach((s, i) => {
    const ci = allZero ? i % cols : Math.min(Math.max(s.colindex ?? 0, 0), cols - 1)
    result[ci].push(s)
  })
  return result
}

function findColIndex(cols, id) {
  return cols.findIndex(col => col.some(s => s.id === id))
}

/* ── Section card ── */
function SectionCard({ section, links, userId, workspaceId, onRefresh, openInNewTab, ghost, locked, forceCollapsed }) {
  const [collapsed, setCollapsed] = useState(section.collapsed ?? false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(section.name ?? '')
  const [addingLink, setAddingLink] = useState(false)
  const [titleHovered, setTitleHovered] = useState(false)
  const [headerHovered, setHeaderHovered] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id, disabled: locked,
  })
=======
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "../lib/supabase";

function SectionCard({
  section,
  links,
  onToggleCollapse,
  onDeleteSection,
  openInNewTab,
  faviconEnabled,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(section.id),
    data: {
      type: "section",
      sectionId: section.id,
      colindex: section.colindex ?? 0,
    },
  });
>>>>>>> 1df3ed3a4a7d4c43d04525ab337eaaa0a563ba3c

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    zIndex: isDragging ? 30 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`section-card ${section.collapsed ? "collapsed" : ""}`}
      data-section-id={section.id}
    >
      <div className="section-header">
        <div
          className="section-drag-handle drag-handle"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          title="Drag section"
          aria-label={`Drag section ${section.name}`}
        >
          ⋮⋮
        </div>

        <div
          className="section-header-click"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(section);
          }}
        >
          <div className="section-name">{section.name}</div>
        </div>

        <div
          className="section-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="icon-btn"
            type="button"
            onClick={() => onToggleCollapse(section)}
            title={section.collapsed ? "Expand" : "Collapse"}
          >
            {section.collapsed ? "▸" : "▾"}
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

      {!section.collapsed && (
        <div className="links-list">
          {links.map((link) => {
            const href =
              link.url?.startsWith("http://") || link.url?.startsWith("https://")
                ? link.url
                : `https://${link.url}`;

            let faviconUrl = "";
            try {
              const u = new URL(href);
              faviconUrl = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
            } catch {
              faviconUrl = "";
            }

            return (
              <div className="link-item" key={link.id}>
                {faviconEnabled && faviconUrl ? (
                  <img
                    className="link-favicon"
                    src={faviconUrl}
                    alt=""
                    width="16"
                    height="16"
                    loading="lazy"
                  />
                ) : null}

                <a
                  className="link-title"
                  href={href}
                  target={openInNewTab ? "_blank" : "_self"}
                  rel={openInNewTab ? "noopener noreferrer" : undefined}
                  title={link.title}
                >
                  {link.title}
                </a>
              </div>
            );
          })}
        </div>
      )}
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
}) {
  const [localSections, setLocalSections] = useState([]);

  useEffect(() => {
    const normalized = [...sections].map((s, i) => ({
      ...s,
      position: Number.isFinite(s.position) ? s.position : i,
      colindex: Number.isFinite(s.colindex) ? s.colindex : 0,
    }));
    setLocalSections(normalized);
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
          .eq("workspaceid", workspaceId)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerCollapseAll]);

  useEffect(() => {
    if (!localSections.length) return;
    collapseExpandAll(false, localSections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerExpandAll]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const safeColCount = Math.max(1, Number(colCount) || 1);

  const columns = useMemo(() => {
    const cols = Array.from({ length: safeColCount }, (_, i) => ({
      id: `col-${i}`,
      index: i,
      items: [],
    }));

    [...localSections]
      .sort((a, b) => {
        const ca = Number.isFinite(a.colindex) ? a.colindex : 0;
        const cb = Number.isFinite(b.colindex) ? b.colindex : 0;
        if (ca !== cb) return ca - cb;
        return (a.position ?? 0) - (b.position ?? 0);
      })
      .forEach((section) => {
        const raw = Number.isFinite(section.colindex) ? section.colindex : 0;
        const col = Math.min(Math.max(raw, 0), safeColCount - 1);
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

    itemsByCol.forEach((items, colindex) => {
      items.forEach((item, position) => {
        next.push({
          ...item,
          colindex,
          position,
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
            colindex: s.colindex ?? 0,
            position: s.position ?? 0,
          })
          .eq("id", s.id)
          .eq("workspaceid", workspaceId)
      )
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      throw failed.error;
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!active || !over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

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
    setLocalSections(nextSections);

    try {
      await persistSections(nextSections);
      await onRefresh?.();
    } catch (err) {
      console.error("Section reorder failed:", err?.message || err);
      await onRefresh?.();
    }
  }

  async function handleToggleCollapse(section) {
    const nextCollapsed = !section.collapsed;

    setLocalSections((prev) =>
      prev.map((s) =>
        s.id === section.id ? { ...s, collapsed: nextCollapsed } : s
      )
    );

    const { error } = await supabase
      .from("sections")
      .update({ collapsed: nextCollapsed })
      .eq("id", section.id)
      .eq("workspaceid", workspaceId);

    if (error) {
      console.error("Collapse update failed:", error.message);
      await onRefresh?.();
    }
  }

  async function handleDeleteSection(sectionId) {
    const ok = window.confirm("Delete this section?");
    if (!ok) return;

    const { error: linksError } = await supabase
      .from("links")
      .delete()
      .eq("sectionid", sectionId)
      .eq("workspaceid", workspaceId);

    if (linksError) {
      alert(linksError.message);
      return;
    }

    const { error: sectionError } = await supabase
      .from("sections")
      .delete()
      .eq("id", sectionId)
      .eq("workspaceid", workspaceId);

    if (sectionError) {
      alert(sectionError.message);
      return;
    }

    await onRefresh?.();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="sections-grid">
        {columns.map((col) => (
          <SortableContext
            key={col.id}
            id={col.id}
            items={col.items.map((s) => String(s.id))}
            strategy={verticalListSortingStrategy}
          >
            <div className="section-col" data-col-id={col.id}>
              {col.items.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  links={links.filter((l) => l.sectionid === section.id)}
                  onToggleCollapse={handleToggleCollapse}
                  onDeleteSection={handleDeleteSection}
                  openInNewTab={openInNewTab}
                  faviconEnabled={faviconEnabled}
                />
              ))}
            </div>
          </SortableContext>
        ))}
      </div>
    </DndContext>
  );
}