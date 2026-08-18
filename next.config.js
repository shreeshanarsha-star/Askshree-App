/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'ws' (a dependency of edge-tts-universal, used for Hey Shree's free
  // voice) does its own WebSocket frame masking with code that breaks when
  // webpack bundles it for the serverless function -- "t.mask is not a
  // function" at runtime. Marking it (and its own parent package) external
  // makes Next.js require() it normally at runtime instead of bundling it.
  experimental: {
    serverComponentsExternalPackages: ['ws', 'edge-tts-universal'],
  },
  async redirects() {
    return [
      {
        source: '/tools/job-posting-ai',
        destination: '/tools/job-postings-ai',
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
