import { Nunito, Fraunces } from "next/font/google";

/** UI + brand accents — friendly rounded sans (craft / DIY feel) */
export const brandSans = Nunito({
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-brand-sans",
  display: "swap",
});

/** Hero titles — soft display serif (not competing with logo lettering) */
export const heroSerif = Fraunces({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-hero-serif",
  display: "swap",
});
