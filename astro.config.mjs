// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import vercel from "@astrojs/vercel";
import path from "path";

// https://astro.build/config
export default defineConfig({
  site: "https://elisawaves.es",
  vite: {
      plugins: [tailwindcss()],
      resolve: {
          alias: {
              "@": path.resolve("./src"),
          },
      },
	},
  output: "server",
  adapter: vercel(),
});