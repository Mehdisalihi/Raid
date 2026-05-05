/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ["lucide-react", "framer-motion"],
    images: {
        unoptimized: true
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
