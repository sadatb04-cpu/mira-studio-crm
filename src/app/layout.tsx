import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/lib/theme";
import { AuroraBackground } from "@/components/layout/aurora-background";

const LIGHT_THEMES = ["rose-gold", "arctic"];

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var lightThemes = ${JSON.stringify(LIGHT_THEMES)};
    var theme = localStorage.getItem("mira-theme") || "midnight";
    if (lightThemes.indexOf(theme) === -1 && ["midnight","royal-purple","emerald","sapphire","carbon"].indexOf(theme) === -1) {
      theme = "midnight";
    }
    document.documentElement.setAttribute("data-theme", theme);
    if (lightThemes.indexOf(theme) === -1) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mira Operations CRM",
  description: "Operations CRM for order, production, and inventory management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <script
          id="theme-init"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <ThemeProvider>
          <AuroraBackground />
          {children}
          <Toaster position="bottom-right" theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
