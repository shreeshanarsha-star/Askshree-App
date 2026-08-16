// Native Next.js robots.txt -- served at /robots.txt. Explicitly allows
// /jobs (needs to be crawlable for Google for Jobs) and points crawlers at
// the sitemap; leaves everything else open by default since the site's real
// access control is the site-key gate on tool pages/APIs, not robots.txt.
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://askshree.com/sitemap.xml',
  };
}
