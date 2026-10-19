import { defineConfig } from "tsup";

// Workspace packages are bundled in so the runtime image only needs
// the api's production node_modules (better-sqlite3 stays external).
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  clean: true,
  sourcemap: true,
  noExternal: ["@teamroom/db", "@teamroom/shared"],
});
