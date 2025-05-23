// src/pages/sitemap.xml.js
import { channelsConst } from "@/constants/channels";
import { getAllPlaylists } from "@/lib/youtube";
import { buildTime } from "@/utils/time";

function createUrl(
	url,
	lastModified = buildTime,
	priority = 1.0,
) {
	return `
    <url>
      <loc>${url}</loc>
      <lastmod>${lastModified}</lastmod>
      <priority>${priority}</priority>
    </url>
    `;
}

export async function GET() {
	try {
		const dominio = "https://elisawaves.es/";

		// Genera el contenido del sitemap
		let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

		// PÁGINAS ESTÁTICAS
		sitemapContent += createUrl(dominio);
		// sitemapContent += createUrl(`${dominio}about`);
		// sitemapContent += createUrl(`${dominio}explore`);
		// sitemapContent += createUrl(`${dominio}you`);

		// PÁGINAS DINÁMICAS

		// CHANNELS
		for (const channel of channelsConst) {
			sitemapContent += createUrl(`${dominio}media/channel/${channel.tag}`);
		}

		// PLAYLISTS
		const playlists = await getAllPlaylists();

		for (const playlist of playlists) {
			sitemapContent += createUrl(`${dominio}media/playlist/${playlist.id}`);
		}

		sitemapContent += "</urlset>";

		return new Response(sitemapContent, {
			headers: {
				"Content-Type": "application/xml",
				"Cache-Control": "public, max-age=0, must-revalidate",
			},
		});
	} catch (error) {
		return new Response(`Error generando sitemap: ${error.message}`, {
			status: 500,
			headers: {
				"Content-Type": "text/plain",
			},
		});
	}
}
