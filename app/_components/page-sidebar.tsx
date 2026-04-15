"use client";

import { useEffect, useRef, useState } from "react";
import { APP_VERSION } from "@/app/_lib/authoring-utils";
import { getGameIconFallback, getGameIconUrl } from "@/app/_lib/game-icon";
import { getFeatureTypeLabel } from "@/app/_lib/label-utils";
import { CanvasFeature, ContentBlock, ExperienceStatus, PageItem } from "@/app/_lib/authoring-types";
import { UserMetadata, getUserProfile } from "@/app/_lib/user-profile";
import { getBlockPreview, getTabSections } from "@/app/_lib/sidebar-icon-utils";
import { SidebarItemIcon } from "@/app/_components/sidebar-item-icon";
import { HintBubble } from "@/app/_components/hint-bubble";

type PageSidebarProps = {
  onAddPage: () => void;
  onOpenPage: (id: string, blockId?: string) => void;
  onReorderBlocks: (pageId: string, fromIndex: number, toIndex: number) => void;
  onSelectFeature: (pageId: string, featureId: string) => void;
  pages: PageItem[];
  selectedFeatureId: string | null;
  selectedPageId: string;
  currentGameName?: string;
  currentGameIcon?: string;
  currentGameId?: string;
  experienceStatus?: ExperienceStatus;
  userEmail?: string;
  userMetadata?: UserMetadata;
  onOpenChangelog?: () => void;
  onOpenAccount?: () => void;
  onOpenGameSwitcher?: () => void;
  darkMode?: boolean;
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

function HotspotPinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="5.5" r="2.25" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.5 11.5C6.5 11.5 2 7.5 2 5.5a4.5 4.5 0 019 0c0 2-4.5 6-4.5 6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function CardPageIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="10" height="10" rx="1.75" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 4.5h5M4 6.5h3.5M4 8.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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
      data-selected={isSelected ? "true" : undefined}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
        isSelected ? "bg-[#3B82F6]/10" : "hover:bg-neutral-50"
      }`}
    >
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
        isSelected
          ? "border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6]"
          : "border-neutral-200 bg-white text-neutral-400"
      }`}>
        {page.kind === "hotspot" ? <HotspotPinIcon /> : <CardPageIcon />}
      </div>
      <span className={`truncate text-xs font-medium ${isSelected ? "text-[#3B82F6]" : "text-neutral-700"}`}>
        {page.title || (page.kind === "hotspot" ? "Untitled hotspot" : "Untitled card")}
      </span>
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
      data-selected={isSelected ? "true" : undefined}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
        isSelected
          ? "bg-[#3B82F6]/10"
          : "hover:bg-neutral-50"
      }`}
    >
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
        isSelected ? "border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6]" : "border-neutral-200 bg-white text-neutral-400"
      }`}>
        <SidebarItemIcon type={feature.type} />
      </div>
      <span className={`truncate text-xs font-medium ${isSelected ? "text-[#3B82F6]" : "text-neutral-700"}`}>
        {feature.label || getFeatureTypeLabel(feature.type)}
      </span>
    </button>
  );
}

function SidebarBlockItem({
  block,
  index,
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
        <div className="pointer-events-none absolute -top-1.5 inset-x-0 z-20 h-0.5 rounded-full bg-[#3B82F6]" />
      )}
      <div
        draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(index); }}
        onDragEnd={onDragEnd}
        className="group flex w-full cursor-grab items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-neutral-50 active:cursor-grabbing"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-400">
          <SidebarItemIcon type={block.type} />
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-2 text-left transition"
        >
          <span className="truncate text-xs font-medium text-neutral-700 group-hover:text-neutral-900">
            {getBlockPreview(block)}
          </span>
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
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-neutral-50"
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-400">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <rect x="1" y="5" width="11" height="7.5" rx="1.25" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="1" y="1.5" width="4" height="3.75" rx="1" fill="currentColor"/>
          <rect x="6" y="1.5" width="3.5" height="3.75" rx="1" stroke="currentColor" strokeWidth="1.1"/>
        </svg>
      </div>
      <span className="truncate text-xs font-medium text-neutral-700">{label}</span>
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
          <ul className="space-y-1.5">{children}</ul>
        )
      ) : null}
    </div>
  );
}

