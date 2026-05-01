import { LanguageProvider } from "@/lib/LanguageContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { OfflineProvider } from "@/context/OfflineContext";
import OfflineStatusBar from "@/components/OfflineStatusBar";
import "./globals.css";

export const metadata = {
  title: "Raid",
  description: "Raid - Intelligent Accounting System",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html>
      <body className="antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <OfflineProvider>
              {children}
              <OfflineStatusBar />
            </OfflineProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

