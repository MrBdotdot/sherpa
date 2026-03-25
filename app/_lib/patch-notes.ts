export type PatchNote = {
  version: string;
  date: string;
  changes: string[];
};

export const PATCH_NOTES: PatchNote[] = [
  {
    version: "v0.8.5",
    date: "2026-03-24",
    changes: [
      "Codebase refactor: dead code removed, large files split into focused modules",
      "HotspotPin, CanvasBackground, PageLinkPicker, and FeaturePlacer extracted as reusable components",
      "preview-canvas.tsx reduced from ~663 lines to ~340 lines by eliminating duplicate render branches",
      "Undo/redo keyboard handler no longer re-registers on every page state change",
    ],
  },
  {
    version: "v0.8.4",
    date: "2026-03-24",
    changes: [
      "QR code background color replaced border color — set any hex color with adjustable opacity",
      "QR code card padding reduced by half for a tighter, less bulky appearance",
    ],
  },
  {
    version: "v0.8.3",
    date: "2026-03-24",
    changes: [
      "QR code canvas element now has a size slider (60–240px) to control both the image and container width",
      "QR code label is now centered below the image",
      "Background border replaced with a border color picker — set any hex color or clear to remove the border",
    ],
  },
  {
    version: "v0.8.2",
    date: "2026-03-24",
    changes: [
      "Canvas elements can now be assigned to the portrait content zone via zone toggle in the Surface inspector",
      "Content zone features render above ContentModule (z-20) and are draggable within the content zone in layout edit mode",
      "Image strip now only renders features assigned to the strip (not content zone features)",
    ],
  },
  {
    version: "v0.8.1",
    date: "2026-03-24",
    changes: [
      "Portrait mode now renders a split canvas: content zone (top) + image strip with hotspots (bottom) — keeps tappable controls in thumb reach",
      "ContentModule fills the portrait content zone instead of floating as an overlay card",
      "Portrait split ratio is adjustable (35–75%) via Setup tab — defaults to 55% image strip",
      "Portrait content zone background is configurable via Setup tab — defaults to #1a1a2e",
      "Drag and hotspot creation coordinates in portrait are relative to the image strip, not the full canvas",
    ],
  },
  {
    version: "v0.8.0",
    date: "2026-03-24",
    changes: [
      "Added dual-layout authoring: hotspots, canvas features, and content card positions can now be set independently for Desktop/Landscape and Portrait orientations",
      "Canvas toolbar now shows a centered 3-way segmented toggle: Desktop, Landscape, Portrait — replaces the single Mobile toggle button",
      "Portrait mode uses mobile-specific coordinates (mobileX/Y, mobileContentX/Y) with automatic fallback to desktop positions until manually adjusted",
      "New hotspots created in portrait mode are seeded with the same position in both coordinate sets so nothing starts out of place",
    ],
  },
  {
    version: "v0.7.4",
    date: "2026-03-24",
    changes: [
      "Fixed layout overflow at 1024px — canvas+inspector grid now activates at 1280px (xl) where there is enough room, preventing horizontal scroll on laptops",
      "Added page navigation to mobile/tablet header — a select dropdown lets you switch between all pages without needing the sidebar",
      "Inspector overlay on mobile no longer shows a redundant preview canvas inside the modal",
      "Canvas wrapper padding reduced on small screens (8px/16px on mobile, 20px on md+) to reclaim usable canvas space",
    ],
  },
  {
    version: "v0.7.3",
    date: "2026-03-24",
    changes: [
      "Modal panels now cap at 80% of canvas height and scroll internally — tall content no longer overflows the canvas on small screens",
      "External link card now has a max-width cap to match all other form factors",
    ],
  },
  {
    version: "v0.7.2",
    date: "2026-03-24",
    changes: [
      "New form factor: Bottom sheet — full-width panel that slides up from the bottom edge",
      "Bottom sheet has a drag-handle pill, scrollable content area (capped at 65% of canvas height), and rounded top corners",
      "Available in the display style picker for all container types",
    ],
  },
  {
    version: "v0.7.1",
    date: "2026-03-24",
    changes: [
      "Fixed 'Extra wide' panel width — was using 70% of canvas (narrower than Large at 660px at typical sizes), now fixed at 800px",
      "Renamed modal display styles to a clear size scale: Compact (360px) → Standard (520px) → Large (660px) → Extra wide (800px)",
      "Renamed 'Side sheet' → 'Side panel' and 'Wide side sheet' → 'Wide side panel' for consistency",
      "Display style descriptions now include pixel widths for reference",
    ],
  },
  {
    version: "v0.7.0",
    date: "2026-03-24",
    changes: [
      "Intro screen: paste a YouTube URL to play a full-screen cover video before the experience opens",
      "Black cover hides YouTube's loading UI and fades out when the video starts playing",
      "'Tap anywhere to start' prompt at the bottom of the intro screen",
      "Experience assets (images, videos) preload silently in the background during the intro",
      "Intro screen can be enabled or disabled from the Setup tab — Global section",
    ],
  },
  {
    version: "v0.6.0",
    date: "2026-03-23",
    changes: [
      "Text linking system: surround text with ((label|pageId)) to create tappable inline links that surface containers",
      "Autocomplete dropdown appears when typing (( in text blocks, listing matching pages",
      "Text links render bold in the accent color",
      "Removed all canvas positioning restrictions — hotspots and elements can be placed anywhere",
      "Moved + Template button from sidebar into the Setup tab",
      "Add canvas element and Add content block buttons now match secondary button style",
      "Full-page containers now center content vertically and horizontally",
      "Hotspot dragging gated behind layout edit mode only",
      "Dragging a hotspot or element in edit mode no longer triggers its container interaction",
      "Content module remains visible and repositionable in edit mode",
    ],
  },
  {
    version: "v0.5.9",
    date: "2026-03-23",
    changes: [
      "Fixed side-sheet and full-page animation — wrong transform was applied when pages of hotspot kind used these styles",
      "Canvas background click now dismisses an open container instead of creating a new hotspot",
      "Removed touchAction:none from side-sheet/full-page so touch-scroll works inside them",
    ],
  },
  {
    version: "v0.5.8",
    date: "2026-03-22",
    changes: ["Removed intro text field from Content and Setup tabs"],
  },
  {
    version: "v0.5.7",
    date: "2026-03-22",
    changes: [
      "Replaced multi-line intro text areas with single-line text inputs in Content tab and Setup tab",
    ],
  },
  {
    version: "v0.5.6",
    date: "2026-03-22",
    changes: [
      "Creating a new container now automatically adds a page button to the canvas and the Page buttons panel",
      "Deleting a container now also removes its page button from the canvas",
    ],
  },
  {
    version: "v0.5.5",
    date: "2026-03-22",
    changes: [
      "Removed all blur effects — all surface elements now use solid backgrounds",
      "Fixed container position mismatch between layout edit mode and normal mode — 'Content module' label no longer shifts the card position",
    ],
  },
  {
    version: "v0.5.4",
    date: "2026-03-22",
    changes: [
      "Fixed blurry hotspot label text on small and medium marker sizes",
      "Fixed canvas darkening overlay appearing when exiting layout edit mode — veil now only shows when a visitor opens hotspot content in preview mode",
    ],
  },
  {
    version: "v0.5.3",
    date: "2026-03-22",
    changes: [
      "Fixed live preview — edits to text, container size, and content blocks now reflect instantly without clicking away",
      "Creating a hotspot now automatically opens the Content tab in the inspector",
    ],
  },
  {
    version: "v0.5.2",
    date: "2026-03-22",
    changes: [
      "Fixed changelog modal parse error causing sidebar to break",
      "Removed duplicate Display style selector from Setup tab (it lives in Content tab)",
    ],
  },
  {
    version: "v0.5.1",
    date: "2026-03-22",
    changes: [
      "Added in-app changelog modal — click the version badge in the sidebar to view patch notes",
      "Fixed hydration mismatch crash caused by random page IDs on server vs client",
      "Fixed CSS build error from bare custom properties outside a selector",
    ],
  },
  {
    version: "v0.5.0",
    date: "2026-03-22",
    changes: [
      "Container open/close animations with expo easing (wipe-in for side-sheet and full-page, scale-fade for modal and tooltip)",
      "Image blocks now support fill, fit, stretch, and center-crop display modes",
      "Markdown info icon replaces the write/preview toggle in text blocks",
      "Canvas content module extracted into its own component",
      "Back button repositioned per container type (sticky inside full-page, top-right for side-sheet, floating above modal/tooltip)",
      "Type tags removed from container headers",
    ],
  },
];
