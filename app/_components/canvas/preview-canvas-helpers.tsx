import { memo, useRef } from "react";
import { CanvasFeature, CanvasFeatureField, PageItem } from "@/app/_lib/authoring-types";
import { getFeatureTypeLabel } from "@/app/_lib/label-utils";
import { CanvasFeatureCard } from "@/app/_components/canvas/canvas-feature-card";
import { CanvasDragBadge } from "@/app/_components/canvas/canvas-drag-badge";
import { LocaleLanguage } from "@/app/_lib/localization";

const LOGO_SIZE_MIN = 24;

function BoardResizeHandle({
  logoSize,
  onResize,
}: {
  logoSize: number;
  onResize: (newSize: number) => void;
}) {
  const startRef = useRef<{ y: number; size: number } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    startRef.current = { y: e.clientY, size: logoSize };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!startRef.current) return;
    const delta = e.clientY - startRef.current.y;
    const newSize = Math.max(LOGO_SIZE_MIN, startRef.current.size + delta);
    onResize(Math.round(newSize));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    startRef.current = null;
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      title="Drag to resize"
      className="absolute bottom-0 right-0 z-30 flex h-3.5 w-3.5 translate-x-1/2 translate-y-1/2 cursor-se-resize items-center justify-center rounded-sm border border-neutral-300 bg-white shadow-sm"
      aria-label="Resize image"
    >
      <svg width="7" height="7" viewBox="0 0 7 7" fill="none" aria-hidden="true">
        <path d="M1 6L6 1M3.5 6L6 3.5" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

export type FeatureDragState = {
  id: string;
  pointerOffsetX: number;
  pointerOffsetY: number;
};

export type ContentDragState = {
  pointerOffsetX: number;
  pointerOffsetY: number;
};

export const SNAP_LINES = [33.333, 50, 66.666];

export const EmptySurfaceGuidance = memo(function EmptySurfaceGuidance({
  featureCount,
  hotspotCount,
  onClose,
}: {
  featureCount: number;
  hotspotCount: number;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 max-w-sm rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600 shadow-sm"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium text-neutral-900">Build the layout</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Close
        </button>
      </div>
      <div className="mt-2 leading-6">
        {featureCount === 0
          ? "Add board elements like images, QR codes, disclaimers, buttons, and dropdowns."
          : "Drag board elements to reposition them directly on the image."}
      </div>
      <div className="mt-2 leading-6">
        {hotspotCount === 0
          ? "Click inside the image to create contextual hotspots."
          : "Drag hotspots inside the image to align them with the right object or area."}
      </div>
    </div>
  );
});

export const SnapGuides = memo(function SnapGuides({ shiftActive }: { shiftActive: boolean }) {
  if (!shiftActive) return null;
  return (
    <>
      {SNAP_LINES.map((line) => (
        <div
          key={`v-${line}`}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-sky-500/80"
          style={{ left: `${line}%` }}
        />
      ))}
      {SNAP_LINES.map((line) => (
        <div
          key={`h-${line}`}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 z-20 h-px bg-sky-500/80"
          style={{ top: `${line}%` }}
        />
      ))}
    </>
  );
});

/** Shared feature placer used in both portrait and landscape layouts */
export const FeaturePlacer = memo(function FeaturePlacer({
  features,
  isLayoutEditMode,
  accentColor,
  fontThemeClass,
  surfaceStyleClass,
  pages,
  activeLanguageCode,
  availableLanguages,
  isPreviewMode,
  dragThresholdRef,
  onCanvasFeaturePointerDown,
  onSelectCanvasFeature,
  onCanvasFeatureChange,
  onLanguageChange,
  onSelectPage,
  onSearch,
}: {
  features: CanvasFeature[];
  isLayoutEditMode: boolean;
  accentColor: string;
  fontThemeClass: string;
  surfaceStyleClass: string;
  pages?: PageItem[];
  activeLanguageCode?: string;
  availableLanguages?: LocaleLanguage[];
  isPreviewMode: boolean;
  dragThresholdRef?: React.RefObject<boolean>;
  onCanvasFeaturePointerDown: (event: React.PointerEvent<HTMLDivElement>, featureId: string) => void;
  onSelectCanvasFeature: (featureId: string) => void;
  onCanvasFeatureChange?: (featureId: string, field: CanvasFeatureField, value: string) => void;
  onLanguageChange?: (languageCode: string) => void;
  onSelectPage: (id: string) => void;
  onSearch?: (query: string) => void;
}) {
  return (
    <>
      {features.map((feature) => (
        <div
          key={feature.id}
          data-a11y-id={feature.id}
          data-a11y-type="feature"
          className="absolute z-20"
          style={{ left: `${feature.x}%`, top: `${feature.y}%`, transform: "translate3d(-50%, -50%, 0)", touchAction: "none" }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (dragThresholdRef?.current) { dragThresholdRef.current = false; return; }
            if (isLayoutEditMode) onSelectCanvasFeature(feature.id);
          }}
        >
          {isLayoutEditMode ? (
            <CanvasDragBadge
              label={getFeatureTypeLabel(feature.type)}
              showMove
              preferBelow={feature.y <= 12}
              onMovePointerDown={(e) => {
                onCanvasFeaturePointerDown(e as unknown as React.PointerEvent<HTMLDivElement>, feature.id);
              }}
            />
          ) : null}
          <div className="relative">
            <div className={isLayoutEditMode ? "pointer-events-none" : ""}>
              <CanvasFeatureCard
                accentColor={accentColor}
                feature={feature}
                pages={pages}
                activeLanguageCode={activeLanguageCode}
                availableLanguages={availableLanguages}
                fontThemeClass={fontThemeClass}
                isInteractive={isPreviewMode}
                onNavigate={onSelectPage}
                onSearch={onSearch}
                onLanguageChange={onLanguageChange}
                surfaceStyleClass={surfaceStyleClass}
              />
            </div>
            {isLayoutEditMode && feature.type === "image" && onCanvasFeatureChange ? (
              <BoardResizeHandle
                logoSize={feature.logoSize ?? 80}
                onResize={(newSize) => onCanvasFeatureChange(feature.id, "logoSize", String(newSize))}
              />
            ) : null}
          </div>
        </div>
      ))}
    </>
  );
});
