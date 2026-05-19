export interface SponsoredProduct {
  imageUrl: string;
  price: string;
  rating: number;
  amazonUrl: string;
}

export const SPONSORED_PRODUCT: SponsoredProduct = {
  imageUrl: "https://images-na.ssl-images-amazon.com/images/I/71N7e6lE-tL._AC_SL1500_.jpg",
  price: "9,99 €",
  rating: 5,
  amazonUrl: "https://amzn.to/3Rgmd0g"
};
