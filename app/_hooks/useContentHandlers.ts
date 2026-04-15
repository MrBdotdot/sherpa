"use client";

import { ChangeEvent } from "react";
import { createBlock, createSocialLink } from "@/app/_lib/authoring-utils";
import { ContentBlock, ContentBlockType, ImageFit, PageItem } from "@/app/_lib/authoring-types";
import { uploadImage } from "@/app/_lib/supabase-storage";

interface UseContentHandlersProps {
  pushPagesHistory: () => void;
  updateSelectedPage: (updater: (page: PageItem) => PageItem) => void;
  userId: string;
  gameId: string;
}

export function useContentHandlers({
  pushPagesHistory,
  updateSelectedPage,
  userId,
  gameId,
}: UseContentHandlersProps) {
  function createLinkedStepRail(): ContentBlock[] {
    const s1 = createBlock("section", "Step 1");
    const s2 = createBlock("section", "Step 2");
    const s3 = createBlock("section", "Step 3");
    const srBlock = createBlock("step-rail");
    const srData = JSON.parse(srBlock.value) as {
      orientation: string; iconShape: string; showPing: boolean;
      steps: { id: string; label: string; color: string; iconImageUrl: string; sectionBlockId: string }[];
    };
    srData.steps[0].sectionBlockId = s1.id;
    srData.steps[1].sectionBlockId = s2.id;
    srData.steps[2].sectionBlockId = s3.id;
    return [{ ...srBlock, value: JSON.stringify(srData) }, s1, s2, s3];
  }

  const handleAddBlock = (type: ContentBlockType) => {
    pushPagesHistory();
    if (type === "step-rail") {
      const blocks = createLinkedStepRail();
      updateSelectedPage((page) => ({ ...page, blocks: [...page.blocks, ...blocks] }));
      return;
    }
    updateSelectedPage((page) => ({
      ...page,
      blocks: [...page.blocks, createBlock(type)],
    }));
  };

  const handleInsertBlock = (type: ContentBlockType, atIndex: number) => {
    pushPagesHistory();
    if (type === "step-rail") {
      const newBlocks = createLinkedStepRail();
      updateSelectedPage((page) => {
        const blocks = [...page.blocks];
        blocks.splice(atIndex, 0, ...newBlocks);
        return { ...page, blocks };
      });
      return;
    }
    updateSelectedPage((page) => {
      const blocks = [...page.blocks];
      blocks.splice(atIndex, 0, createBlock(type));
      return { ...page, blocks };
    });
  };

  const handleBlockChange = (blockId: string, value: string) => {
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((block) =>
        block.id === blockId ? { ...block, value } : block
      ),
    }));
  };

  const handleBlockVariantChange = (blockId: string, variant: ContentBlock["variant"]) => {
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((block) =>
        block.id === blockId ? { ...block, variant } : block
      ),
    }));
  };

  const handleMoveBlockUp = (blockId: string) => {
    pushPagesHistory();
    updateSelectedPage((page) => {
      const index = page.blocks.findIndex((b) => b.id === blockId);
      if (index <= 0) return page;
      const blocks = [...page.blocks];
      [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
      return { ...page, blocks };
    });
  };

  const handleMoveBlockDown = (blockId: string) => {
    pushPagesHistory();
    updateSelectedPage((page) => {
      const index = page.blocks.findIndex((b) => b.id === blockId);
      if (index >= page.blocks.length - 1) return page;
      const blocks = [...page.blocks];
      [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
      return { ...page, blocks };
    });
  };

  const handleReorderBlocks = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    pushPagesHistory();
    updateSelectedPage((page) => {
      const blocks = [...page.blocks];
      const [item] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, item);
      return { ...page, blocks };
    });
  };

  const handleReplaceBlocks = (newBlocks: ContentBlock[]) => {
    pushPagesHistory();
    updateSelectedPage((page) => ({ ...page, blocks: newBlocks }));
  };

  const handleBlockImageUpload = async (
    blockId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    handleBlockChange(blockId, localUrl);
    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      handleBlockChange(blockId, remoteUrl);
    } catch {
      // local blob URL stays in place — acceptable fallback
    }
  };

  const handleBlockImageFitChange = (blockId: string, imageFit: ImageFit) => {
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((block) =>
        block.id === blockId ? { ...block, imageFit } : block
      ),
    }));
  };

  const handleBlockImagePositionChange = (blockId: string, x: number, y: number) => {
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((b) =>
        b.id === blockId ? { ...b, imagePosition: { x, y } } : b
      ),
    }));
  };

  const handleRemoveBlock = (blockId: string) => {
    pushPagesHistory();
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.filter((block) => block.id !== blockId),
    }));
  };

  const handleAddSocialLink = () => {
    pushPagesHistory();
    updateSelectedPage((page) => ({
      ...page,
      socialLinks: [...page.socialLinks, createSocialLink()],
    }));
  };

  const handleSocialLinkChange = (
    socialId: string,
    field: "label" | "url" | "linkMode" | "linkPageId",
    value: string
  ) => {
    updateSelectedPage((page) => ({
      ...page,
      socialLinks: page.socialLinks.map((item) =>
        item.id === socialId ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleRemoveSocialLink = (socialId: string) => {
    pushPagesHistory();
    updateSelectedPage((page) => ({
      ...page,
      socialLinks: page.socialLinks.filter((item) => item.id !== socialId),
    }));
  };

  const handleContentTintChange = (color: string, opacity: number) => {
    updateSelectedPage((page) => ({ ...page, contentTintColor: color, contentTintOpacity: opacity }));
  };

  const handleBlockWidthChange = (blockId: string, width: ContentBlock["blockWidth"]) => {
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((b) => b.id === blockId ? { ...b, blockWidth: width } : b),
    }));
  };

  const handleBlockTextAlignChange = (blockId: string, align: ContentBlock["textAlign"]) => {
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((b) => b.id === blockId ? { ...b, textAlign: align } : b),
    }));
  };

  const handleBlockVerticalAlignChange = (blockId: string, align: ContentBlock["verticalAlign"]) => {
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((b) => b.id === blockId ? { ...b, verticalAlign: align } : b),
    }));
  };

  const handleBlockFormatChange = (blockId: string, format: ContentBlock["blockFormat"]) => {
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((b) => b.id === blockId ? { ...b, blockFormat: format } : b),
    }));
  };

  const handleBlockPropsChange = (blockId: string, patch: Partial<ContentBlock>) => {
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((b) => b.id === blockId ? { ...b, ...patch } : b),
    }));
  };

  const handleHotspotModeChange = (mode: "card" | "section") => {
    pushPagesHistory();
    updateSelectedPage((page) => {
      if (mode === "section") {
        return {
          ...page,
          hotspotMode: "section" as const,
          blocks: [],
          summary: "",
          hotspotTargetPageId: undefined,
          hotspotTargetSectionId: undefined,
        };
      }
      return {
        ...page,
        hotspotMode: "card" as const,
        hotspotTargetPageId: undefined,
        hotspotTargetSectionId: undefined,
      };
    });
  };

  const handleHotspotTargetChange = (targetPageId: string, targetSectionId: string) => {
    updateSelectedPage((page) => ({
      ...page,
      hotspotTargetPageId: targetPageId || undefined,
      hotspotTargetSectionId: targetSectionId || undefined,
    }));
  };

  return {
    handleAddBlock,
    handleInsertBlock,
    handleBlockChange,
    handleBlockVariantChange,
    handleMoveBlockUp,
    handleMoveBlockDown,
    handleReorderBlocks,
    handleReplaceBlocks,
    handleBlockImageUpload,
    handleBlockImageFitChange,
    handleRemoveBlock,
    handleAddSocialLink,
    handleSocialLinkChange,
    handleRemoveSocialLink,
    handleContentTintChange,
    handleBlockWidthChange,
    handleBlockTextAlignChange,
    handleBlockVerticalAlignChange,
    handleBlockFormatChange,
    handleBlockImagePositionChange,
    handleBlockPropsChange,
    handleHotspotModeChange,
    handleHotspotTargetChange,
  };
}
