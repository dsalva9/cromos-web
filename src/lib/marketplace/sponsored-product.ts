export interface SponsoredProduct {
  id: string;
  imageUrl: string;
  rating: number;
  amazonUrl: string;
  titleKey: string;
  taglineKey: string;
  ctaKey: string;
}

export const SPONSORED_PRODUCT_CUBE: SponsoredProduct = {
  id: "sponsored-cube",
  imageUrl: "/assets/amazon_images/cubo.png",
  rating: 4.4,
  amazonUrl: "https://amzn.to/4fll9SB",
  titleKey: "cubeTitle",
  taglineKey: "cubeTagline",
  ctaKey: "ctaTeFaltan"
};

export const SPONSORED_PRODUCT_ALBUM: SponsoredProduct = {
  id: "sponsored-album",
  imageUrl: "/assets/amazon_images/album.png",
  rating: 3.4,
  amazonUrl: "https://amzn.to/4vnjMr9",
  titleKey: "albumTitle",
  taglineKey: "albumTagline",
  ctaKey: "ctaTeFaltan"
};

export const SPONSORED_PRODUCT_BOOK: SponsoredProduct = {
  id: "sponsored-book",
  imageUrl: "/assets/amazon_images/book.jpg",
  rating: 4.8,
  amazonUrl: "https://amzn.to/3QNkf7q",
  titleKey: "bookTitle",
  taglineKey: "bookTagline",
  ctaKey: "ctaBook"
};

