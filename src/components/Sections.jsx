import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
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
      col_index: section.col_index ?? 0,
    },
  });

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
        />
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
            {section.collapsed ? "+" : "−"}
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
              link.url?.startsWith("http://") ||
              link.url?.startsWith("https://")
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

function normalizeSections(sections = []) {
  return sections.map((s, i) => ({
    ...s,
    position: Number.isFinite(s.position) ? s.position : i,
    col_index: Number.isFinite(s.col_index) ? s.col_index : 0,
  }));
}

function sameLayout(a = [], b = []) {
  if (a.length !== b.length) return false;
  const key = (s) => ({
    id: String(s.id),
    col_index: Number.isFinite(s.col_index) ? s.col_index : 0,
    position: Number.isFinite(s.position) ? s.position : 0,
    collapsed: !!s.collapsed,
  });
  const aa = [...a].map(key).sort((x, y) => x.id.localeCompare(y.id));
  const bb = [...b].map(key).sort((x, y) => x.id.localeCompare(y.id));
  return JSON.stringify(aa) === JSON.stringify(bb);
}

export default function Sections({
  sections,
  links,
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
  const isPersistingRef = useRef(false);

  // Sync incoming sections → local state, but skip if we just persisted
  useEffect(() => {
    const normalized = normalizeSections(sections);
    if (isPersistingRef.current) {
      if (sameLayout(normalized, localSections)) {
        isPersistingRef.current = false;
        return;
      }
    }
    setLocalSections((prev) =>
      sameLayout(prev, normalized) ? prev : normalized
    );
  }, [sections]);

  // ── Collapse / Expand all ──────────────────────────────────────────────────
  const collapseExpandAll = async (collapsedValue, base = localSections) => {
    const next = base.map((s) => ({ ...s, collapsed: collapsedValue }));
    setLocalSections(next);
    await Promise.all(
      next.map((s) =>
        supabase
          .from("sections")
          .update({ collapsed: collapsedValue })
          .eq("id", s.id)
          .eq("workspace_id", workspaceId)
      )
    );
    await onRefresh?.();
  };

  useEffect(() => {
    if (!localSections.length) return;
    collapseExpandAll(true, localSections);
  }, [triggerCollapseAll]);

  useEffect(() => {
    if (!localSections.length) return;
    collapseExpandAll(false, localSections);
  }, [triggerExpandAll]);

  // ── DnD ───────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
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
        const ca = Number.isFinite(a.col_index) ? a.col_index : 0;
        const cb = Number.isFinite(b.col_index) ? b.col_index : 0;
        if (ca !== cb) return ca - cb;
        return (a.position ?? 0) - (b.position ?? 0);
      })
      .forEach((s) => {
        const ci = Math.min(
          Math.max(Number.isFinite(s.col_index) ? s.col_index : 0, 0),
          safeColCount - 1
        );
        cols[ci].items.push(s);
      });

    return cols;
  }, [localSections, safeColCount]);

  function findContainer(id) {
    const str = String(id);
    if (str.startsWith("col-")) return str;
    for (const col of columns) {
      if (col.items.some((s) => String(s.id) === str)) return `col-${col.index}`;
    }
    return null;
  }

  function buildUpdated(itemsByCol) {
    const next = [];
    itemsByCol.forEach((items, col_index) => {
      items.forEach((item, position) => {
        next.push({ ...item, col_index, position });
      });
    });
    return next;
  }

  async function persistSections(nextSections) {
    const results = await Promise.all(
      nextSections.map((s) =>
        supabase
          .from("sections")
          .update({ col_index: s.col_index ?? 0, position: s.position ?? 0 })
          .eq("id", s.id)
          .eq("workspace_id", workspaceId)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  }

  async function handleDragEnd({ active, over }) {
    if (!active || !over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const srcColId = findContainer(activeId);
    const dstColId = findContainer(overId);
    if (!srcColId || !dstColId) return;

    const srcIdx = Number(srcColId.replace("col-", ""));
    const dstIdx = Number(dstColId.replace("col-", ""));

    const itemsByCol = columns.map((c) => [...c.items]);
    const fromPos = itemsByCol[srcIdx].findIndex(
      (s) => String(s.id) === activeId
    );
    if (fromPos === -1) return;

    const [moved] = itemsByCol[srcIdx].splice(fromPos, 1);

    if (overId.startsWith("col-")) {
      itemsByCol[dstIdx].push(moved);
    } else {
      const toPos = itemsByCol[dstIdx].findIndex(
        (s) => String(s.id) === overId
      );
      itemsByCol[dstIdx].splice(toPos === -1 ? itemsByCol[dstIdx].length : toPos, 0, moved);
    }

    const nextSections = buildUpdated(itemsByCol);

    isPersistingRef.current = true;
    setLocalSections(nextSections);

    try {
      await persistSections(nextSections);
    } catch (err) {
      console.error("Section reorder failed:", err?.message || err);
      isPersistingRef.current = false;
      await onRefresh?.();
    }
  }

  async function handleToggleCollapse(section) {
    const next = !section.collapsed;
    setLocalSections((prev) =>
      prev.map((s) => (s.id === section.id ? { ...s, collapsed: next } : s))
    );
    const { error } = await supabase
      .from("sections")
      .update({ collapsed: next })
      .eq("id", section.id)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Collapse failed:", error.message);
      await onRefresh?.();
    }
  }

  async function handleDeleteSection(sectionId) {
    if (!window.confirm("Delete this section?")) return;

    const { error: le } = await supabase
      .from("links")
      .delete()
      .eq("section_id", sectionId)
      .eq("workspace_id", workspaceId);

    if (le) { alert(le.message); return; }

    const { error: se } = await supabase
      .from("sections")
      .delete()
      .eq("id", sectionId)
      .eq("workspace_id", workspaceId);

    if (se) { alert(se.message); return; }

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
                  links={links.filter((l) => l.section_id === section.id)}
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