/**
 * Development utility endpoint to clear all caches
 * Only works in development mode
 *
 * GET /api/dev/clear-cache
 */

import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head>
  <title>Clear Cache</title>
  <style>
    body {
      font-family: system-ui;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
    }
    button {
      background: #0070f3;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 6px;
      cursor: pointer;
    }
    button:hover {
      background: #0051cc;
    }
    #output {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>🧹 Clear Browser Cache</h1>
  <p>This will clear IndexedDB, localStorage, and sessionStorage, then reload the page.</p>
  <button onclick="clearAllCaches()">Clear All Caches & Reload</button>
  <div id="output"></div>

  <script>
    async function clearAllCaches() {
      const output = document.getElementById('output');
      output.textContent = 'Clearing caches...\\n\\n';

      try {
        // Clear IndexedDB
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          output.textContent += \`✅ Deleting IndexedDB: \${db.name}\\n\`;
          indexedDB.deleteDatabase(db.name);
        }
      } catch (e) {
        output.textContent += \`❌ Error clearing IndexedDB: \${e}\\n\`;
      }

      // Clear localStorage
      const localStorageKeys = Object.keys(localStorage);
      localStorage.clear();
      output.textContent += \`✅ Cleared localStorage (\${localStorageKeys.length} keys)\\n\`;

      // Clear sessionStorage
      const sessionStorageKeys = Object.keys(sessionStorage);
      sessionStorage.clear();
      output.textContent += \`✅ Cleared sessionStorage (\${sessionStorageKeys.length} keys)\\n\`;

      // Clear Service Worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          output.textContent += \`✅ Deleted cache: \${cacheName}\\n\`;
        }
      }

      output.textContent += '\\n✨ All caches cleared!\\n';
      output.textContent += '🔄 Reloading in 2 seconds...\\n';

      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  </script>
</body>
</html>`,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}
