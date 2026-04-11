import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  const href = normalizeUrl(link.url);
  const favicon = getFavicon(href);

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

  async function handleEdit(e) {
    e.preventDefault();
    e.stopPropagation();

    const nextTitle = window.prompt("Rename link", link.title ?? "");
    if (nextTitle === null) return;

    const nextUrl = window.prompt("Edit link URL", link.url ?? "");
    if (nextUrl === null) return;

    const { error } = await supabase
      .from("links")
      .update({
        title: nextTitle.trim() || link.title,
        url: nextUrl.trim() || link.url,
      })
      .eq("id", link.id);

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
      <button
        type="button"
        className="link-act"
        title="Drag link"
        aria-label={`Drag link ${link.title}`}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        ⋮⋮
      </button>

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

      <a
        className="link-title"
        href={href}
        target={openInNewTab ? "_blank" : "_self"}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        title={link.title}
        style={link.color ? { color: link.color } : undefined}
      >
        {link.title}
      </a>

      <div
        className={`link-actions-overlay${showColors ? " colors-open" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="link-act"
          title="Edit link"
          onClick={handleEdit}
        >
          Edit
        </button>

        <button
          type="button"
          className="link-act"
          title="Text colour"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowColors((v) => !v);
          }}
        >
          Colour
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
          onClick={handleDelete}
        >
          Del
        </button>
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
          {links.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              openInNewTab={openInNewTab}
              faviconEnabled={faviconEnabled}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SectionCard({
  section,
  links,
  onToggleCollapse,
  onDeleteSection,
  onRenameSection,
  onRefresh,
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
          <div className="section-name" title={section.name}>
            {section.name}
          </div>
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

      {!section.collapsed && (
        <LinksList
          section={section}
          links={links}
          openInNewTab={openInNewTab}
          faviconEnabled={faviconEnabled}
          onRefresh={onRefresh}
        />
      )}
    </div>
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
        ))}
      </div>
    </DndContext>
  );
}