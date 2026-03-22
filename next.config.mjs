import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  workboxOptions: {
    skipWaiting: true,
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lucide-react'],
  webpack: (config) => {
    config.optimization.concatenateModules = false
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', '@supabase/supabase-js', 'resend', 'jsonwebtoken', 'stripe', '@anthropic-ai/sdk', 'twilio'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

export default withPWA(nextConfig)
