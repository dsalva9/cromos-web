import type { BlogArticle } from './types';
import { article1 } from './articles/errores-comunes';
import { article2 } from './articles/cromos-caros-raros';
import { article3 } from './articles/organizar-cromos';
import { article4 } from './articles/evitar-estafas';
import { article5 } from './articles/colecciones-2026';
import { article6 } from './articles/intercambiar-cromos-futbol-ecuador';
import { article7 } from './articles/fundas-protectoras-cromos-coleccionismo';
import { article8 } from './articles/trocar-cromos-panini-portugal';
import { article9 } from './articles/comprar-vender-coleccionar-cromos';
import { article10 } from './articles/cromos-repetidos-oportunidad';
import { article11 } from './articles/conservar-organizar-proteger-coleccion';
import { article12 } from './articles/empezar-coleccion-pokemon';
import { article13 } from './articles/empezar-coleccion-cromos';
import { article14 } from './articles/intercambiar-cromos-completar-coleccion';
import { article15 } from './articles/cartas-coleccionables-miles-aficionados';
import { article16 } from './articles/todo-sobre-colecciones-futbol';

const allArticles: BlogArticle[] = [
  article1,
  article2,
  article3,
  article4,
  article5,
  article6,
  article7,
  article8,
  article9,
  article10,
  article11,
  article12,
  article13,
  article14,
  article15,
  article16,
];

export function getAllArticles(): BlogArticle[] {
  return allArticles.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return allArticles.find(a => a.slug === slug);
}

export function getArticleSlugs(): string[] {
  return allArticles.map(a => a.slug);
}
