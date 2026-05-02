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

              // Scroll Booster for snappy desktop experience
              (function() {
                let isTouch = false;
                window.addEventListener('touchstart', function() { isTouch = true; }, {passive: true});
                
                window.addEventListener('wheel', function(e) {
                  if (isTouch) return;
                  if (e.ctrlKey) return; // Allow zooming
                  
                  const speed = 1.6; // Boost speed by 60%
                  const delta = e.deltaY;
                  
                  if (delta !== 0) {
                    // Smooth but fast manual scroll
                    window.scrollBy({
                      top: delta * speed,
                      behavior: 'auto'
                    });
                    // Optimization: stop native scroll if we handle it
                    // e.preventDefault(); 
                  }
                }, { passive: true });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}

