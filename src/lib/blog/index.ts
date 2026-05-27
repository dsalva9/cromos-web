import type { BlogArticle } from './types';
import { article1 } from './articles/errores-comunes';
import { article2 } from './articles/cromos-caros-raros';
import { article3 } from './articles/organizar-cromos';
import { article4 } from './articles/evitar-estafas';
import { article5 } from './articles/colecciones-2026';
import { article6 } from './articles/intercambiar-cromos-futbol-ecuador';
import { article7 } from './articles/fundas-protectoras-cromos-coleccionismo';
import { article8 } from './articles/trocar-cromos-panini-portugal';

const allArticles: BlogArticle[] = [
  article1,
  article2,
  article3,
  article4,
  article5,
  article6,
  article7,
  article8
];

export function getAllArticles(): BlogArticle[] {
  return allArticles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return allArticles.find((a) => a.slug === slug);
}

export function getArticleSlugs(): string[] {
  return allArticles.map((a) => a.slug);
}
