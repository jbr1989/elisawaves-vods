import type { AstroIntegration } from "astro";
import { setYoutubeApiKey, initApp } from "../lib/youtube";

// Solo cargar dotenv en desarrollo

if (process.env.NODE_ENV === "development") {
  await import("dotenv").then((dotenv) => dotenv.config());
}


export function initAppIntegration(): AstroIntegration {
    let initialized = false;

  return {
    name: "init-app-integration",
    hooks: {
        /**
       * Se ejecuta al iniciar el servidor (dev / preview / server)
       * En entornos serverless puede ejecutarse más de una vez (cold starts)
       */
      "astro:server:setup": async () => {
        if (initialized) return;
        initialized = true;

        console.log("🚀 App inicializada desde integración externa");
        setYoutubeApiKey(process.env.YOUTUBE_API_KEY || "");
        await initApp();
      },
    },
  };
}

