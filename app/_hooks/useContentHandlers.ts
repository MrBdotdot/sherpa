"use client";

import { ChangeEvent } from "react";
import { createBlock, createSocialLink } from "@/app/_lib/authoring-utils";
import { ContentBlock, ContentBlockType, ImageFit, PageItem } from "@/app/_lib/authoring-types";

interface UseContentHandlersProps {
  pushPagesHistory: () => void;
  updateSelectedPage: (updater: (page: PageItem) => PageItem) => void;
}

export function useContentHandlers({
  pushPagesHistory,
  updateSelectedPage,
}: UseContentHandlersProps) {
  const handleAddBlock = (type: ContentBlockType) => {
    pushPagesHistory();
    updateSelectedPage((page) => ({
      ...page,
      blocks: [...page.blocks, createBlock(type)],
    }));
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

  const handleBlockImageUpload = (
    blockId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleBlockChange(blockId, URL.createObjectURL(file));
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
    field: "label" | "url",
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

  return {
    handleAddBlock,
    handleBlockChange,
    handleBlockVariantChange,
    handleMoveBlockUp,
    handleMoveBlockDown,
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
  };
}
