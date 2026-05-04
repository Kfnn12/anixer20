import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Enable CORS for all API routes
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Authorization, Range, Referer, User-Agent");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Agenda route (to bypass adblockers blocking "/schedule")
  app.get("/api/agenda", async (req, res) => {
    const date = req.query.date as string;
    if (!date) return res.status(400).send("No date specified.");
    try {
      const fetchRes = await fetch(`https://xerv2.vercel.app/api/v2/animekai/schedule?date=${date}`);
      if (!fetchRes.ok) return res.status(fetchRes.status).send(`Failed to fetch`);
      const data = await fetchRes.json();
      res.json(data);
    } catch (e) {
      res.status(500).send(String(e));
    }
  });

  // Proxy route
  app.all("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    const referer = req.query.referer as string;

    if (!targetUrl) {
      return res.status(400).send("No target URL specified.");
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive"
      };

      if (referer) {
        headers["Referer"] = referer;
        try {
          headers["Origin"] = new URL(referer).origin;
        } catch (e) {
          // ignore invalid referer for origin
        }
      }
      
      if (req.headers.range) {
        headers["Range"] = req.headers.range as string;
      }

      // Avoid double encoding if the URL is already encoded or has weird characters
      const fetchRes = await fetch(targetUrl, {
        method: "GET",
        headers,
        redirect: 'follow'
      });

      if (!fetchRes.ok && fetchRes.status !== 206) {
        return res.status(fetchRes.status).send(`Failed to fetch from target ${fetchRes.status}`);
      }

      // Important for Vercel and other proxies to not buffer the response
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Access-Control-Allow-Origin", "*");
      
      // Copy key headers back to client
      const headersToCopy = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "cache-control",
        "access-control-allow-origin",
        "access-control-allow-headers",
        "access-control-expose-headers"
      ];

      fetchRes.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (headersToCopy.includes(lowerKey)) {
          res.setHeader(key, value);
        }
      });

      // Always ensure CORS is open for our proxy
      res.setHeader("Access-Control-Allow-Origin", "*");

      res.status(fetchRes.status);
      
      const contentType = fetchRes.headers.get("content-type") || "";
      const isM3u8 = targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL');

      if (isM3u8) {
        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let text = buffer.toString('utf-8');
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        
        const lines = text.split(/\r?\n/);
        const rewrittenLines = lines.map(line => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          
          if (trimmed.startsWith('#')) {
            // Rewrite URI in tags like #EXT-X-KEY:METHOD=AES-128,URI="...",...
            return line.replace(/URI="([^"]+)"/g, (match, uri) => {
              const abs = uri.startsWith('http') ? uri : (uri.startsWith('/') ? new URL(targetUrl).origin + uri : baseUrl + uri);
              return `URI="/api/proxy?url=${encodeURIComponent(abs)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}"`;
            });
          }
          
          const abs = trimmed.startsWith('http') ? trimmed : (trimmed.startsWith('/') ? new URL(targetUrl).origin + trimmed : baseUrl + trimmed);
          return `/api/proxy?url=${encodeURIComponent(abs)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
        });

        res.send(rewrittenLines.join('\n'));
      } else {
        if (fetchRes.body) {
           // For large segments, Vercel might have issues if we don't stream correctly
           const nodeBody = Readable.fromWeb(fetchRes.body as any);
           nodeBody.pipe(res);
           
           nodeBody.on('error', (err) => {
             console.error('Proxy stream error:', err);
             if (!res.headersSent) res.status(500).end();
             else res.end();
           });
        } else {
           res.end();
        }
      }
      
    } catch (e: any) {
      console.error('Proxy overall error:', e);
      if (!res.headersSent) {
        res.status(500).send("Proxy error: " + e.message);
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen on port if not running in a serverless environment like Vercel
  // Vercel handles the listening part themselves if we export the app
  if (process.env.AIS_ENV || process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

const app = await startServer();
export default app;

