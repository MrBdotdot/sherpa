-- Seed the "Tutorial" game for the Sherpa account owner.
-- Run in Supabase Dashboard -> SQL Editor.
-- Replace the email address below if needed.
--
-- If the game already exists, delete it first:
--   DELETE FROM games WHERE id = 'tutorial-sherpa-v1';

DO $$
DECLARE
  v_user_id uuid;
  v_game_id text := 'tutorial-sherpa-v1';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'will@wbeestudio.com';
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Update the email address at the top of this script.';
  END IF;

  IF EXISTS (SELECT 1 FROM games WHERE id = v_game_id) THEN
    RAISE NOTICE 'Tutorial game already exists. Delete it first, then re-run.';
    RETURN;
  END IF;

  -- Game row
  INSERT INTO games (id, user_id, title, system_settings, card_order, publish_status)
  VALUES (
    v_game_id,
    v_user_id,
    'Tutorial',
    '{
      "fontTheme": "modern",
      "surfaceStyle": "glass",
      "accentColor": "",
      "defaultLanguageCode": "EN",
      "gameIcon": "",
      "hotspotSize": "medium",
      "modelEnvironment": "studio",
      "autoOpenPageId": "tutorial-home"
    }'::jsonb,
    ARRAY[
      'tutorial-home',
      'tutorial-studio',
      'tutorial-nav',
      'tutorial-content-types',
      'tutorial-canvas',
      'tutorial-cards',
      'tutorial-blocks',
      'tutorial-views',
      'tutorial-linking',
      'tutorial-command',
      'tutorial-locale',
      'tutorial-intro',
      'tutorial-publish',
      'tutorial-metrics',
      'tutorial-shortcuts',
      'tutorial-alpha'
    ],
    'draft'
  );

  -- 1. Home canvas (kind: home - this is the background canvas, not a content card)
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-home',
    v_game_id,
    'home',
    'Welcome to Sherpa',
    '',
    '[
      {"id":"tb-home-1","type":"text","value":"# Welcome to Sherpa","blockFormat":"h2"},
      {"id":"tb-home-2","type":"text","value":"Fifteen cards. Each one covers a different part of the authoring studio. Tap any hotspot on a screenshot to learn what that part does.\n\nStart here and work your way through in order, or jump to any section from the card list on the left.","blockFormat":"prose"},
      {"id":"tb-home-3","type":"callout","value":"Use [ and ] to move between cards. Press P to toggle preview mode. Press A to open the command palette.","variant":"tip"}
    ]'::jsonb,
    '[{"id":"sl-home-start","label":"Start: The Authoring Studio →","url":"","linkMode":"page","linkPageId":"tutorial-studio"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 2. The Authoring Studio
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-studio',
    v_game_id,
    'page',
    'The Authoring Studio',
    '',
    '[
      {"id":"tb-studio-1","type":"text","value":"# The Authoring Studio","blockFormat":"h2"},
      {"id":"tb-studio-2","type":"text","value":"Add full-studio screenshot here. Hotspot each major zone: canvas (center), card panel (left), inspector (right), toolbar (top).","blockFormat":"prose"}
    ]'::jsonb,
    '[{"id":"sl-studio-next","label":"Next: The Interface Layout →","url":"","linkMode":"page","linkPageId":"tutorial-nav"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 3. The Interface Layout (IA)
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-nav',
    v_game_id,
    'page',
    'The Interface Layout',
    '',
    '[
      {"id":"tb-nav-1","type":"text","value":"# The Interface Layout","blockFormat":"h2"},
      {"id":"tb-nav-2","type":"text","value":"Add full-studio screenshot here. Hotspot the three navigation areas:\n\n- Left nav: card list, add card, reorder, switch games\n- Right nav (inspector): edit selected card content, canvas features, and settings\n- Top nav: layout mode switcher, preview toggle, publish button, account","blockFormat":"prose"}
    ]'::jsonb,
    '[{"id":"sl-nav-next","label":"Next: Content Types →","url":"","linkMode":"page","linkPageId":"tutorial-content-types"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 4. Content Types
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-content-types',
    v_game_id,
    'page',
    'Content Types',
    '',
    '[
      {"id":"tb-ct-1","type":"text","value":"# Content Types","blockFormat":"h2"},
      {"id":"tb-ct-2","type":"text","value":"Sherpa has three types of content you can create:","blockFormat":"prose"},
      {"id":"tb-ct-3","type":"text","value":"Cards","blockFormat":"h3"},
      {"id":"tb-ct-4","type":"text","value":"The main unit of content. Each card holds text, images, videos, steps, and more. Players open cards by tapping a hotspot or a button. Cards are listed in the left panel.","blockFormat":"prose"},
      {"id":"tb-ct-5","type":"text","value":"Hotspots","blockFormat":"h3"},
      {"id":"tb-ct-6","type":"text","value":"Tappable pins placed on the canvas background. Each hotspot links to a card. When a player taps one, the linked card opens as a modal. You place hotspots by clicking directly on the canvas.","blockFormat":"prose"},
      {"id":"tb-ct-7","type":"text","value":"Canvas Elements","blockFormat":"h3"},
      {"id":"tb-ct-8","type":"text","value":"Decorative or functional elements placed on the canvas: text labels, image overlays, language selectors, and more. Unlike hotspots, elements do not link to cards. They live on the canvas surface itself.","blockFormat":"prose"}
    ]'::jsonb,
    '[{"id":"sl-ct-next","label":"Next: The Canvas →","url":"","linkMode":"page","linkPageId":"tutorial-canvas"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'large',
    0.7
  );

  -- 5. The Canvas (2D vs 3D)
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-canvas',
    v_game_id,
    'page',
    'The Canvas',
    '',
    '[
      {"id":"tb-canvas-1","type":"text","value":"# The Canvas","blockFormat":"h2"},
      {"id":"tb-canvas-2","type":"text","value":"Add canvas screenshot here. Hotspot: image upload area, hotspot placement, layout mode buttons.","blockFormat":"prose"},
      {"id":"tb-canvas-3","type":"text","value":"2D vs 3D","blockFormat":"h3"},
      {"id":"tb-canvas-4","type":"text","value":"By default the canvas shows a flat image. Switch to 3D mode to use a GLB/USDZ model of your game box or board instead. In 3D mode you can rotate the model and place hotspots directly on its surface. Toggle between modes in the Board tab of the inspector.","blockFormat":"prose"}
    ]'::jsonb,
    '[{"id":"sl-canvas-next","label":"Next: Cards & Navigation →","url":"","linkMode":"page","linkPageId":"tutorial-cards"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 6. Cards & Navigation
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-cards',
    v_game_id,
    'page',
    'Cards & Navigation',
    '',
    '[
      {"id":"tb-cards-1","type":"text","value":"# Cards & Navigation","blockFormat":"h2"},
      {"id":"tb-cards-2","type":"text","value":"Add card panel screenshot here. Hotspot: card list, add card button, drag handles for reordering, card type selector (page vs hotspot).","blockFormat":"prose"}
    ]'::jsonb,
    '[{"id":"sl-cards-next","label":"Next: The Block Editor →","url":"","linkMode":"page","linkPageId":"tutorial-blocks"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 7. The Block Editor
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-blocks',
    v_game_id,
    'page',
    'The Block Editor',
    '',
    '[
      {"id":"tb-blocks-1","type":"text","value":"# The Block Editor","blockFormat":"h2"},
      {"id":"tb-blocks-2","type":"text","value":"Add inspector screenshot here. Hotspot: add block button, block types (text, image, callout, steps, tabs, carousel), drag handles, block width toggle (half/full).","blockFormat":"prose"}
    ]'::jsonb,
    '[{"id":"sl-blocks-next","label":"Next: Views & Responsive Editing →","url":"","linkMode":"page","linkPageId":"tutorial-views"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 8. Views & Responsive Editing
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-views',
    v_game_id,
    'page',
    'Views & Responsive Editing',
    '',
    '[
      {"id":"tb-views-1","type":"text","value":"# Views & Responsive Editing","blockFormat":"h2"},
      {"id":"tb-views-2","type":"text","value":"Sherpa has three layout views, switched with the buttons in the top bar (or press 1, 2, 3):","blockFormat":"prose"},
      {"id":"tb-views-3","type":"text","value":"Desktop (1)","blockFormat":"h3"},
      {"id":"tb-views-4","type":"text","value":"The primary view. Content and hotspot positions set here cascade into mobile landscape and portrait automatically. Always build your experience in desktop first.","blockFormat":"prose"},
      {"id":"tb-views-5","type":"text","value":"Mobile Landscape (2) and Portrait (3)","blockFormat":"h3"},
      {"id":"tb-views-6","type":"text","value":"Override positions for smaller screens. Hotspots added in desktop appear in all views, but you can move them independently per view.\n\nDeleting a hotspot in landscape or portrait only removes it from that view. It stays in desktop. Deleting from desktop removes it everywhere.","blockFormat":"prose"},
      {"id":"tb-views-7","type":"callout","value":"Rule of thumb: build in desktop, then fine-tune positions in landscape and portrait.","variant":"tip"}
    ]'::jsonb,
    '[{"id":"sl-views-next","label":"Next: Linking & Buttons →","url":"","linkMode":"page","linkPageId":"tutorial-linking"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'large',
    0.7
  );

  -- 9. Linking & Buttons
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-linking',
    v_game_id,
    'page',
    'Linking & Buttons',
    '',
    '[
      {"id":"tb-link-1","type":"text","value":"# Linking & Buttons","blockFormat":"h2"},
      {"id":"tb-link-2","type":"text","value":"Cards can link to other cards in two ways:","blockFormat":"prose"},
      {"id":"tb-link-3","type":"text","value":"Buttons","blockFormat":"h3"},
      {"id":"tb-link-4","type":"text","value":"Add a button block to any card. Set the link mode to Internal and choose a destination card. Players tap the button to open that card directly.","blockFormat":"prose"},
      {"id":"tb-link-5","type":"text","value":"Text Links","blockFormat":"h3"},
      {"id":"tb-link-6","type":"text","value":"Inside any text block, select a word and use the link tool to link it to another card or an external URL. Works the same way as a hyperlink.","blockFormat":"prose"},
      {"id":"tb-link-7","type":"callout","value":"Try it: the buttons below are live examples. One goes back to the Welcome card, the other continues the tour.","variant":"tip"}
    ]'::jsonb,
    '[
      {"id":"sl-linking-home","label":"← Back to Welcome","url":"","linkMode":"page","linkPageId":"tutorial-home"},
      {"id":"sl-linking-next","label":"Next: The Command Palette →","url":"","linkMode":"page","linkPageId":"tutorial-command"}
    ]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 10. The Command Palette
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-command',
    v_game_id,
    'page',
    'The Command Palette',
    '',
    '[
      {"id":"tb-cmd-1","type":"text","value":"# The Command Palette","blockFormat":"h2"},
      {"id":"tb-cmd-2","type":"text","value":"Add command palette screenshot here. Hotspot the search input, action groups, and a sample result.","blockFormat":"prose"},
      {"id":"tb-cmd-3","type":"text","value":"Press A (or click the command icon in the toolbar) to open the command palette. From here you can:","blockFormat":"prose"},
      {"id":"tb-cmd-4","type":"text","value":"- Search and jump to any card by name\n- Add a new card\n- Add a canvas element (QR code, image, heading, button, dropdown, search, locale switcher)\n- Add a content block to the selected card (text, image, video, steps, callout, tabs, carousel, step rail, divider, consent)\n- Switch layout view (1 = desktop, 2 = landscape, 3 = portrait)\n- Toggle preview mode","blockFormat":"prose"},
      {"id":"tb-cmd-5","type":"callout","value":"The command palette is the fastest way to navigate the studio. Most actions available in the UI are also here.","variant":"tip"}
    ]'::jsonb,
    '[{"id":"sl-cmd-next","label":"Next: Localization →","url":"","linkMode":"page","linkPageId":"tutorial-locale"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 11. Localization
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-locale',
    v_game_id,
    'page',
    'Localization',
    '',
    '[
      {"id":"tb-loc-1","type":"text","value":"# Localization","blockFormat":"h2"},
      {"id":"tb-loc-2","type":"text","value":"Add localization panel screenshot here. Hotspot the language switcher element and the translation input fields.","blockFormat":"prose"},
      {"id":"tb-loc-3","type":"text","value":"Sherpa supports multi-language experiences. To add a language:","blockFormat":"prose"},
      {"id":"tb-loc-4","type":"text","value":"1. Open the inspector Board tab\n2. Add a Language Switcher canvas element\n3. Add a language (e.g. French)\n4. A translation column appears for every text block across all cards\n5. Fill in translations — the player switches language using the element on the canvas","blockFormat":"prose"},
      {"id":"tb-loc-5","type":"callout","value":"The default language is always the source. If no translation exists for a block, it falls back to the source text.","variant":"tip"}
    ]'::jsonb,
    '[{"id":"sl-locale-next","label":"Next: Intro Screen →","url":"","linkMode":"page","linkPageId":"tutorial-intro"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 12. Intro Screen
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-intro',
    v_game_id,
    'page',
    'Intro Screen',
    '',
    '[
      {"id":"tb-intro-1","type":"text","value":"# Intro Screen","blockFormat":"h2"},
      {"id":"tb-intro-2","type":"text","value":"Add intro screen settings screenshot here. Hotspot the YouTube URL field and the enable toggle.","blockFormat":"prose"},
      {"id":"tb-intro-3","type":"text","value":"Every Sherpa experience can open with a video. When enabled, players see a fullscreen YouTube video before the canvas loads. Use it for a trailer, a how-to-play video, or a brand intro.\n\nTo enable: open Settings in the inspector, paste a YouTube URL, and toggle it on. Players can skip the video and go straight to the canvas.","blockFormat":"prose"}
    ]'::jsonb,
    '[{"id":"sl-intro-next","label":"Next: Draft vs Publish →","url":"","linkMode":"page","linkPageId":"tutorial-publish"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 13. Draft vs Publish
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-publish',
    v_game_id,
    'page',
    'Draft vs Publish',
    '',
    '[
      {"id":"tb-pub-1","type":"text","value":"# Draft vs Publish","blockFormat":"h2"},
      {"id":"tb-pub-2","type":"text","value":"Add publish toggle and share link screenshot here. Hotspot the toggle, the share URL, and the QR code.","blockFormat":"prose"},
      {"id":"tb-pub-3","type":"text","value":"Draft","blockFormat":"h3"},
      {"id":"tb-pub-4","type":"text","value":"Default state. Only you can see the experience. No one else can access the play link.","blockFormat":"prose"},
      {"id":"tb-pub-5","type":"text","value":"Published","blockFormat":"h3"},
      {"id":"tb-pub-6","type":"text","value":"Anyone with the link can play your experience. Share the URL or QR code directly from the publish panel. Pro and Studio accounts get a live view that updates in real time as you edit.","blockFormat":"prose"},
      {"id":"tb-pub-7","type":"text","value":"Convention Mode","blockFormat":"h3"},
      {"id":"tb-pub-8","type":"text","value":"Running a demo at a convention or event on a free account? Convention Mode puts your experience in fullscreen play mode for in-person sharing. Players can follow along on their own device using the convention link.\n\nFind Convention Mode inside the publish prompt — it appears at the bottom when you click Publish on a free account. Note that Sherpa branding appears in the experience on free accounts.","blockFormat":"prose"},
      {"id":"tb-pub-9","type":"callout","value":"Convention Mode is session-based. It stays active while you have the tab open. Closing or refreshing the tab ends the session.","variant":"tip"}
    ]'::jsonb,
    '[{"id":"sl-publish-next","label":"Next: Data & Metrics →","url":"","linkMode":"page","linkPageId":"tutorial-metrics"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 14. Data & Metrics
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-metrics',
    v_game_id,
    'page',
    'Data & Metrics',
    '',
    '[
      {"id":"tb-met-1","type":"text","value":"# Data & Metrics","blockFormat":"h2"},
      {"id":"tb-met-2","type":"text","value":"Add analytics dashboard screenshot here. Hotspot the play count, most-viewed cards chart, and session length.","blockFormat":"prose"},
      {"id":"tb-met-3","type":"text","value":"Every published experience automatically tracks how players interact with your rules:\n\n- Total plays and unique sessions\n- Which cards players open most\n- Which hotspots get tapped\n- Average time spent per session\n\nUse this to find which rules players find confusing (high views, short time) and which sections they skip entirely.","blockFormat":"prose"}
    ]'::jsonb,
    '[{"id":"sl-metrics-next","label":"Next: Keyboard Shortcuts →","url":"","linkMode":"page","linkPageId":"tutorial-shortcuts"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  -- 15. Keyboard Shortcuts
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-shortcuts',
    v_game_id,
    'page',
    'Keyboard Shortcuts',
    '',
    '[
      {"id":"tb-sc-1","type":"text","value":"# Keyboard Shortcuts","blockFormat":"h2"},
      {"id":"tb-sc-2","type":"text","value":"Editing","blockFormat":"h3"},
      {"id":"tb-sc-3","type":"text","value":"Cmd/Ctrl + Z: Undo\nCmd/Ctrl + Shift + Z: Redo\nCmd/Ctrl + D: Duplicate selected hotspot","blockFormat":"prose"},
      {"id":"tb-sc-4","type":"text","value":"Navigation","blockFormat":"h3"},
      {"id":"tb-sc-5","type":"text","value":"[: Previous card\n]: Next card\nP: Toggle preview mode\nEsc: Exit preview mode","blockFormat":"prose"},
      {"id":"tb-sc-6","type":"text","value":"View","blockFormat":"h3"},
      {"id":"tb-sc-7","type":"text","value":"Space: Toggle all panels\n1: Desktop layout\n2: Mobile landscape\n3: Mobile portrait","blockFormat":"prose"},
      {"id":"tb-sc-8","type":"text","value":"Hotspot positioning","blockFormat":"h3"},
      {"id":"tb-sc-9","type":"text","value":"Arrow keys: Nudge hotspot 0.25%\nShift + Arrow keys: Nudge hotspot 1%\nDelete / Backspace: Delete selected hotspot or card","blockFormat":"prose"},
      {"id":"tb-sc-10","type":"text","value":"Other","blockFormat":"h3"},
      {"id":"tb-sc-11","type":"text","value":"A: Open command palette","blockFormat":"prose"}
    ]'::jsonb,
    '[{"id":"sl-shortcuts-next","label":"Next: This is Alpha →","url":"","linkMode":"page","linkPageId":"tutorial-alpha"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'large',
    0.7
  );

  -- 16. Alpha Notice
  INSERT INTO cards (id, game_id, kind, title, summary, blocks, social_links, canvas_features, template_id, interaction_type, card_size, content_tint_opacity)
  VALUES (
    'tutorial-alpha',
    v_game_id,
    'page',
    'This is Alpha',
    '',
    '[
      {"id":"tb-alpha-1","type":"text","value":"# This is Alpha","blockFormat":"h2"},
      {"id":"tb-alpha-2","type":"text","value":"Sherpa is early. Things work, but not everything is polished, and the feature set will grow significantly based on what you tell us.","blockFormat":"prose"},
      {"id":"tb-alpha-3","type":"text","value":"You will run into rough edges. That is expected and useful. Every bug you find and every moment of confusion is data that makes the product better.","blockFormat":"prose"},
      {"id":"tb-alpha-4","type":"callout","value":"Found a bug or something confusing? Hit the feedback button in the sidebar. It goes straight to us.","variant":"tip"},
      {"id":"tb-alpha-5","type":"text","value":"Thank you for being here this early. It matters.","blockFormat":"prose"}
    ]'::jsonb,
    '[{"id":"sl-alpha-back","label":"← Back to Welcome","url":"","linkMode":"page","linkPageId":"tutorial-home"}]'::jsonb,
    '[]'::jsonb,
    'blank',
    'modal',
    'medium',
    0.7
  );

  RAISE NOTICE 'Tutorial game seeded (id: %)', v_game_id;
END $$;
