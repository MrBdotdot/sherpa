"use client";

import React, { useEffect, useRef, useState } from "react";

type UseGameNameEditingProps = {
  gameName?: string;
  activePageTitle?: string;
  onRenameGame?: (name: string) => void;
};

type UseGameNameEditingResult = {
  editingName: boolean;
  nameInput: string;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  setNameInput: (value: string) => void;
  setEditingName: (value: boolean) => void;
  startEditName: () => void;
  commitName: () => void;
};

export function useGameNameEditing({
  gameName,
  activePageTitle,
  onRenameGame,
}: UseGameNameEditingProps): UseGameNameEditingResult {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  function startEditName() {
    setNameInput(gameName ?? activePageTitle ?? "");
    setEditingName(true);
  }

  function commitName() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== (gameName ?? activePageTitle)) onRenameGame?.(trimmed);
    setEditingName(false);
  }

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  return {
    editingName,
    nameInput,
    nameInputRef,
    setNameInput,
    setEditingName,
    startEditName,
    commitName,
  };
}
