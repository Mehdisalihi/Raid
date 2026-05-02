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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

