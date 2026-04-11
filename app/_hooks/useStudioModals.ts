"use client";

import { useState } from "react";

export function useStudioModals() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGameSwitcherOpen, setIsGameSwitcherOpen] = useState(false);
  const [isCreateContainerOpen, setIsCreateContainerOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isRulebookImportOpen, setIsRulebookImportOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [cardPairingPageId, setCardPairingPageId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  return {
    isCommandPaletteOpen, setIsCommandPaletteOpen,
    isGameSwitcherOpen, setIsGameSwitcherOpen,
    isCreateContainerOpen, setIsCreateContainerOpen,
    isChangelogOpen, setIsChangelogOpen,
    isRulebookImportOpen, setIsRulebookImportOpen,
    isAccountOpen, setIsAccountOpen,
    cardPairingPageId, setCardPairingPageId,
    showDeleteModal, setShowDeleteModal,
    showOnboarding, setShowOnboarding,
  };
}
