/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "pixeocommerce.com" },
      { protocol: "https", hostname: "**.pixeocommerce.com" },
    ],
  },
};

export default nextConfig;
