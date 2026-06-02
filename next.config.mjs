/** @type {import('next').NextConfig} */
const nextConfig = {
    // Strict mode for catching bugs early
    reactStrictMode: true,

    // Compiler optimisations
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },

    // Image optimisation
    images: {
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
        minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                port: '',
            },
        ],
    },

    // Experimental: faster builds + turbo
    experimental: {
        optimizePackageImports: ['lucide-react', 'firebase', '@firebase/firestore'],
    },
};

export default nextConfig;
