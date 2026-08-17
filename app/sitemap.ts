import type { MetadataRoute } from 'next';

const publicPaths = [
  '/',
  '/comment-ca-marche',
  '/pricing',
  '/contact',
  '/mentions-legales',
  '/confidentialite',
  '/cookies',
  '/conditions',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://assistant.userv.info').replace(/\/$/, '');
  return publicPaths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'monthly' as const,
    priority: path === '/' ? 1 : 0.4,
  }));
}
