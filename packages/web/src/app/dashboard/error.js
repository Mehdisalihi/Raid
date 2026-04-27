'use client';
import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error("DASHBOARD CRASH:", error);
  }, [error]);

  return (
    <div className="p-10 m-10 bg-red-50 border-2 border-red-500 rounded-xl">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
      <pre className="text-sm bg-white p-4 rounded border text-red-500 overflow-auto">{error.message}</pre>
      <pre className="text-xs bg-white p-4 rounded border text-gray-500 overflow-auto mt-2">{error.stack}</pre>
      <button onClick={() => reset()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">Try again</button>
    </div>
  );
}
