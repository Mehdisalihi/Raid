'use client';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("GLOBAL CRASH:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '20px', backgroundColor: '#ffecec', color: 'red' }}>
          <h2>Global Application Error</h2>
          <pre>{error.message}</pre>
          <pre style={{ fontSize: '10px' }}>{error.stack}</pre>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
