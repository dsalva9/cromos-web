export interface SponsoredProduct {
  imageUrl: string;
  rating: number;
  ratingsCount: number;
  amazonUrl: string;
}

export const SPONSORED_PRODUCT: SponsoredProduct = {
  imageUrl: "/assets/ultra-pro-sleeves.png",
  rating: 4.6,
  ratingsCount: 22340,
  amazonUrl: "https://amzn.to/3Rgmd0g"
};