export function PageSidebar({
  onAddPage,
  onOpenPage,
  onReorderBlocks,
  onSelectFeature,
  pages,
  selectedFeatureId,
  selectedPageId,
  currentGameName = "Ugly Pickle",
  currentGameIcon = "",
  currentGameId,
  experienceStatus = "draft",
  userEmail = "",
  userMetadata = {},
  onOpenChangelog,
  onOpenAccount,
  onOpenGameSwitcher,
  darkMode = false,
}: PageSidebarProps) {
  const dk = darkMode;
  const isLive = experienceStatus === "published";
  const { displayName, initial, avatarUrl } = getUserProfile(userEmail, userMetadata);
  const gameIconUrl = getGameIconUrl(currentGameIcon);
  const gameIconFallback = getGameIconFallback(currentGameName);
  const [blockDrag, setBlockDrag] = useState<{ pageId: string; dragIndex: number; dropIndex: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedPageId, selectedFeatureId]);

  function makeBlockDragHandlers(pageId: string) {
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
    () => new Set(["elements", "anchor-pins", "page-buttons", "hotspots", "pages"])
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
    <aside className={`flex h-full flex-col ${dk ? "bg-neutral-900 text-neutral-100" : "border-r border-neutral-200/60 bg-white/60"}`}>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mb-6 flex items-center gap-2.5">
          <img src="/sherpa-icon.svg" alt="Sherpa" className="h-11 w-11 rounded-lg" draggable={false} />
          <div className="flex items-baseline gap-2">
            <div className={`text-lg font-semibold ${dk ? "text-neutral-100" : "text-neutral-900"}`}>Sherpa</div>
            <button
              type="button"
              onClick={() => onOpenChangelog?.()}
              className={`rounded-full border px-2 py-0.5 text-xs ${dk ? "border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:bg-neutral-800" : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50"}`}
            >
              {APP_VERSION}
            </button>
          </div>
        </div>

        {/* Board section */}
        {homePages.length > 0 ? (
          <div className="space-y-4">
            {homePages.map((homePage) => {
              const elements = homePage.canvasFeatures.filter((f) => f.type !== "page-button" && f.type !== "anchor-pin");
              const anchorPins = homePage.canvasFeatures.filter((f) => f.type === "anchor-pin");
              const pageButtons = homePage.canvasFeatures.filter((f) => f.type === "page-button");

              return (
                <div key={homePage.id} className={`rounded-2xl border p-3 space-y-3 ${dk ? "border-neutral-700 bg-neutral-800" : "border-neutral-100 bg-neutral-50"}`}>
                  <CollapsibleSection
                    title="Board elements"
                    open={openSections.has("elements")}
                    onToggle={() => toggleSection("elements")}
                    isEmpty={elements.length === 0}
                    emptyText="No elements yet. Add one from the Hotspots tab."
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
                    emptyText="No hotspots yet. Click the board to place one."
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
                                className="flex shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-neutral-400 transition hover:bg-white hover:text-neutral-700"
                              >
                                <ChevronIcon expanded={isExpanded} />
                              </button>
                            ) : null}
                          </div>
                          {isExpanded && hasExpandable ? (
                            <ul id={expandId} className="space-y-1 border-l-2 border-neutral-100 pl-3 ml-2">
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
                                    const dh = makeBlockDragHandlers(hotspot.id);
                                    return (
                                      <>
                                        {hotspot.blocks.map((block, bi) => (
                                          <li key={block.id}>
                                            <SidebarBlockItem
                                              block={block}
                                              index={bi}
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
                    title="Anchor Pins"
                    open={openSections.has("anchor-pins")}
                    onToggle={() => toggleSection("anchor-pins")}
                    isEmpty={anchorPins.length === 0}
                    emptyText="No anchor pins yet. Add one from the Board tab."
                    count={anchorPins.length}
                  >
                    {anchorPins.map((feature) => (
                      <li key={feature.id}>
                        <SidebarFeatureItem
                          feature={feature}
                          isSelected={feature.id === selectedFeatureId}
                          onSelect={() => onSelectFeature(homePage.id, feature.id)}
                        />
                      </li>
                    ))}
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Board buttons"
                    open={openSections.has("page-buttons")}
                    onToggle={() => toggleSection("page-buttons")}
                    isEmpty={pageButtons.length === 0}
                    emptyText="No card buttons yet."
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
            emptyText="No cards yet. Click + New card to add one."
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
                        className="flex shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-neutral-400 transition hover:bg-white hover:text-neutral-700"
                      >
                        <ChevronIcon expanded={isExpanded} />
                      </button>
                    ) : null}
                  </div>

                  {isExpanded && hasExpandable ? (
                    <ul id={expandId} className="space-y-1 border-l-2 border-neutral-100 pl-3 ml-2">
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
                            const dh = makeBlockDragHandlers(page.id);
                            return (
                              <>
                                {page.blocks.map((block, bi) => (
                                  <li key={block.id}>
                                    <SidebarBlockItem
                                      block={block}
                                      index={bi}
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
          {navPages.length >= 1 ? (
            <div className="mt-2">
              <HintBubble id="first-card" className="text-[11px]">
                Click a card to open it and add content
              </HintBubble>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom nav */}
      <div className={`shrink-0 border-t p-3 ${dk ? "border-neutral-700" : "border-neutral-100"}`}>
        {/* Game switcher */}
        <button
          type="button"
          onClick={() => onOpenGameSwitcher?.()}
          className={`mb-2 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${dk ? "border-neutral-700 bg-neutral-800 hover:bg-neutral-700" : "border-neutral-200 bg-neutral-50 hover:bg-white"}`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1e3a8a] text-xs font-bold text-white">
            {gameIconUrl ? (
              <img
                src={gameIconUrl}
                alt={`${currentGameName} icon`}
                className="h-full w-full object-cover"
              />
            ) : (
              gameIconFallback
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`truncate text-xs font-semibold ${dk ? "text-neutral-200" : "text-neutral-800"}`}>
              {currentGameName}
            </div>
            <div className="text-[10px] text-neutral-400">Switch game</div>
          </div>
          {isLive ? (
            <span
              className={`shrink-0 self-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                dk
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              Live
            </span>
          ) : null}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 ${dk ? "text-neutral-500" : "text-neutral-300"}`}>
            <path d="M3 4.5L6 1.5L9 4.5M3 7.5L6 10.5L9 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Feedback row */}
        <a
          href={`mailto:will@wbeestudio.com?subject=${encodeURIComponent("Sherpa feedback")}&body=${encodeURIComponent("What happened:\n\nWhat I expected:\n\nMy email: " + (userEmail || ""))}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${dk ? "hover:bg-neutral-800" : "hover:bg-neutral-100"}`}
        >
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${dk ? "bg-neutral-800 text-neutral-400" : "bg-neutral-100 text-neutral-500"}`}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M1 2.5h11v7a1 1 0 01-1 1H2a1 1 0 01-1-1v-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M1 2.5l5.5 4.5L12 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className={`truncate text-xs font-medium ${dk ? "text-neutral-200" : "text-neutral-700"}`}>Send feedback</div>
            <div className="truncate text-[10px] text-neutral-400">Report a bug or share ideas</div>
          </div>
        </a>

        {/* Account row */}
        <button
          type="button"
          onClick={() => onOpenAccount?.()}
          className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${dk ? "hover:bg-neutral-800" : "hover:bg-neutral-100"}`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName || "Profile photo"}
              className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${dk ? "bg-neutral-700 text-neutral-300" : "bg-neutral-200 text-neutral-600"}`}>
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <div className={`truncate text-xs font-medium ${dk ? "text-neutral-200" : "text-neutral-700"}`}>{displayName}</div>
            <div className="truncate text-[10px] text-neutral-400">
              {userEmail || "Signed-in account"}
            </div>
          </div>
        </button>
      </div>

    </aside>
  );
}
