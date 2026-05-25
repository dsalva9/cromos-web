export interface SponsoredProduct {
  imageUrl: string;
  rating: number;
  amazonUrl: string;
}

export const SPONSORED_PRODUCT: SponsoredProduct = {
  imageUrl: "/assets/sponsored-banner.jpg",
  rating: 4.6,
  amazonUrl: "https://amzn.to/3Rgmd0g"
};
