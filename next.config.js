/** @type {import('next').NextConfig} */
const nextConfig = {
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
