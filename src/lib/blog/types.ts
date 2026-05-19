export type BlogArticleContent = {
  title: string;
  summary: string;
  body: string;
};

export type BlogArticle = {
  slug: string;
  publishedAt: string;
  author: string;
  coverImage?: string;
  content: {
    es: BlogArticleContent;
    en: BlogArticleContent;
    pt: BlogArticleContent;
  };
};
