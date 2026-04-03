"use client";

import { useRef, useState } from "react";
import { APP_VERSION } from "@/app/_lib/authoring-utils";
import { getFeatureTypeLabel } from "@/app/_lib/label-utils";
import { CanvasFeature, ContentBlock, PageItem, PublishStatus } from "@/app/_lib/authoring-types";

type PageSidebarProps = {
  onAddPage: () => void;
  onOpenPage: (id: string, blockId?: string) => void;
  onPublishStatusChange: (pageId: string, status: PublishStatus) => void;
  onReorderBlocks: (pageId: string, fromIndex: number, toIndex: number) => void;
  onSelectFeature: (pageId: string, featureId: string) => void;
  pages: PageItem[];
  selectedFeatureId: string | null;
  selectedPageId: string;
  currentGameName?: string;
  currentStudioName?: string;
  currentGameId?: string;
  onRenameGame?: (name: string) => void;
  onOpenChangelog?: () => void;
  onOpenAccount?: () => void;
  onOpenGameSwitcher?: () => void;
};

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
    >
      <path
        d="M2 4l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SidebarPageButton({
  isSelected,
  onOpenPage,
  page,
}: {
  isSelected: boolean;
  onOpenPage: (id: string, blockId?: string) => void;
  page: PageItem;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenPage(page.id)}
      aria-current={isSelected ? "page" : undefined}
      className={`flex w-full items-center rounded-2xl border px-3 py-3 text-left transition ${
        isSelected
          ? "border-black bg-black text-white shadow-lg shadow-black/10 ring-2 ring-black/15"
          : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-white"
      }`}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          {page.title || "Untitled page"}
        </div>
        {page.kind === "hotspot" && page.x !== null && page.y !== null ? (
          <div className={`mt-0.5 text-xs ${isSelected ? "text-neutral-300" : "text-neutral-400"}`}>
            {Math.round(page.x)}%, {Math.round(page.y)}%
          </div>
        ) : null}
      </div>
    </button>
  );
}

function SidebarFeatureItem({
  feature,
  isSelected,
  onSelect,
}: {
  feature: CanvasFeature;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition ${
        isSelected
          ? "border-black bg-black text-white"
          : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-white hover:text-neutral-900"
      }`}
    >
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
          isSelected ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-500"
        }`}
      >
        {getFeatureTypeLabel(feature.type)}
      </span>
      <span className="truncate font-medium">{feature.label || "Unnamed"}</span>
    </button>
  );
}

function getTabSections(blocks: ContentBlock[]) {
  const result: Array<{ blockId: string; tabId: string; label: string }> = [];
  for (const block of blocks) {
    if (block.type === "tabs") {
      try {
        const data = JSON.parse(block.value);
        const sections: Array<{ id: string; label: string }> = data.sections ?? [];
        sections.forEach((s, i) => {
          result.push({ blockId: block.id, tabId: s.id, label: s.label || `Tab ${i + 1}` });
        });
      } catch { /* ignore */ }
    }
  }
  return result;
}

const BLOCK_LABELS: Record<string, string> = {
  text: "Text", callout: "Callout", image: "Image", tabs: "Tabs",
  section: "Section", "step-rail": "Step Rail", carousel: "Carousel", consent: "Consent",
};

function getBlockPreview(block: ContentBlock): string {
  if (block.type === "text" || block.type === "callout" || block.type === "section") {
    return block.value.split("\n")[0].slice(0, 48) || (BLOCK_LABELS[block.type] ?? block.type);
  }
  return BLOCK_LABELS[block.type] ?? block.type;
}

