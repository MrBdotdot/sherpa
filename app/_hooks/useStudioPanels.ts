"use client";

import { useEffect, useRef, useState } from "react";

const SIDEBAR_WIDTH = 300;
const INSPECTOR_WIDTH = 380;
const STUDIO_CHROME_MARGIN = 18;
const STUDIO_CHROME_GAP = 24;
const PANEL_HANDLE_WIDTH = 32;
const SIDEBAR_WRAPPER_WIDTH = SIDEBAR_WIDTH + PANEL_HANDLE_WIDTH;

type UseStudioPanelsProps = {
  isPreviewMode: boolean;
};

export function useStudioPanels({ isPreviewMode }: UseStudioPanelsProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);
  const [studioDarkMode, setStudioDarkMode] = useState(() => {
    try { return localStorage.getItem("sherpa-studio-dark") === "true"; } catch { return false; }
  });

  const isSidebarOpenRef = useRef(isSidebarOpen);
  const isInspectorOpenRef = useRef(isInspectorOpen);
  const isHeaderOpenRef = useRef(isHeaderOpen);
  useEffect(() => { isSidebarOpenRef.current = isSidebarOpen; }, [isSidebarOpen]);
  useEffect(() => { isInspectorOpenRef.current = isInspectorOpen; }, [isInspectorOpen]);
  useEffect(() => { isHeaderOpenRef.current = isHeaderOpen; }, [isHeaderOpen]);

  useEffect(() => {
    try { localStorage.setItem("sherpa-studio-dark", studioDarkMode ? "true" : "false"); } catch { /* quota */ }
  }, [studioDarkMode]);

  const headerLeftInset = STUDIO_CHROME_MARGIN + SIDEBAR_WIDTH + STUDIO_CHROME_GAP;
  const headerRightInset = STUDIO_CHROME_MARGIN + INSPECTOR_WIDTH + STUDIO_CHROME_GAP;
  const sidebarTransform = !isPreviewMode && isSidebarOpen
    ? "translateX(0)"
    : `translateX(-${SIDEBAR_WRAPPER_WIDTH}px)`;
  const inspectorTransform = !isPreviewMode && isInspectorOpen
    ? "translateX(0)"
    : `translateX(${INSPECTOR_WIDTH}px)`;

  const onCollapseSidebar = () => { if (isSidebarOpenRef.current) setIsSidebarOpen(false); };
  const onCollapseInspector = () => { if (isInspectorOpenRef.current) setIsInspectorOpen(false); };
  const onCollapseHeader = () => { if (isHeaderOpenRef.current) setIsHeaderOpen(false); };

  return {
    isSidebarOpen, setIsSidebarOpen,
    isInspectorOpen, setIsInspectorOpen,
    isHeaderOpen, setIsHeaderOpen,
    studioDarkMode, setStudioDarkMode,
    isSidebarOpenRef, isInspectorOpenRef, isHeaderOpenRef,
    headerLeftInset, headerRightInset,
    sidebarTransform, inspectorTransform,
    onCollapseSidebar, onCollapseInspector, onCollapseHeader,
  };
}
