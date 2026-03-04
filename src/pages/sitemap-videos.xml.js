// src/pages/sitemap-videos.xml.js
import { youtubeCache, initApp } from "@/lib/youtube";
import { buildTime } from "@/utils/time";

function createUrl(
	url,
	lastModified = buildTime,
	priority = 0.6,
	changeFreq = "monthly"
) {
	return `
    <url>
      <loc>${url}</loc>
      <lastmod>${lastModified}</lastmod>
      <changefreq>${changeFreq}</changefreq>
      <priority>${priority}</priority>
    </url>
    `;
}

export async function GET() {
	try {
		if (youtubeCache.channels.length === 0) initApp();

		const dominio = "https://elisawaves.es/";

		let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

		// VIDEOS (limitados a 1000 más recientes)
		const recentVideos = youtubeCache.videos.slice(0, 1000);
		for (const video of recentVideos) {
			sitemapContent += createUrl(`${dominio}media/video/${video.id}`, buildTime, 0.6, "monthly");
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
