export interface SponsoredProduct {
  imageUrl: string;
  price: string;
  rating: number;
  amazonUrl: string;
}

export const SPONSORED_PRODUCT: SponsoredProduct = {
  imageUrl: "/assets/ultra-pro-sleeves.png",
  price: "2,49 €",
  rating: 5,
  amazonUrl: "https://amzn.to/3Rgmd0g"
};
