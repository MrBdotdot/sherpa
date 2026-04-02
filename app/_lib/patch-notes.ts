export type PatchNote = {
  version: string;
  date: string;
  changes: string[];
};

export const PATCH_NOTES: PatchNote[] = [
  {
    version: "v0.13.6",
    date: "2026-04-01",
    changes: [
      "Performance: memoized model3dMarkers, effectiveHotspotPages, effectiveFeatures, accentColor style objects in preview-canvas; EmptySurfaceGuidance, SnapGuides, FeaturePlacer wrapped with React.memo to prevent re-renders during drag",
      "useDrag split into useHotspotDrag, useFeatureDrag, useContentDrag — composite hook unchanged from callsite",
      "usePageHandlers CRUD operations extracted to usePageCrud — composite hook unchanged from callsite",
      "block-editor.tsx: CalloutBlockEditor, ImageBlockEditor, ConsentBlockEditor extracted to block-type-editors.tsx; file reduced from 832 to 678 lines",
    ],
  },
  {
    version: "v0.13.5",
    date: "2026-04-01",
    changes: [
      "Code modularized — account-panel split into account-form-ui + account-sections; preview-canvas helpers extracted to canvas/preview-canvas-helpers; NewContainerForm extracted from setup-tab; authoring-utils labels moved to label-utils, display-style helpers to display-style; BlockPickerModal extracted from content-tab; CanvasFeatureTypeBody extracted from canvas-feature-editor",
    ],
  },
  {
    version: "v0.13.4",
    date: "2026-04-01",
    changes: [
      "Code modularized — TabsBlockEditor extracted to tabs-block-editor.tsx, CarouselBlockEditor to carousel-block-editor.tsx; block-editor.tsx reduced from 1251 to 832 lines",
    ],
  },
  {
    version: "v0.13.3",
    date: "2026-04-01",
    changes: [
      "Nav pages renamed to Screens in the sidebar to distinguish them from the landing page canvas",
    ],
  },
  {
    version: "v0.13.2",
    date: "2026-04-01",
    changes: [
      "Command palette expanded — now covers switching games, opening analytics, account settings, changelog, inspector tab switching, layout edit mode, design settings (font, surface, hotspot size, portrait layout), and contextual publish/delete actions for the current page and selected canvas element",
      "Keyword highlighting — matched search terms appear in bold in both the command palette results and the search canvas element snippets",
      "Code modularized — search index logic extracted to _lib/search-index.ts, SearchFeatureCard to canvas/search-feature-card.tsx, palette entries to usePaletteEntries hook; modal state lifted from PageSidebar to AuthoringStudio",
    ],
  },
  {
    version: "v0.13.1",
    date: "2026-04-01",
    changes: [
      "Search canvas element — place a live search bar anywhere on the canvas; results appear inline with snippets and breadcrumb paths showing where each match lives",
      "Breadcrumb navigation in search results — each breadcrumb segment is individually clickable to jump directly to that page or section",
      "Tabs and carousel blocks are indexed by section/slide, so search surfaces results within nested content, not just top-level pages",
    ],
  },
  {
    version: "v0.13.0",
    date: "2026-03-31",
    changes: [
      "Command palette (⌘K or search icon in toolbar) — jump to any page, add canvas features, switch layout modes, and trigger actions from a single keyboard-driven interface",
      "Delete / Backspace — removes the selected canvas feature or hotspot without reaching for the inspector",
      "⌘D — duplicates the selected canvas feature, offset by 3% so it's immediately visible",
      "1 / 2 / 3 — switches between Desktop, Landscape, and Portrait layout modes",
      "P — toggles preview mode; Esc still exits it",
      "F — toggles focus mode, hiding the sidebar and inspector for a distraction-free canvas; press F again or click the exit button to return",
      "[ / ] — cycles through pages in order",
      "Arrow keys — nudges the selected canvas feature by 0.25%; Shift+Arrow nudges by 1%; debounced so a held key produces a single undo step",
    ],
  },
  {
    version: "v0.12.9",
    date: "2026-03-28",
    changes: [
      "Fixed inline markup keys — match position used instead of incrementing counter, preventing React reconciliation flicker on links and colored spans",
      "Fixed hotspot empty-check string — exported as a shared constant so hotspot-pin.tsx and authoring-utils.ts can never drift out of sync",
      "Fixed useMobileDetect — now listens to window resize events so mobile layout responds when the browser window is resized",
      "Undo/redo history limit raised from 50 to 100 steps; limit is now a single constant shared across all three stack operations",
    ],
  },
  {
    version: "v0.12.8",
    date: "2026-03-28",
    changes: [
      "3D authoring: Orbit / Place mode toggle — default is Orbit (safe), switch to Place to add hotspots, eliminating accidental placement while examining the model",
      "3D authoring: hotspot sphere markers now show the hotspot title as a floating label, making it easy to identify all hotspots without clicking each one",
      "3D authoring: camera reset button (↺) snaps back to the initial view position and orientation",
    ],
  },
  {
    version: "v0.12.7",
    date: "2026-03-28",
    changes: [
      "3D hotspot content panels (modal/tooltip) now track the orbiting hotspot — the panel follows the 3D position in real time as you rotate the model, with no React re-renders (direct DOM update via useFrame)",
    ],
  },
  {
    version: "v0.12.6",
    date: "2026-03-28",
    changes: [
      "3D hotspot markers (spheres in authoring mode, HTML pins in preview) now sit on top of the model surface instead of sinking into it — offset along the stored surface normal by one sphere radius",
    ],
  },
  {
    version: "v0.12.5",
    date: "2026-03-28",
    changes: [
      "Fixed 3D model orbit: hotspot overlay divs were covering the WebGL canvas and swallowing all pointer events — OrbitControls now receives drags correctly",
    ],
  },
  {
    version: "v0.12.4",
    date: "2026-03-28",
    changes: [
      "3D hotspot overlay (Chunk 4): hotspots placed on a 3D model now render as interactive HTML pins (matching the 2D hotspot visual) projected onto the canvas in real time",
      "Back-face culling: hotspot pins automatically hide when the surface normal they were placed on faces away from the camera — they reappear as you orbit back around",
      "In authoring mode, blue sphere markers remain; HTML pins are shown in preview mode only",
      "Fixed non-portrait layout missing model settings props (scale, rotation, environment, hotspots)",
    ],
  },
  {
    version: "v0.12.3",
    date: "2026-03-28",
    changes: [
      "3D hotspot placement (Chunk 3): when a 3D model background is active, click anywhere on the model surface to place a hotspot — a crosshair cursor and hint label indicate authoring mode",
      "Placed hotspots appear as blue spheres in the 3D scene; the selected hotspot glows white — click a sphere to select it",
      "Hotspot world-position is stored in the model's group-local coordinate space so markers stay glued to the surface even if scale or rotation are later adjusted",
    ],
  },
  {
    version: "v0.12.2",
    date: "2026-03-28",
    changes: [
      "3D model settings (Chunk 2): when a 3D model background is active, a new '3D model' settings section appears with scale, initial spin (Y), initial tilt (X), and a lighting environment dropdown",
      "Lighting presets (apartment, city, dawn, forest, lobby, night, park, studio, sunset, warehouse) use image-based lighting for realistic reflections on PBR materials",
    ],
  },
  {
    version: "v0.12.1",
    date: "2026-03-28",
    changes: [
      "Image block width is now a continuous slider (80–800px) instead of Small / Medium / Large buttons — slide all the way right for full width",
    ],
  },
  {
    version: "v0.12.0",
    date: "2026-03-28",
    changes: [
      "3D model background (Chunk 1): set any home page background to a .glb / .gltf model — paste a URL or upload a file in Settings → Background → 3D model",
      "Orbit controls built in: drag to rotate, scroll to zoom, right-drag to pan",
      "Switching back to a 2D image or color background is always available via the same toggle",
      "Data model extended: hotspot PageItems now carry worldPosition and worldNormal fields for upcoming angle-based visibility (Chunk 4)",
    ],
  },
  {
    version: "v0.11.9",
    date: "2026-03-28",
    changes: [
      "Content blocks can now be reordered by dragging — hover a block to reveal the grip handle on its left edge, then drag to the desired position",
    ],
  },
  {
    version: "v0.11.8",
    date: "2026-03-27",
    changes: [
      "Half-width block grids now auto-collapse to a single column in narrow containers (side sheets, compact cards) instead of squeezing into 2 fixed columns",
      "Tabs bar now scrolls horizontally in narrow containers instead of overflowing",
    ],
  },
  {
    version: "v0.11.7",
    date: "2026-03-27",
    changes: [
      "Adding a Step Rail block now automatically creates pre-linked Section blocks for each step — no manual wiring needed",
    ],
  },
  {
    version: "v0.11.6",
    date: "2026-03-27",
    changes: [
      "Landscape mode now supports drag-to-pan — drag left/right on the board to reveal parts cut off by the frame, with hotspot pins following the pan",
    ],
  },
  {
    version: "v0.11.5",
    date: "2026-03-27",
    changes: [
      "Portrait hotspot pins now follow the image when you drag-to-pan the board strip",
    ],
  },
  {
    version: "v0.11.4",
    date: "2026-03-27",
    changes: [
      "Selecting a hotspot from the canvas now automatically switches the inspector to the Content tab",
      "Preview mode in landscape and portrait now shows the correct mobile frame instead of stretching to desktop dimensions",
    ],
  },
  {
    version: "v0.11.3",
    date: "2026-03-27",
    changes: [
      "Portrait image strip now supports horizontal drag-to-pan — drag left/right on the board image to reveal parts cut off by the frame",
    ],
  },
  {
    version: "v0.11.2",
    date: "2026-03-27",
    changes: [
      "Refactor: extracted FocalPointPicker, ImageHotspotEditor, StepRailBlockEditor into dedicated files; extracted ConsentFormBlock, inline-markup utilities, ImageBlock, StepRailBlock/SectionBlock from preview-blocks.tsx",
    ],
  },
  {
    version: "v0.11.1",
    date: "2026-03-27",
    changes: [
      "Image block hotspot popovers now appear correctly to the left or right of the image frame — previously they were clipped by the modal card's scroll container",
    ],
  },
  {
    version: "v0.11.0",
    date: "2026-03-27",
    changes: [
      "Image block hotspots: click anywhere on an image block to place a hotspot pin — each pin has a label and content field edited inline in the Content tab",
      "Image block hotspots: in the player preview, pins pulse on the image and reveal a popover with the label and content on tap",
    ],
  },
  {
    version: "v0.10.9",
    date: "2026-03-27",
    changes: [
      "Left nav IA: renamed 'Containers' to 'Pages', moved Hotspots section under the Landing page entry, added '+ New page' button inline with the Pages section header",
      "Left nav IA: game switcher bottom bar now shows 'Studio / Game' format for clearer workspace context",
      "Inspector tabs renamed: 'Surface' → 'Canvas', 'Setup' → 'Settings'",
      "Inspector tab order changed for page editors: Content → Canvas → Settings (reflects natural authoring workflow)",
      "Home page inspector: Content tab now shown as dimmed with a tooltip explaining why it is unavailable on the landing page",
    ],
  },
  {
    version: "v0.10.8",
    date: "2026-03-27",
    changes: [
      "Account management: new section at the bottom of the left nav — profile, business info, security & privacy, notifications, session history & change log, team & access (with roles), language, billing, terms of service, and privacy policy",
      "Game switcher: click the game button in the bottom nav to switch between publishing platforms, studios, and games — navigates via breadcrumb with role-based context",
      "Global experience status: Draft/Published control moved from per-page selects to a single interactive badge in the preview header — click to open a status menu",
      "Left nav restructured with a fixed bottom bar showing the current game switcher and account/avatar button",
      "Analytics dashboard: /analytics route with sessions over time, hotspot performance ranking, device breakdown, top navigation paths, and interaction heatmap — placeholder data, ready to connect to PostHog",
      "Game switcher: clicking a game now expands an action panel with 'Edit rules' and 'View analytics' options instead of immediately selecting",
    ],
  },
  {
    version: "v0.10.6",
    date: "2026-03-26",
    changes: [
      "Image block: tap to open full-screen lightbox — enable per-block via 'Open full-screen on tap' toggle in the editor",
      "Image block: optional caption field — text appears centered below the image",
      "Image block: size control — Full (default), S (120px), M (240px), L (360px) max-width; sized images are centered within the content area",
    ],
  },
  {
    version: "v0.10.5",
    date: "2026-03-26",
    changes: [
      "Step Rail: horizontal rail no longer shows a scroll bar — overflow is clipped and a max step count is enforced in the editor",
      "Step Rail: horizontal orientation now animates by sliding up to hide and sliding down to reveal; vertical continues to slide left/right",
      "Step Rail: hide trigger switched from IntersectionObserver to a scroll-event listener on the actual scroll container for reliable cross-layout detection",
      "Step Rail: show/hide transitions are now animated — rail slides and fades rather than snapping",
      "Step Rail: layout is preserved when hidden — the vertical rail column holds its width so surrounding text does not reflow",
      "Accessibility issue toasts temporarily suppressed",
    ],
  },
  {
    version: "v0.10.4",
    date: "2026-03-26",
    changes: [
      "New Section block — a lightweight anchor divider that marks a named section in the page's content; used as link targets for the Step Rail",
      "New Step Rail block — a pure navigation rail (icons + connecting lines + completion state) that floats beside the page content as a sticky sidebar; links to Section blocks and auto-highlights the active section via IntersectionObserver as you scroll",
      "New Carousel block — swipeable multi-slide content pager with touch swipe, keyboard arrow support, dot indicators, and prev/next buttons; each slide has full block editor support",
      "Retired the Progress Bar block — superseded by the Step Rail + Section anchor system",
      "Step Rail: vertical orientation renders as a sticky left sidebar outside the content flow; horizontal renders as a sticky top strip",
      "Step Rail: tapping a step icon scrolls to the linked section; active step updates automatically as the user scrolls",
      "Step Rail: rail fades in when the first linked section enters view, fades out once the last section leaves view",
    ],
  },
  {
    version: "v0.10.3",
    date: "2026-03-26",
    changes: [
      "Progress Bar step rail now floats outside the content flow — vertical rail sits absolutely on the left edge, horizontal rail sits absolutely at the top edge; content takes the full available width/height",
      "Full-page containers now show a dedicated close button fixed to the top-right corner of the container — larger target (40×40px), circle background, SVG X icon",
      "Close button no longer appears in the title row for full-page containers",
    ],
  },
  {
    version: "v0.10.2",
    date: "2026-03-26",
    changes: [
      "Progress Bar: connector track now runs between step icons — completed segments fill with the step's color, future segments stay neutral",
      "Progress Bar: completed steps (before the active one) show a checkmark instead of a number",
      "Progress Bar: future steps are dimmed; only steps behind the active one animate or fill",
      "Progress Bar: Prev / Next buttons added below step content in both horizontal and vertical layouts",
      "Progress Bar: icon shape is now a block-level setting (instead of per-step) — set it once in the Layout section",
      "Progress Bar: pulse animation on the active step can be toggled off via the Layout section",
      "Progress Bar editor: steps can be reordered with up/down arrows in each step header",
    ],
  },
  {
    version: "v0.10.1",
    date: "2026-03-25",
    changes: [
      "New Progress Bar block — a self-contained multi-step navigator with horizontal or vertical layout",
      "Each step has its own label, accent color, icon shape (circle / square / squircle / diamond / none), optional custom image, and full content blocks",
      "Active step shows a pulsating ring indicator in that step's color and a slightly larger icon",
      "Horizontal layout: step indicator rail sticks to the top of the scrollable content area as content scrolls beneath it",
      "Vertical layout: step indicators sit in a left rail alongside the active step's content",
      "Block picker reorganized — new Sections category groups Tabs and Progress Bar together",
    ],
  },
  {
    version: "v0.10.0",
    date: "2026-03-25",
    changes: [
      "New Tabs block — add a tabbed toggle menu inside any container to switch between named sections",
      "Tab bar sits centered at the top of the block; active tab uses the experience accent color",
      "Unlimited sections per tabs block; add and remove sections in the block editor",
      "Tab content supports full markdown formatting",
    ],
  },
  {
    version: "v0.9.9",
    date: "2026-03-25",
    changes: [
      "Image blocks now have a draggable focal point picker for Fill and Crop modes — click or drag anywhere on the preview to set where the image is anchored",
      "Focal point is stored as x/y percentages and applied as object-position in the experience",
      "Cross-hair overlay shows the current focal point position while dragging",
    ],
  },
  {
    version: "v0.9.8",
    date: "2026-03-25",
    changes: [
      "Inline text color — wrap any word or phrase with {text|#hexcolor} to apply a custom color in the experience",
      "Use {text|accent} to automatically match the experience accent color",
      "Color picker in the prose toolbar: preset swatches, accent shortcut, and a custom hex input — applies to selected text",
      "Color syntax works in all text formats: prose, bullets, steps, callouts, and summaries",
    ],
  },
  {
    version: "v0.9.7",
    date: "2026-03-25",
    changes: [
      "Text blocks now have a formatting toolbar: Paragraph, H2, H3, Bullet list, and Numbered list — Steps is no longer a separate block type",
      "Bold and Italic inline buttons wrap selected text in the textarea with markdown markers",
      "Vertical alignment control (Top / Middle / Bottom) added to text, callout, and image blocks — sets how blocks align within a half-width row",
      "Block editor header restructured: block name and Remove button always appear at the top above all controls",
      "Alignment icons replaced with SVG icons instead of letters (L/C/R, T/M/B)",
    ],
  },
  {
    version: "v0.9.6",
    date: "2026-03-25",
    changes: [
      "Per-block text alignment — L/C/R toggle in the block header for text, steps, and callout blocks",
      "Fixed (( inline link trigger — dropdown now renders via portal, avoiding modal overflow clipping",
      "Link trigger now shows 'No pages to link to' when triggered with no linkable pages available",
    ],
  },
  {
    version: "v0.9.5",
    date: "2026-03-25",
    changes: [
      "Per-block width control — each text, steps, callout, and image block can be set to Full or ½ width independently",
      "Half-width blocks sit side by side automatically; full-width blocks always span the container",
      "Consent forms and video blocks are always full width",
      "Block picker reorganized into grouped categories: Text, Media, and Interactive",
      "Container appearance section moved above the Add content block button",
    ],
  },
  {
    version: "v0.9.3",
    date: "2026-03-25",
    changes: [
      "Portrait layout now offers two modes: Split (image strip + content zone) and Full portrait image (single image fills entire canvas)",
      "In full portrait mode, canvas features and hotspots float freely across the whole canvas — no zone assignment needed",
    ],
  },
  {
    version: "v0.9.2",
    date: "2026-03-25",
    changes: [
      "Image element behavior now defaults to 'None' — no destination link shown until explicitly selected",
    ],
  },
  {
    version: "v0.9.1",
    date: "2026-03-25",
    changes: [
      "New Consent Form block type — captures playtester name, date, and optional email",
      "Submissions sent via Web3Forms (designer provides access key); failed sends cached locally and retried automatically",
      "Post-submission shows 'Signed — thank you' and returns to the experience after 2 seconds",
    ],
  },
  {
    version: "v0.9.0",
    date: "2026-03-25",
    changes: [
      "Mobile visitors now see a dedicated landing page instead of the authoring tool",
      "New public gallery at /gallery — curated rules experiences built with Sherpa",
      "Gallery entry pages at /gallery/[id] with game metadata and a placeholder for the interactive viewer",
    ],
  },
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
