import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` ships a marker `index.js` that throws under the default
      // export condition (and a no-op `empty.js` under the `react-server`
      // condition). Next.js resolves the `react-server` branch at build time;
      // Vitest does not, so it would hit the throw. Map it to the empty file
      // so test files can transitively import server-only modules.
      "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    passWithNoTests: true,
    exclude: ["node_modules", ".next", ".worktrees/**"],
    // Supabase's `createClient` now throws synchronously when given an empty
    // URL, and `app/_lib/supabase-admin.ts` constructs the client at module
    // top. Provide harmless placeholders so any module that transitively
    // imports it can still be unit-tested.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-key",
    },
  },
});
