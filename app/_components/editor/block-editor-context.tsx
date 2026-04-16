"use client";

import { createContext, useContext, type ChangeEvent } from "react";
import type { AnchorTarget, ContentBlock, ImageFit, PageItem } from "@/app/_lib/authoring-types";
import type { BlockFormat, VerticalAlign } from "@/app/_lib/block-type-config";

export type BlockEditorContextValue = {
  onBlockChange: (blockId: string, value: string) => void;
  onBlockFitChange: (blockId: string, fit: ImageFit) => void;
  onBlockImagePositionChange: (blockId: string, x: number, y: number) => void;
  onBlockPropsChange: (blockId: string, patch: Partial<ContentBlock>) => void;
  onBlockFormatChange: (blockId: string, format: BlockFormat) => void;
  onBlockImageUpload: (blockId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onBlockVariantChange: (blockId: string, variant: ContentBlock["variant"]) => void;
  onBlockVerticalAlignChange: (blockId: string, align: VerticalAlign) => void;
  onBlockWidthChange: (blockId: string, width: "full" | "half") => void;
  onBlockTextAlignChange: (blockId: string, align: "left" | "center" | "right") => void;
  onMoveBlockDown: (blockId: string) => void;
  onMoveBlockUp: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onReplaceBlocks?: (newBlocks: ContentBlock[]) => void;
  pages: PageItem[];
  selectedPageId?: string;
  anchorTargets?: AnchorTarget[];
};

export const BlockEditorContext = createContext<BlockEditorContextValue | null>(null);

export function useBlockEditorContext(): BlockEditorContextValue {
  const ctx = useContext(BlockEditorContext);
  if (!ctx) throw new Error("useBlockEditorContext must be used inside BlockEditorContext.Provider");
  return ctx;
}
