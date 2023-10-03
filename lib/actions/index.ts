"use server";

import { revalidatePath } from "next/cache";
import Product from "../models/product.model";
import { connectToDatabase } from "../mongoose";
import { scrapeAmazonProduct } from "../scraper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";
import { Product as ProductType, User } from "@/types";
import { generateEmailContent, sendEmail } from "../nodemailer";

export const scrapAndStoreProducts = async (url: string) => {
  if (!url) return;

  try {
    connectToDatabase();

    const scrapedProduct = await scrapeAmazonProduct(url);

    if (!scrapedProduct) return;

    let product = scrapedProduct;

    const existingProduct = await Product.findOne({ url: scrapedProduct.url });

    if (existingProduct) {
      const updatedPriceHistory: any = [
        ...existingProduct.priceHistory,
        { price: scrapedProduct.currentPrice },
      ];

      product = {
        ...scrapedProduct,
        priceHistory: updatedPriceHistory,
        lowestPrice: getLowestPrice(updatedPriceHistory),
        highestPrice: getHighestPrice(updatedPriceHistory),
        averagePrice: getAveragePrice(updatedPriceHistory),
      };
    }

    const newProduct = await Product.findOneAndUpdate(
      { url: scrapedProduct.url },
      product,
      { upsert: true, new: true }
    );

    revalidatePath(`/products/${newProduct._id}`);
  } catch (error: any) {
    throw new Error(`Failed to create/update product: ${error.message}`);
  }
};

export const getProductById = async (
  producId: string
): Promise<ProductType | null> => {
  try {
    connectToDatabase();

    const product = await Product.findById({ _id: producId });
    if (!product) return null;
    return product;
  } catch (error: any) {
    throw new Error(`Failed to get product: ${error.message}`);
  }
};

export const getAllProducts = async (): Promise<ProductType[] | null> => {
  try {
    connectToDatabase();

    const products = await Product.find({}).sort({ createdAt: -1 });
    if (!products) return null;
    return products;
  } catch (error: any) {
    throw new Error(`Failed to get products: ${error.message}`);
  }
};

export const getSimilarProducts = async (
  productId: string
): Promise<ProductType[] | null> => {
  try {
    connectToDatabase();

    const currentProduct = await Product.findById({ _id: productId });
    if (!currentProduct) return null;

    const similarProducts = await Product.find({
      _id: { $ne: productId },
      // category: currentProduct.category,
    }).limit(3);

    if (!similarProducts) return null;
    return similarProducts;
  } catch (error: any) {
    throw new Error(`Failed to get similar products: ${error.message}`);
  }
};

export const addUserEmailToProduct = async (
  productId: string,
  userEmail: string
) => {
  try {
    connectToDatabase();
    const product = await Product.findById({ _id: productId });
    if (!product) return null;
    const userExists = product.users.some(
      (user: User) => user.email === userEmail
    );

    if (!userExists) {
      product.users.push({ email: userEmail });
      await product.save();

      const emailContent = await generateEmailContent(product, "WELCOME");

      await sendEmail(emailContent, [userEmail]);
    }
  } catch (error: any) {
    throw new Error(`Failed to add user email to product: ${error.message}`);
  }
};
