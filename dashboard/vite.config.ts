import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackRouter } from "@tanstack/router-plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

declare module "vite" {
  interface UserConfig {
    /**
     * Staged-file checks consumed by `vp staged` (Vite+ pre-commit hook).
     * Not a Vite runtime option; ignored by Vite itself.
     */
    staged?: Record<string, string | Array<string>>;
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact(),
  ],
  staged: {
    "*.{js,ts,tsx,css,json,md,html}": "vp check --fix",
  },
});

export default config;