function SidebarBlockItem({
  block,
  index,
  pageId,
  onOpen,
  dragIndex,
  dropIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  block: ContentBlock;
  index: number;
  pageId: string;
  onOpen: () => void;
  dragIndex: number | null;
  dropIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}) {
  const isBeingDragged = dragIndex === index;
  const showDropLine = dropIndex === index && dragIndex !== null && dragIndex !== index && dragIndex !== index - 1;

  return (
    <div
      className={`relative ${isBeingDragged ? "opacity-40" : ""}`}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={(e) => { e.preventDefault(); onDrop(index); }}
    >
      {showDropLine && (
        <div className="pointer-events-none absolute -top-1.5 inset-x-0 z-20 h-0.5 rounded-full bg-blue-500" />
      )}
      <div
        draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(index); }}
        onDragEnd={onDragEnd}
        className="flex w-full cursor-grab items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-2 active:cursor-grabbing"
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs text-neutral-700 hover:text-neutral-900 transition"
        >
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-neutral-200 text-neutral-500">
            {BLOCK_LABELS[block.type] ?? block.type}
          </span>
          <span className="truncate font-medium">{getBlockPreview(block)}</span>
        </button>
      </div>
    </div>
  );
}

function SidebarTabItem({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-left text-xs text-neutral-700 hover:bg-white hover:text-neutral-900 transition"
    >
      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-neutral-200 text-neutral-500">
        Tab
      </span>
      <span className="truncate font-medium">{label}</span>
    </button>
  );
}

function CollapsibleSection({
  children,
  emptyText,
  isEmpty,
  title,
  open,
  onToggle,
  count,
  action,
}: {
  children?: React.ReactNode;
  emptyText?: string;
  isEmpty?: boolean;
  title: string;
  open: boolean;
  onToggle: () => void;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex w-full items-center justify-between gap-2 px-0.5 py-0.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex flex-1 items-center gap-1.5 rounded-lg text-left hover:opacity-70"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            {title}
          </span>
          {count !== undefined && count > 0 ? (
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-400 leading-none">
              {count}
            </span>
          ) : null}
          <ChevronIcon expanded={open} />
        </button>
        {action ? action : null}
      </div>
      {open ? (
        isEmpty ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 px-3 py-3 text-xs leading-5 text-neutral-400">
            {emptyText}
          </div>
        ) : (
          <ul role="list" className="space-y-1.5">{children}</ul>
        )
      ) : null}
    </div>
  );
}

