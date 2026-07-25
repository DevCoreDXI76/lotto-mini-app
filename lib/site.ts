import type { Metadata } from 'next';

export const SITE_NAME = '로또랩';
export const SITE_URL = 'https://lottolab.coredxi.com';

export function pageMetadata(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
  };
}
