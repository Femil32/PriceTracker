import Product from "@/lib/models/product.model";
import { connectToDatabase } from "@/lib/mongoose";
import { generateEmailContent, sendEmail } from "@/lib/nodemailer";
import { scrapeAmazonProduct } from "@/lib/scraper";
import {
  getAveragePrice,
  getEmailNotifType,
  getHighestPrice,
  getLowestPrice,
} from "@/lib/utils";
import { User } from "@/types";
import { NextResponse } from "next/server";

export const maxDuration = 10;
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    connectToDatabase();

    const products = await Product.find({});

    if (!products) throw new Error("No products found");

    // 1. SCRAP LATEST PRODUCTS & UPDATE DB
    const updatedProducts = await Promise.all(
      products.map(async (currProduct) => {
        const scrapProduct = await scrapeAmazonProduct(currProduct.url);

        if (!scrapProduct) throw new Error("No product found");

        const updatedPriceHistory = [
          ...currProduct.priceHistory,
          {
            price: scrapProduct.currentPrice,
          },
        ];

        const product = {
          ...scrapProduct,
          priceHistory: updatedPriceHistory,
          lowestPrice: getLowestPrice(updatedPriceHistory),
          highestPrice: getHighestPrice(updatedPriceHistory),
          averagePrice: getAveragePrice(updatedPriceHistory),
        };

        const updatedProduct = await Product.findOneAndUpdate(
          { url: product.url },
          product
        );

        // 2. SEND EMAILS TO USERS
        const emailNotificationType = getEmailNotifType(
          scrapProduct,
          currProduct
        );

        if (emailNotificationType && updatedProduct.users.length > 0) {
          // send email
          const productsInfo = {
            title: updatedProduct.title,
            url: updatedProduct.url,
          };
          const emailContent = await generateEmailContent(
            productsInfo,
            emailNotificationType
          );
          const userEmails = updatedProduct.users.map(
            (user: User) => user.email
          );

          await sendEmail(emailContent, userEmails);
        }

        return updatedProduct;
      })
    );
    return NextResponse.json({
      message: "Cron job ran successfully",
      data: updatedProducts,
    });
  } catch (error: any) {
    throw new Error(`Error in cron GET: ${error.message}`);
  }
}
