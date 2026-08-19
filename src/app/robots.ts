import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                // Everything under /app needs a session, and /auth pages have
                // nothing to index. Crawling them wastes budget on redirects.
                disallow: ["/app/", "/auth/", "/api/", "/suspended"],
            },
        ],
        sitemap: `${siteUrl()}/sitemap.xml`,
        host: siteUrl(),
    };
}
