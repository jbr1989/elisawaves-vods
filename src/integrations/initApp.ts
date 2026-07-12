import type { AstroIntegration } from "astro";
import { setYoutubeApiKey, initApp } from "../lib/youtube";

// Cargar .env si la API key no está ya presente (dev y build local).
// En producción (Vercel) la key ya está en process.env y dotenv no se importa
// (es devDependency y no está disponible en runtime serverless).
if (!process.env.YOUTUBE_API_KEY) {
	await import("dotenv").then((dotenv) => dotenv.config());
}

export function initAppIntegration(): AstroIntegration {
	let initialized = false;

	return {
		name: "init-app-integration",
		hooks: {
			/**
			 * Se ejecuta durante `astro build`. Genera youtube-cache.json fresco
			 * antes de que Vite lo importe como módulo en el bundle serverless.
			 */
			"astro:config:setup": async ({ command }) => {
				if (command !== "build") return;

				setYoutubeApiKey(process.env.YOUTUBE_API_KEY || "");
				await initApp();
				console.log("📦 JSON de caché generado durante build");
			},
			/**
			 * Se ejecuta al iniciar el servidor (dev / preview / server).
			 * En entornos serverless puede ejecutarse más de una vez (cold starts).
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