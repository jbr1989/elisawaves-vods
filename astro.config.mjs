// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://elisawaves.es",
  vite: {
      plugins: [tailwindcss()],
	},
  output: "server",
  adapter: vercel(),
});