export function PageSidebar({
  onAddPage,
  onOpenPage,
  onPublishStatusChange: _onPublishStatusChange,
  onReorderBlocks,
  onSelectFeature,
  pages,
  selectedFeatureId,
  selectedPageId,
  currentGameName = "Ugly Pickle",
  currentStudioName = "Bee Studio",
  currentGameId,
  onRenameGame,
  onOpenChangelog,
  onOpenAccount,
  onOpenGameSwitcher,
}: PageSidebarProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startEditName() {
    setNameInput(currentGameName);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  function commitName() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== currentGameName) onRenameGame?.(trimmed);
    setEditingName(false);
  }
  const [blockDrag, setBlockDrag] = useState<{ pageId: string; dragIndex: number; dropIndex: number } | null>(null);

  function makeBlockDragHandlers(pageId: string, blockCount: number) {
    return {
      dragIndex: blockDrag?.pageId === pageId ? blockDrag.dragIndex : null,
      dropIndex: blockDrag?.pageId === pageId ? blockDrag.dropIndex : null,
      onDragStart: (index: number) => setBlockDrag({ pageId, dragIndex: index, dropIndex: index }),
      onDragOver: (index: number) => setBlockDrag((prev) => prev ? { ...prev, dropIndex: index } : null),
      onDrop: (overIndex: number) => {
        if (!blockDrag || blockDrag.pageId !== pageId) return;
        const to = blockDrag.dragIndex < overIndex ? overIndex - 1 : overIndex;
        if (to !== blockDrag.dragIndex) onReorderBlocks(pageId, blockDrag.dragIndex, to);
        setBlockDrag(null);
      },
      onDragEnd: () => setBlockDrag(null),
    };
  }
  const homePages = pages.filter((p) => p.kind === "home");
  const navPages = pages.filter((p) => p.kind === "page");
  const hotspotItems = pages.filter((p) => p.kind === "hotspot" && p.x !== null);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(["elements", "page-buttons", "hotspots", "pages"])
  );

  const toggleSection = (key: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="flex h-full flex-col border-r border-neutral-200 bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mb-6 flex items-center gap-2.5">
          <img src="/sherpa-icon.svg" alt="Sherpa" className="h-11 w-11 rounded-lg" draggable={false} />
          <div className="flex items-baseline gap-2">
            <div className="text-lg font-semibold text-neutral-900">Sherpa</div>
            <button
              type="button"
              onClick={() => onOpenChangelog?.()}
              className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50"
            >
              {APP_VERSION}
            </button>
          </div>
        </div>

        {/* Board section */}
        {homePages.length > 0 ? (
          <div className="space-y-4">
            {homePages.map((homePage) => {
              const elements = homePage.canvasFeatures.filter((f) => f.type !== "page-button");
              const pageButtons = homePage.canvasFeatures.filter((f) => f.type === "page-button");

              return (
                <div key={homePage.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 space-y-3">
                  {/* Game name — editable inline */}
                  <div className="flex items-center gap-1.5 px-0.5">
                    {editingName ? (
                      <input
                        ref={nameInputRef}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onBlur={commitName}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitName();
                          if (e.key === "Escape") setEditingName(false);
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-2 py-0.5 text-sm font-semibold text-neutral-900 outline-none focus:border-black"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenPage(homePage.id)}
                        className={`min-w-0 flex-1 truncate text-left text-sm font-semibold ${homePage.id === selectedPageId ? "text-neutral-900" : "text-neutral-700 hover:text-neutral-900"}`}
                      >
                        {currentGameName}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={startEditName}
                      title="Rename game"
                      className="shrink-0 rounded-md p-1 text-neutral-300 hover:bg-neutral-200 hover:text-neutral-600"
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M1.5 8.5V9.5h1L8 4 7 3 1.5 8.5zM9.5 2.5a.707.707 0 000-1L8.5 0.5a.707.707 0 00-1 0L6.5 1.5 8.5 3.5 9.5 2.5z" fill="currentColor" />
                      </svg>
                    </button>
                  </div>

                  <CollapsibleSection
                    title="Board elements"
                    open={openSections.has("elements")}
                    onToggle={() => toggleSection("elements")}
                    isEmpty={elements.length === 0}
                    emptyText="No board elements added yet."
                    count={elements.length}
                  >
                    {elements.map((feature) => (
                      <li key={feature.id}>
                        <SidebarFeatureItem
                          feature={feature}
                          isSelected={feature.id === selectedFeatureId}
                          onSelect={() => onSelectFeature(homePage.id, feature.id)}
                        />
                      </li>
                    ))}
                  </CollapsibleSection>

                  {/* Hotspots nested under the landing page — they are pins on the hero image */}
                  <CollapsibleSection
                    title="Hotspots"
                    open={openSections.has("hotspots")}
                    onToggle={() => toggleSection("hotspots")}
                    isEmpty={hotspotItems.length === 0}
                    emptyText="No hotspots placed yet."
                    count={hotspotItems.length}
                  >
                    {hotspotItems.map((hotspot) => {
                      const isExpanded = expandedIds.has(hotspot.id);
                      const tabSections = getTabSections(hotspot.blocks);
                      const hasExpandable = tabSections.length > 0 || hotspot.blocks.length > 0;
                      const expandId = `hotspot-expand-${hotspot.id}`;
                      return (
                        <li key={hotspot.id} className="space-y-1">
                          <div className="flex items-stretch gap-1">
                            <div className="flex-1 min-w-0">
                              <SidebarPageButton
                                onOpenPage={onOpenPage}
                                isSelected={hotspot.id === selectedPageId}
                                page={hotspot}
                              />
                            </div>
                            {hasExpandable ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(hotspot.id)}
                                aria-expanded={isExpanded}
                                aria-controls={expandId}
                                aria-label={`${isExpanded ? "Collapse" : "Expand"} contents of ${hotspot.title || "this hotspot"}`}
                                className="flex shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 px-2 text-neutral-400 transition hover:bg-white hover:text-neutral-700"
                              >
                                <ChevronIcon expanded={isExpanded} />
                              </button>
                            ) : null}
                          </div>
                          {isExpanded && hasExpandable ? (
                            <ul id={expandId} role="list" className="space-y-1 border-l-2 border-neutral-100 pl-3 ml-2">
                              {tabSections.map((tab) => (
                                <li key={tab.tabId}>
                                  <SidebarTabItem
                                    label={tab.label}
                                    onOpen={() => onOpenPage(hotspot.id)}
                                  />
                                </li>
                              ))}
                              {hotspot.blocks.length > 0 ? (
                                <>
                                  {tabSections.length > 0 ? (
                                    <li>
                                      <div className="pb-0.5 pt-1 px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Blocks</div>
                                    </li>
                                  ) : null}
                                  {(() => {
                                    const dh = makeBlockDragHandlers(hotspot.id, hotspot.blocks.length);
                                    return (
                                      <>
                                        {hotspot.blocks.map((block, bi) => (
                                          <li key={block.id}>
                                            <SidebarBlockItem
                                              block={block}
                                              index={bi}
                                              pageId={hotspot.id}
                                              onOpen={() => onOpenPage(hotspot.id, block.id)}
                                              dragIndex={dh.dragIndex}
                                              dropIndex={dh.dropIndex}
                                              onDragStart={dh.onDragStart}
                                              onDragOver={dh.onDragOver}
                                              onDrop={dh.onDrop}
                                              onDragEnd={dh.onDragEnd}
                                            />
                                          </li>
                                        ))}
                                        {dh.dragIndex !== null && (
                                          <li
                                            className="relative h-3"
                                            onDragOver={(e) => { e.preventDefault(); dh.onDragOver(hotspot.blocks.length); }}
                                            onDrop={(e) => { e.preventDefault(); dh.onDrop(hotspot.blocks.length); }}
                                          >
                                            {dh.dropIndex === hotspot.blocks.length && dh.dragIndex !== hotspot.blocks.length - 1 && (
                                              <div className="pointer-events-none absolute inset-x-0 top-1 h-0.5 rounded-full bg-blue-500" />
                                            )}
                                          </li>
                                        )}
                                      </>
                                    );
                                  })()}
                                </>
                              ) : null}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Board buttons"
                    open={openSections.has("page-buttons")}
                    onToggle={() => toggleSection("page-buttons")}
                    isEmpty={pageButtons.length === 0}
                    emptyText="No board buttons yet."
                    count={pageButtons.length}
                  >
                    {pageButtons.map((feature) => (
                      <li key={feature.id}>
                        <SidebarFeatureItem
                          feature={feature}
                          isSelected={feature.id === selectedFeatureId}
                          onSelect={() => onSelectFeature(homePage.id, feature.id)}
                        />
                      </li>
                    ))}
                  </CollapsibleSection>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Cards section */}
        <div className="mt-5">
          <CollapsibleSection
            title="Cards"
            open={openSections.has("pages")}
            onToggle={() => toggleSection("pages")}
            isEmpty={navPages.length === 0}
            emptyText="No cards yet — click + New card to add one."
            count={navPages.length}
            action={
              <button
                type="button"
                onClick={onAddPage}
                title="Add a new card"
                className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-semibold text-neutral-500 hover:bg-white hover:text-neutral-700 transition"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                New card
              </button>
            }
          >
            {navPages.map((page) => {
              const isExpanded = expandedIds.has(page.id);
              const tabSections = getTabSections(page.blocks);
              const hasFeatures = page.canvasFeatures.length > 0;
              const hasExpandable = hasFeatures || tabSections.length > 0 || page.blocks.length > 0;
              const expandId = `page-expand-${page.id}`;
              return (
                <li key={page.id} className="space-y-1">
                  <div className="flex items-stretch gap-1">
                    <div className="flex-1 min-w-0">
                      <SidebarPageButton
                        onOpenPage={onOpenPage}
                        isSelected={page.id === selectedPageId}
                        page={page}
                      />
                    </div>
                    {hasExpandable ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(page.id)}
                        aria-expanded={isExpanded}
                        aria-controls={expandId}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} contents of ${page.title || "this card"}`}
                        className="flex shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 px-2 text-neutral-400 transition hover:bg-white hover:text-neutral-700"
                      >
                        <ChevronIcon expanded={isExpanded} />
                      </button>
                    ) : null}
                  </div>

                  {isExpanded && hasExpandable ? (
                    <ul id={expandId} role="list" className="space-y-1 border-l-2 border-neutral-100 pl-3 ml-2">
                      {page.canvasFeatures.map((feature) => (
                        <li key={feature.id}>
                          <SidebarFeatureItem
                            feature={feature}
                            isSelected={feature.id === selectedFeatureId}
                            onSelect={() => onSelectFeature(page.id, feature.id)}
                          />
                        </li>
                      ))}
                      {tabSections.length > 0 ? (
                        <>
                          {hasFeatures ? (
                            <li>
                              <div className="pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 px-0.5">
                                Tabs
                              </div>
                            </li>
                          ) : null}
                          {tabSections.map((tab) => (
                            <li key={tab.tabId}>
                              <SidebarTabItem
                                label={tab.label}
                                onOpen={() => onOpenPage(page.id)}
                              />
                            </li>
                          ))}
                        </>
                      ) : null}
                      {page.blocks.length > 0 ? (
                        <>
                          {(hasFeatures || tabSections.length > 0) ? (
                            <li>
                              <div className="pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 px-0.5">Blocks</div>
                            </li>
                          ) : null}
                          {(() => {
                            const dh = makeBlockDragHandlers(page.id, page.blocks.length);
                            return (
                              <>
                                {page.blocks.map((block, bi) => (
                                  <li key={block.id}>
                                    <SidebarBlockItem
                                      block={block}
                                      index={bi}
                                      pageId={page.id}
                                      onOpen={() => onOpenPage(page.id, block.id)}
                                      dragIndex={dh.dragIndex}
                                      dropIndex={dh.dropIndex}
                                      onDragStart={dh.onDragStart}
                                      onDragOver={dh.onDragOver}
                                      onDrop={dh.onDrop}
                                      onDragEnd={dh.onDragEnd}
                                    />
                                  </li>
                                ))}
                                {dh.dragIndex !== null && (
                                  <li
                                    className="relative h-3"
                                    onDragOver={(e) => { e.preventDefault(); dh.onDragOver(page.blocks.length); }}
                                    onDrop={(e) => { e.preventDefault(); dh.onDrop(page.blocks.length); }}
                                  >
                                    {dh.dropIndex === page.blocks.length && dh.dragIndex !== page.blocks.length - 1 && (
                                      <div className="pointer-events-none absolute inset-x-0 top-1 h-0.5 rounded-full bg-blue-500" />
                                    )}
                                  </li>
                                )}
                              </>
                            );
                          })()}
                        </>
                      ) : null}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </CollapsibleSection>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="shrink-0 border-t border-neutral-100 p-3">
        {/* Game switcher */}
        <button
          type="button"
          onClick={() => onOpenGameSwitcher?.()}
          className="mb-2 flex w-full items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-left hover:bg-white transition"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-xs font-bold text-white">
            {currentGameName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-neutral-800">{currentStudioName} / {currentGameName}</div>
            <div className="text-[10px] text-neutral-400">Switch game</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-neutral-300">
            <path d="M3 4.5L6 1.5L9 4.5M3 7.5L6 10.5L9 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Account row */}
        <button
          type="button"
          onClick={() => onOpenAccount?.()}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-neutral-100 transition"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">
            A
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-neutral-700">Admin User</div>
            <div className="truncate text-[10px] text-neutral-400">admin@studio.com</div>
          </div>
        </button>
      </div>

    </aside>
  );
}
