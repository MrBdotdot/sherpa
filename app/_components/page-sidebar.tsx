"use client";

import { useState } from "react";
import { ChangelogModal } from "@/app/_components/changelog-modal";
import {
  APP_VERSION,
  getFeatureTypeLabel,
  getPublishStatusClasses,
} from "@/app/_lib/authoring-utils";
import { CanvasFeature, PageItem, PublishStatus } from "@/app/_lib/authoring-types";

type PageSidebarProps = {
  onOpenPage: (id: string) => void;
  onPublishStatusChange: (pageId: string, status: PublishStatus) => void;
  onSelectFeature: (pageId: string, featureId: string) => void;
  pages: PageItem[];
  selectedFeatureId: string | null;
  selectedPageId: string;
};

const PUBLISH_OPTIONS: { label: string; value: PublishStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
];

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
  onPublishStatusChange,
  page,
}: {
  isSelected: boolean;
  onOpenPage: (id: string) => void;
  onPublishStatusChange: (pageId: string, status: PublishStatus) => void;
  page: PageItem;
}) {
  return (
    <div
      className={`flex w-full items-center gap-1 rounded-2xl border transition ${
        isSelected
          ? "border-black bg-black text-white shadow-lg shadow-black/10 ring-2 ring-black/15"
          : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenPage(page.id)}
        aria-current={isSelected ? "page" : undefined}
        className="min-w-0 flex-1 px-3 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {page.title || "Untitled page"}
          </div>
          {page.kind === "hotspot" && page.x !== null && page.y !== null ? (
            <div
              className={`mt-0.5 text-xs ${
                isSelected ? "text-neutral-300" : "text-neutral-400"
              }`}
            >
              {Math.round(page.x)}%, {Math.round(page.y)}%
            </div>
          ) : null}
        </div>
      </button>

      <div className="shrink-0 pr-2">
        <select
          value={page.publishStatus}
          onChange={(e) =>
            onPublishStatusChange(page.id, e.target.value as PublishStatus)
          }
          onClick={(e) => e.stopPropagation()}
          aria-label={`Publish status for ${page.title || "this page"}`}
          className={`cursor-pointer rounded-xl border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide outline-none transition ${
            isSelected
              ? "border-white/20 bg-white/15 text-white"
              : getPublishStatusClasses(page.publishStatus)
          }`}
        >
          {PUBLISH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-neutral-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
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

function CollapsibleSection({
  children,
  emptyText,
  isEmpty,
  title,
  open,
  onToggle,
  count,
}: {
  children?: React.ReactNode;
  emptyText?: string;
  isEmpty?: boolean;
  title: string;
  open: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="mb-1.5 flex w-full items-center justify-between gap-2 rounded-lg px-0.5 py-0.5 text-left hover:opacity-70"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            {title}
          </span>
          {count !== undefined && count > 0 ? (
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-400 leading-none">
              {count}
            </span>
          ) : null}
        </div>
        <ChevronIcon expanded={open} />
      </button>
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
  onOpenPage,
  onPublishStatusChange,
  onSelectFeature,
  pages,
  selectedFeatureId,
  selectedPageId,
}: PageSidebarProps) {
  const homePages = pages.filter((p) => p.kind === "home");
  const navPages = pages.filter((p) => p.kind === "page");
  const hotspotItems = pages.filter((p) => p.kind === "hotspot" && p.x !== null);

  // Which container rows are expanded to show their features
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Which collapsible nav sections are open
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(["elements", "page-buttons", "hotspots", "containers"])
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

  const sharedItemProps = { onOpenPage, onPublishStatusChange };

  return (
    <aside className="h-full border-r border-neutral-200 bg-white">
      <div className="h-full overflow-y-auto p-5">
        <div className="mb-6 flex items-center gap-2.5">
          <img src="/sherpa-icon.svg" alt="Sherpa" className="h-11 w-11 rounded-lg" draggable={false} />
          <div className="flex items-baseline gap-2">
            <div className="text-lg font-semibold text-neutral-900">Sherpa</div>
            <button
              type="button"
              onClick={() => setChangelogOpen(true)}
              className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50"
            >
              {APP_VERSION}
            </button>
          </div>
        </div>

        {/* Landing page */}
        {homePages.length > 0 ? (
          <div className="space-y-4">
            {homePages.map((homePage) => {
              const elements = homePage.canvasFeatures.filter((f) => f.type !== "page-button");
              const pageButtons = homePage.canvasFeatures.filter((f) => f.type === "page-button");

              return (
                <div key={homePage.id} className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400 px-0.5">
                    Landing page
                  </div>

                  <SidebarPageButton
                    {...sharedItemProps}
                    isSelected={homePage.id === selectedPageId}
                    page={homePage}
                  />

                  <CollapsibleSection
                    title="Elements"
                    open={openSections.has("elements")}
                    onToggle={() => toggleSection("elements")}
                    isEmpty={elements.length === 0}
                    emptyText="No elements added yet."
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

                  <CollapsibleSection
                    title="Page buttons"
                    open={openSections.has("page-buttons")}
                    onToggle={() => toggleSection("page-buttons")}
                    isEmpty={pageButtons.length === 0}
                    emptyText="No page buttons yet."
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

                  <CollapsibleSection
                    title="Hotspots"
                    open={openSections.has("hotspots")}
                    onToggle={() => toggleSection("hotspots")}
                    isEmpty={hotspotItems.length === 0}
                    emptyText="No hotspots placed yet."
                    count={hotspotItems.length}
                  >
                    {hotspotItems.map((hotspot) => (
                      <li key={hotspot.id}>
                        <SidebarPageButton
                          {...sharedItemProps}
                          isSelected={hotspot.id === selectedPageId}
                          page={hotspot}
                        />
                      </li>
                    ))}
                  </CollapsibleSection>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Containers */}
        <div className="mt-4">
          <CollapsibleSection
            title="Containers"
            open={openSections.has("containers")}
            onToggle={() => toggleSection("containers")}
            isEmpty={navPages.length === 0}
            emptyText="No containers yet. Use + New container to add one."
            count={navPages.length}
          >
            {navPages.map((page) => {
              const isExpanded = expandedIds.has(page.id);
              const hasFeatures = page.canvasFeatures.length > 0;
              const featuresId = `container-features-${page.id}`;
              return (
                <li key={page.id} className="space-y-1">
                  <div className="flex items-stretch gap-1">
                    <div className="flex-1 min-w-0">
                      <SidebarPageButton
                        {...sharedItemProps}
                        isSelected={page.id === selectedPageId}
                        page={page}
                      />
                    </div>
                    {hasFeatures ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(page.id)}
                        aria-expanded={isExpanded}
                        aria-controls={featuresId}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} features for ${page.title || "this container"}`}
                        className="flex shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 px-2 text-neutral-400 transition hover:bg-white hover:text-neutral-700"
                      >
                        <ChevronIcon expanded={isExpanded} />
                      </button>
                    ) : null}
                  </div>

                  {isExpanded && hasFeatures ? (
                    <ul id={featuresId} role="list" className="space-y-1 border-l-2 border-neutral-100 pl-3 ml-2">
                      {page.canvasFeatures.map((feature) => (
                        <li key={feature.id}>
                          <SidebarFeatureItem
                            feature={feature}
                            isSelected={feature.id === selectedFeatureId}
                            onSelect={() => onSelectFeature(page.id, feature.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </CollapsibleSection>
        </div>
      </div>

      <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </aside>
  );
}
