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

              // Scroll Booster for snappy desktop experience (Global & Sidebar)
              (function() {
                let isTouch = false;
                window.addEventListener('touchstart', function() { isTouch = true; }, {passive: true});
                
                window.addEventListener('wheel', function(e) {
                  if (isTouch) return;
                  if (e.ctrlKey) return; 
                  
                  const speed = 2.0; // 2x speed for ultra-snappy feel
                  const delta = e.deltaY;
                  
                  if (delta === 0) return;

                  // Find the actual scrollable element under the cursor
                  let target = e.target;
                  while (target && target !== document.documentElement) {
                    const style = window.getComputedStyle(target);
                    const overflow = style.overflowY || style.overflow;
                    const isScrollable = overflow === 'auto' || overflow === 'scroll';
                    const canScroll = target.scrollHeight > target.clientHeight;
                    
                    if (isScrollable && canScroll) {
                      // Check if we are at the boundaries to allow propagation
                      const isAtTop = target.scrollTop <= 0 && delta < 0;
                      const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight && delta > 0;
                      
                      if (!isAtTop && !isAtBottom) {
                        e.preventDefault();
                        target.scrollBy({
                          top: delta * speed,
                          behavior: 'auto'
                        });
                        return;
                      }
                      break; // Let it bubble to window if at boundary
                    }
                    target = target.parentElement;
                  }
                  
                  // Default window scroll
                  // No preventDefault here to keep it natural but we can boost it if needed
                  // window.scrollBy({ top: delta * speed, behavior: 'auto' });
                }, { passive: false });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}

