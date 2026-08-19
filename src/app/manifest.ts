import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Givny — give your things a second life",
        short_name: "Givny",
        description:
            "A free community marketplace for passing things on. Find what you need from neighbours nearby, or give something you no longer use a second life.",
        start_url: "/",
        // Opens without browser chrome when installed, but falls back gracefully
        // on platforms that don't support standalone.
        display: "standalone",
        orientation: "portrait",
        background_color: "#FAFAF7", // canvas — matches the app background so the splash doesn't flash white
        theme_color: "#0C3B2E",      // forest — tints the Android status bar
        categories: ["shopping", "lifestyle", "social"],
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            // Separate maskable asset: Android crops to a circle, so this one
            // keeps the leaf well inside the safe zone.
            { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
            { name: "Browse nearby", short_name: "Browse", url: "/explore" },
            { name: "List an item", short_name: "List", url: "/app/add-item" },
        ],
    };
}
