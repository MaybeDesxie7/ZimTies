import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "unkfwiomqiulgeffypoz.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
    domains: ['placehold.co', 'unkfwiomqiulgeffypoz.supabase.co'],
  },
};

export default nextConfig;