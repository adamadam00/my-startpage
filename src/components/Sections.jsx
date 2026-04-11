import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
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
        <button
          type="button"
          className="section-grab"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          title="Drag section"
          aria-label={`Drag section ${section.name}`}
        >
          <span className="section-grab-dots">⋮⋮</span>
        </button>

        <div
          className="section-header-click"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(section);
          }}
        >
          <div className="section-name">{section.name}</div>
        </div>

        <div className="section-actions" onClick={(e) => e.stopPropagation()}>
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

function SectionColumn({
  col,
  children,
}) {
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
}) {
  const [localSections, setLocalSections] = useState([]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerCollapseAll]);

  useEffect(() => {
    if (!localSections.length) return;
    collapseExpandAll(false, localSections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerExpandAll]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  const safeColCount = Math.max(1, Number(colCount || 1));

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
      .forEach((section) => {
        const raw = Number.isFinite(section.col_index) ? section.col_index : 0;
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
    itemsByCol.forEach((items, col_index) => {
      items.forEach((item, position) => {
        next.push({
          ...item,
          col_index,
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
            col_index: s.col_index ?? 0,
            position: s.position ?? 0,
          })
          .eq("id", s.id)
          .eq("workspace_id", workspaceId)
      )
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
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
            <SectionColumn col={col}>
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
            </SectionColumn>
          </SortableContext>
        ))}
      </div>
    </DndContext>
  );
}