import {
  CanvasFeature,
  CanvasFeatureLayoutOverride,
  LayoutMode,
  MobileLayoutMode,
} from "@/app/_lib/authoring-types";

export type ResponsiveBoardGuidance = {
  visibleCount: number;
  warningCount: number;
  hardCap: number | null;
  hasWarning: boolean;
  isAtHardCap: boolean;
};

export type ResolvedCanvasFeature = {
  feature: CanvasFeature;
  sourceFeature: CanvasFeature;
  originLayout: LayoutMode;
  isInherited: boolean;
  override: CanvasFeatureLayoutOverride | null;
};

const LAYOUT_LIMITS: Record<LayoutMode, { warningCount: number; hardCap: number | null }> = {
  desktop: { warningCount: 10, hardCap: null },
  "mobile-landscape": { warningCount: 6, hardCap: 8 },
  "mobile-portrait": { warningCount: 5, hardCap: 7 },
};

export function getFeatureOriginLayout(feature: CanvasFeature): LayoutMode {
  return feature.originLayout ?? "desktop";
}

function getMobileOverride(
  feature: CanvasFeature,
  layoutMode: LayoutMode
): CanvasFeatureLayoutOverride | null {
  if (layoutMode === "desktop") return null;
  return feature.layoutOverrides?.[layoutMode] ?? null;
}

export function resolveCanvasFeatureForLayout(
  feature: CanvasFeature,
  layoutMode: LayoutMode
): ResolvedCanvasFeature | null {
  const originLayout = getFeatureOriginLayout(feature);

  if (originLayout !== "desktop" && originLayout !== layoutMode) {
    return null;
  }

  if (layoutMode === "desktop" && originLayout !== "desktop") {
    return null;
  }

  const override = getMobileOverride(feature, layoutMode);
  if (override?.hidden) {
    return null;
  }

  if (originLayout === "desktop" && layoutMode !== "desktop") {
    return {
      feature: {
        ...feature,
        x: override?.x ?? feature.x,
        y: override?.y ?? feature.y,
        portraitZone:
          layoutMode === "mobile-portrait"
            ? override?.portraitZone ?? feature.portraitZone
            : undefined,
      },
      sourceFeature: feature,
      originLayout,
      isInherited: true,
      override,
    };
  }

  return {
    feature,
    sourceFeature: feature,
    originLayout,
    isInherited: false,
    override,
  };
}

export function getResolvedCanvasFeatures(
  features: CanvasFeature[],
  layoutMode: LayoutMode
): ResolvedCanvasFeature[] {
  return features
    .map((feature) => resolveCanvasFeatureForLayout(feature, layoutMode))
    .filter((feature): feature is ResolvedCanvasFeature => feature !== null);
}

export function updateFeaturePositionForLayout(
  feature: CanvasFeature,
  layoutMode: LayoutMode,
  nextX: number,
  nextY: number,
  portraitZone?: "content"
): CanvasFeature {
  const originLayout = getFeatureOriginLayout(feature);

  if (layoutMode === "desktop" || originLayout === layoutMode) {
    return {
      ...feature,
      x: nextX,
      y: nextY,
      portraitZone:
        layoutMode === "mobile-portrait" ? portraitZone ?? feature.portraitZone : feature.portraitZone,
    };
  }

  if (layoutMode === "mobile-landscape" || layoutMode === "mobile-portrait") {
    return {
      ...feature,
      layoutOverrides: {
        ...(feature.layoutOverrides ?? {}),
        [layoutMode]: {
          ...(feature.layoutOverrides?.[layoutMode] ?? {}),
          x: nextX,
          y: nextY,
          ...(layoutMode === "mobile-portrait" ? { portraitZone: portraitZone ?? feature.portraitZone } : {}),
        },
      },
    };
  }

  return feature;
}

export function setFeatureVisibilityForLayout(
  feature: CanvasFeature,
  layoutMode: MobileLayoutMode,
  visible: boolean
): CanvasFeature {
  const originLayout = getFeatureOriginLayout(feature);
  if (originLayout !== "desktop") {
    return feature;
  }

  return {
    ...feature,
    layoutOverrides: {
      ...(feature.layoutOverrides ?? {}),
      [layoutMode]: {
        ...(feature.layoutOverrides?.[layoutMode] ?? {}),
        hidden: !visible,
      },
    },
  };
}

export function createResponsiveCanvasFeature(
  feature: CanvasFeature,
  layoutMode: LayoutMode
): CanvasFeature {
  if (layoutMode === "desktop") {
    return feature;
  }

  return {
    ...feature,
    originLayout: layoutMode,
    layoutOverrides: undefined,
  };
}

export function getResponsiveBoardGuidance(
  features: CanvasFeature[],
  layoutMode: LayoutMode
): ResponsiveBoardGuidance {
  const limits = LAYOUT_LIMITS[layoutMode];
  const visibleCount = getResolvedCanvasFeatures(features, layoutMode).length;

  return {
    visibleCount,
    warningCount: limits.warningCount,
    hardCap: limits.hardCap,
    hasWarning: visibleCount >= limits.warningCount,
    isAtHardCap: limits.hardCap !== null && visibleCount >= limits.hardCap,
  };
}
