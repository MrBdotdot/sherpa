"use client";

import { Dispatch, SetStateAction, useRef } from "react";
import { PageItem } from "@/app/_lib/authoring-types";

export function useStudioHistory(
  pages: PageItem[],
  setPages: Dispatch<SetStateAction<PageItem[]>>
) {
  const pagesHistoryRef = useRef<PageItem[][]>([]);
  const pagesRedoRef = useRef<PageItem[][]>([]);

  const pushPagesHistory = () => {
    pagesHistoryRef.current = [...pagesHistoryRef.current.slice(-49), pages];
    pagesRedoRef.current = [];
  };

  return { pagesHistoryRef, pagesRedoRef, pushPagesHistory };
}
