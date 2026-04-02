import { memo } from "react";
import { CanvasFeature, PageItem } from "@/app/_lib/authoring-types";
import { getFeatureTypeLabel } from "@/app/_lib/label-utils";
import { CanvasFeatureCard } from "@/app/_components/canvas/canvas-feature-card";

export type FeatureDragState = {
  id: string;
  pointerOffsetX: number;
  pointerOffsetY: number;
};

export type ContentDragState = {
  pointerOffsetX: number;
  pointerOffsetY: number;
};

const SNAP_LINES = [33.333, 50, 66.666];

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
      className="absolute left-4 top-4 z-20 max-w-sm rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600 shadow-sm"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium text-neutral-900">Build the layout</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Close
        </button>
      </div>
      <div className="mt-2 leading-6">
        {featureCount === 0
          ? "Add canvas features like images, QR codes, disclaimers, buttons, and dropdowns."
          : "Turn on layout edit mode to move surface items directly on top of the image."}
      </div>
      <div className="mt-2 leading-6">
        {hotspotCount === 0
          ? "Click inside the image to create contextual hotspots."
          : "Drag hotspots inside the image to align them with the right object or area."}
      </div>
    </div>
  );
});

export const SnapGuides = memo(function SnapGuides({
  featureDragState,
  features,
}: {
  featureDragState: FeatureDragState | null;
  features: CanvasFeature[];
}) {
  const activeFeature = features.find((f) => f.id === featureDragState?.id);
  if (!featureDragState || !activeFeature) return null;

  const showVertical = SNAP_LINES.filter((line) => Math.abs(line - activeFeature.x) <= 0.4);
  const showHorizontal = SNAP_LINES.filter((line) => Math.abs(line - activeFeature.y) <= 0.4);

  return (
    <>
      {showVertical.map((line) => (
        <div key={`v-${line}`} aria-hidden="true" className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-sky-500/80" style={{ left: `${line}%` }} />
      ))}
      {showHorizontal.map((line) => (
        <div key={`h-${line}`} aria-hidden="true" className="pointer-events-none absolute left-0 right-0 z-20 h-px bg-sky-500/80" style={{ top: `${line}%` }} />
      ))}
    </>
  );
});

/** Shared feature placer used in both portrait and landscape layouts */
export const FeaturePlacer = memo(function FeaturePlacer({
  features,
  isLayoutEditMode,
  accentColor,
  surfaceStyleClass,
  pages,
  onCanvasFeaturePointerDown,
  onSelectPage,
}: {
  features: CanvasFeature[];
  isLayoutEditMode: boolean;
  accentColor: string;
  surfaceStyleClass: string;
  pages?: PageItem[];
  onCanvasFeaturePointerDown: (event: React.PointerEvent<HTMLDivElement>, featureId: string) => void;
  onSelectPage: (id: string) => void;
}) {
  return (
    <>
      {features.map((feature) => (
        <div
          key={feature.id}
          data-a11y-id={feature.id}
          data-a11y-type="feature"
          className={`absolute z-20 ${isLayoutEditMode ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ left: `${feature.x}%`, top: `${feature.y}%`, transform: "translate3d(-50%, -50%, 0)", touchAction: "none" }}
          onPointerDown={(event) => onCanvasFeaturePointerDown(event, feature.id)}
          onClick={(event) => {
            event.stopPropagation();
            if (!isLayoutEditMode && feature.linkUrl) {
              if (feature.type === "page-button") onSelectPage(feature.linkUrl);
              else if (feature.type === "button" && feature.buttonLinkMode === "page") onSelectPage(feature.linkUrl);
            }
          }}
        >
          {isLayoutEditMode ? (
            <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap flex items-center gap-2 rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              <span>{getFeatureTypeLabel(feature.type)}</span>
              <span className="opacity-60">Move</span>
            </div>
          ) : null}
          <CanvasFeatureCard
            accentColor={accentColor}
            feature={feature}
            pages={pages}
            onNavigate={onSelectPage}
            surfaceStyleClass={surfaceStyleClass}
          />
        </div>
      ))}
    </>
  );
});
