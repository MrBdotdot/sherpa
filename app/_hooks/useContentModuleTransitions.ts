"use client";

import React, { useEffect, useRef, useState } from "react";
import { PageItem } from "@/app/_lib/authoring-types";

type UseContentModuleTransitionsProps = {
  activePage: PageItem;
};

type UseContentModuleTransitionsResult = {
  modulePage: PageItem | null;
  isModuleExiting: boolean;
  modulePageRef: React.RefObject<PageItem | null>;
  isModuleExitingRef: React.RefObject<boolean>;
  handleModuleExitEnd: () => void;
};

export function useContentModuleTransitions({
  activePage,
}: UseContentModuleTransitionsProps): UseContentModuleTransitionsResult {
  const [modulePage, setModulePage] = useState<PageItem | null>(
    activePage.kind !== "home" ? activePage : null
  );
  const [isModuleExiting, setIsModuleExiting] = useState(false);
  const modulePageRef = useRef<PageItem | null>(modulePage);
  const isModuleExitingRef = useRef(false);

  function syncModuleState(page: PageItem | null, exiting: boolean) {
    modulePageRef.current = page;
    isModuleExitingRef.current = exiting;
    setModulePage(page);
    setIsModuleExiting(exiting);
  }

  useEffect(() => {
    if (activePage.kind !== "home") {
      if (modulePageRef.current?.id !== activePage.id || isModuleExitingRef.current) {
        syncModuleState(activePage, false);
      } else if (!isModuleExitingRef.current) {
        modulePageRef.current = activePage;
        setModulePage(activePage);
      }
    } else if (modulePageRef.current !== null && !isModuleExitingRef.current) {
      isModuleExitingRef.current = true;
      setIsModuleExiting(true);
    }
  }, [activePage]);

  function handleModuleExitEnd() {
    syncModuleState(null, false);
  }

  return {
    modulePage,
    isModuleExiting,
    modulePageRef,
    isModuleExitingRef,
    handleModuleExitEnd,
  };
}
