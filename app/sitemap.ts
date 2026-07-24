import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import fullHistory from '@/data/lotto-full-history.json';
import type { LottoDraw } from '@/lib/lotto/types';

const routes = ['', '/generator', '/stats', '/stores', '/result', '/privacy'];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const history = fullHistory as LottoDraw[];

  const staticEntries = routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : route === '/privacy' ? 0.3 : 0.8,
  }));

  const resultEntries = history.map((draw) => ({
    url: `${SITE_URL}/result/${draw.drawNumber}`,
    lastModified: new Date(draw.date),
    changeFrequency: 'never' as const,
    priority: 0.5,
  }));

  return [...staticEntries, ...resultEntries];
}
