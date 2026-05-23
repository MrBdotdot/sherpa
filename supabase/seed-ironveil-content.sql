-- Run this in the Supabase Dashboard → SQL Editor.
-- Seeds 5 chapters of fictional but believable rulebook content for Ironveil
-- (game id: 'ironveil'), so the reading page at /gallery/ironveil has substance:
-- the TOC populates, the HowToStep JSON-LD has real prose for AI engines to
-- quote, and the social-share OG image has something to anchor.
--
-- Pre-req: the curator + Ironveil game row must already exist (run
-- supabase/seed-gallery.sql first).
--
-- Idempotent via ON CONFLICT (id) DO NOTHING. Safe to re-run.
--
-- Explicit `created_at` offsets force the reading page ordering. Cards in
-- `fetchPublishedGame` are sorted by `created_at ASC`.

INSERT INTO cards (id, game_id, kind, title, summary, blocks, publish_status, created_at)
VALUES
  (
    'ironveil-overview', 'ironveil', 'page', 'Overview',
    'Hidden movement meets cell-based resistance in occupied Ironveil.',
    $$[
      {"id":"b1","type":"text","value":"A city that knows it's being watched.","blockFormat":"h2"},
      {"id":"b2","type":"text","value":"Three years ago, the Sovereignty annexed Ironveil. The occupation runs the trams, the docks, the press — but the alleys belong to whoever moved last. Ironveil is an asymmetric thriller for 3–6 players. One side plays the Occupation: methodical, well-resourced, blind in patches. The other side plays the Resistance: split into cells that don't fully trust each other, slipping through the city on a hidden movement track only they can see.","blockFormat":"prose"},
      {"id":"b3","type":"text","value":"The Occupation tries to identify and capture cell members before they execute three Operations. The Resistance tries to execute those Operations without losing too many couriers, sympathizers, or safe houses along the way. Trust is the most expensive resource in the game.","blockFormat":"prose"}
    ]$$::jsonb,
    'published',
    NOW() - INTERVAL '5 seconds'
  ),
  (
    'ironveil-components', 'ironveil', 'page', 'What''s in the box',
    'One city board, two screens, dice, tokens, and a deck of Rumors.',
    $$[
      {"id":"b1","type":"text","value":"Components","blockFormat":"h2"},
      {"id":"b2","type":"text","value":"1 large city board (the public map: trams, districts, checkpoints)\n1 Resistance screen (the hidden movement track lives behind it)\n6 cell pawns (one per cell, revealed only when a member is identified)\n8 Occupation pawns (patrols, plus the Inspector)\n60 Rumor cards (small leaks: witness reports, intercepted comms)\n12 Operation cards (the Resistance's win conditions)\n20 Trace tokens (where the Resistance leaves tells: footprints, smoke, a coffee cup still warm)","blockFormat":"bullets"}
    ]$$::jsonb,
    'published',
    NOW() - INTERVAL '4 seconds'
  ),
  (
    'ironveil-setup', 'ironveil', 'page', 'Setting up Ironveil',
    'Place the board, choose roles, deal Operation cards face-down to each cell.',
    $$[
      {"id":"b1","type":"text","value":"Setup","blockFormat":"h2"},
      {"id":"b2","type":"text","value":"Unfold the city board in the center of the table. Place the Resistance screen along the north edge — the courier track lives behind it.\nDeal Occupation roles: one Inspector, the rest are Patrols. The Inspector takes the white pawn.\nDeal three Operation cards to each Resistance cell, face-down. These are the cell's wins; only that cell sees them.\nShuffle the Rumor deck. Deal three Rumors to the Inspector face-down.\nPlace 5 Trace tokens at the depots marked on the board. The rest go in a shared pool.\nThe Resistance always moves first.","blockFormat":"steps"}
    ]$$::jsonb,
    'published',
    NOW() - INTERVAL '3 seconds'
  ),
  (
    'ironveil-movement', 'ironveil', 'page', 'Movement and hiding',
    'Couriers move secretly behind the Resistance screen; their tells become evidence on the public map.',
    $$[
      {"id":"b1","type":"text","value":"Resistance movement","blockFormat":"h2"},
      {"id":"b2","type":"text","value":"Couriers move along the hidden track behind the Resistance screen. Each turn, a cell announces only how many spaces it moved — not where. The Occupation may not look behind the screen.","blockFormat":"prose"},
      {"id":"b3","type":"text","value":"But every move leaves a Trace. Once per turn, the Inspector may demand that the cell place a Trace token on a public-map district adjacent to wherever their courier actually is. If a Trace token is already there, the Inspector may instead place it on the district itself.","blockFormat":"prose"},
      {"id":"b4","type":"text","value":"The Rumor turn","blockFormat":"h3"},
      {"id":"b5","type":"text","value":"After all cells have moved, the Inspector draws a Rumor card and resolves it. Rumors are partial information: \"A courier was seen leaving the Brick District,\" or \"Someone bought three train tickets at Hartloch Station and never used the third.\" Rumors are public; cells may lie about which of them was implicated.","blockFormat":"prose"}
    ]$$::jsonb,
    'published',
    NOW() - INTERVAL '2 seconds'
  ),
  (
    'ironveil-winning', 'ironveil', 'page', 'How the game ends',
    'Either the Resistance executes three Operations, or the Occupation captures four cell members.',
    $$[
      {"id":"b1","type":"text","value":"Victory conditions","blockFormat":"h2"},
      {"id":"b2","type":"text","value":"The game ends — and the side that triggered the ending wins — when one of two things happens.","blockFormat":"prose"},
      {"id":"b3","type":"text","value":"Resistance victory","blockFormat":"h3"},
      {"id":"b4","type":"text","value":"Three Operations are executed. An Operation is executed when its assigned cell brings a courier to its target district and survives the Rumor turn without being identified. Cells may not coordinate openly; they must use the Rumor structure to signal each other.","blockFormat":"prose"},
      {"id":"b5","type":"text","value":"Occupation victory","blockFormat":"h3"},
      {"id":"b6","type":"text","value":"Four cell members are captured. A member is captured when their courier ends a turn on a district containing a Patrol pawn AND a Trace token. The Inspector reveals the cell, removes the pawn, and the rest of that cell's Operation cards are discarded.","blockFormat":"prose"},
      {"id":"b7","type":"text","value":"Endgame mood","blockFormat":"h2"},
      {"id":"b8","type":"text","value":"Ironveil isn't kind to either side. The Resistance loses cells they grew to like; the Occupation realizes how much they didn't see. Most games end with one side holding three Operation cards and the other looking at a row of unrevealed pawns. The game tells you what the city kept.","blockFormat":"prose"}
    ]$$::jsonb,
    'published',
    NOW() - INTERVAL '1 second'
  )
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT id, title, jsonb_array_length(blocks) AS block_count
FROM cards
WHERE game_id = 'ironveil'
ORDER BY created_at ASC;
