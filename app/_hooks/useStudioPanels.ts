"use client";

import { useEffect, useRef, useState } from "react";

const SIDEBAR_WIDTH = 300;
const INSPECTOR_WIDTH = 380;
const PANEL_HANDLE_WIDTH = 32;
const SIDEBAR_WRAPPER_WIDTH = SIDEBAR_WIDTH + PANEL_HANDLE_WIDTH;

type UseStudioPanelsProps = {
  isPreviewMode: boolean;
};

export function useStudioPanels({ isPreviewMode }: UseStudioPanelsProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isTopNavOpen, setIsTopNavOpen] = useState(true);
  const [isBottomNavOpen, setIsBottomNavOpen] = useState(true);
  const [studioDarkMode, setStudioDarkMode] = useState(() => {
    try { return localStorage.getItem("sherpa-studio-dark") === "true"; } catch { return false; }
  });

  const isSidebarOpenRef = useRef(isSidebarOpen);
  const isInspectorOpenRef = useRef(isInspectorOpen);
  const isTopNavOpenRef = useRef(isTopNavOpen);
  const isBottomNavOpenRef = useRef(isBottomNavOpen);
  useEffect(() => { isSidebarOpenRef.current = isSidebarOpen; }, [isSidebarOpen]);
  useEffect(() => { isInspectorOpenRef.current = isInspectorOpen; }, [isInspectorOpen]);
  useEffect(() => { isTopNavOpenRef.current = isTopNavOpen; }, [isTopNavOpen]);
  useEffect(() => { isBottomNavOpenRef.current = isBottomNavOpen; }, [isBottomNavOpen]);

  useEffect(() => {
    try { localStorage.setItem("sherpa-studio-dark", studioDarkMode ? "true" : "false"); } catch { /* quota */ }
  }, [studioDarkMode]);

  const sidebarTransform = !isPreviewMode && isSidebarOpen
    ? "translateX(0)"
    : `translateX(-${SIDEBAR_WRAPPER_WIDTH}px)`;
  const inspectorTransform = !isPreviewMode && isInspectorOpen
    ? "translateX(0)"
    : `translateX(${INSPECTOR_WIDTH}px)`;

  const onCollapseSidebar = () => { if (isSidebarOpenRef.current) setIsSidebarOpen(false); };
  const onCollapseInspector = () => { if (isInspectorOpenRef.current) setIsInspectorOpen(false); };
  const onCollapseTopNav = () => { if (isTopNavOpenRef.current) setIsTopNavOpen(false); };
  const onCollapseBottomNav = () => { if (isBottomNavOpenRef.current) setIsBottomNavOpen(false); };

  return {
    isSidebarOpen, setIsSidebarOpen,
    isInspectorOpen, setIsInspectorOpen,
    isTopNavOpen, setIsTopNavOpen,
    isBottomNavOpen, setIsBottomNavOpen,
    studioDarkMode, setStudioDarkMode,
    isSidebarOpenRef, isInspectorOpenRef, isTopNavOpenRef, isBottomNavOpenRef,
    sidebarTransform, inspectorTransform,
    onCollapseSidebar, onCollapseInspector, onCollapseTopNav, onCollapseBottomNav,
  };
}
