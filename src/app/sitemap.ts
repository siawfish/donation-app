import type { MetadataRoute } from "next";
import { listPublishedPosts } from "@/app/app/actions/blog";
import { listOpenJobs } from "@/app/app/actions/jobs";
import { listActiveOrgs } from "@/app/app/actions/organisations";
import { listListingsForSitemap } from "@/app/app/actions/items";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

/**
 * Only public, indexable pages belong here. Anything behind /app is signed-in
 * and listing it would just spend crawl budget on redirects to the login page.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = siteUrl();
    const now = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
        { url: `${base}/explore`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
        { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
        { url: `${base}/careers`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
        { url: `${base}/for-organisations`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
        { url: `${base}/organisations`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
        { url: `${base}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
        { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
        { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
        { url: `${base}/team`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
        { url: `${base}/terms-of-use`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    ];

    const [posts, jobs, orgs, listings] = await Promise.all([
        listPublishedPosts(),
        listOpenJobs(),
        listActiveOrgs(),
        listListingsForSitemap(),
    ]);

    const postPages: MetadataRoute.Sitemap = posts
        // A post marked noindex should not be advertised in the sitemap either.
        .map((p) => ({
            url: `${base}/blog/${p.slug}`,
            lastModified: new Date(p.updatedAt),
            changeFrequency: "monthly" as const,
            priority: 0.7,
        }));

    const jobPages: MetadataRoute.Sitemap = jobs.map((j) => ({
        url: `${base}/careers/${j.slug}`,
        lastModified: new Date(j.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.6,
    }));

    const orgPages: MetadataRoute.Sitemap = orgs.map((o) => ({
        url: `${base}/o/${o.slug}`,
        lastModified: new Date(o.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.6,
    }));

    // Only listings that are still available. A taken one is noindex on the
    // page itself, so advertising it here would contradict that.
    const listingPages: MetadataRoute.Sitemap = listings.map((l) => ({
        url: `${base}/listing/${l.id}`,
        lastModified: new Date(l.updatedAt),
        changeFrequency: "daily" as const,
        priority: 0.5,
    }));

    return [...staticPages, ...postPages, ...jobPages, ...orgPages, ...listingPages];
}
