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

      const fetchRes = await fetch(targetUrl, {
        method: "GET",
        headers
      });

      if (!fetchRes.ok && fetchRes.status !== 206) {
        return res.status(fetchRes.status).send(`Failed to fetch from target ${fetchRes.status}`);
      }

      // Important for Vercel and other proxies to not buffer the response
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      
      // Copy over Accept-Ranges and Content-Range if present
      if (fetchRes.headers.has("accept-ranges")) {
        res.setHeader("Accept-Ranges", fetchRes.headers.get("accept-ranges")!);
      }
      if (fetchRes.headers.has("content-range")) {
        res.setHeader("Content-Range", fetchRes.headers.get("content-range")!);
      }
      if (fetchRes.headers.has("content-length")) {
        res.setHeader("Content-Length", fetchRes.headers.get("content-length")!);
      }

      // Pass along the content type (e.g., application/vnd.apple.mpegurl or video/MP2T)
      const contentType = fetchRes.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      res.status(fetchRes.status);
      
      const isM3u8 = targetUrl.includes('.m3u8') || (contentType && contentType.includes('mpegurl'));
      if (isM3u8) {
        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let text = buffer.toString('utf-8');
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        
        // Rewrite lines that aren't # or http to use the proxy
        text = text.replace(/^(?!#|http)(.+)$/gm, (match) => {
            const absoluteUrl = match.startsWith('/') 
                ? new URL(targetUrl).origin + match
                : baseUrl + match;
            return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
        });

        // Rewrite lines that are completely absolute http to wrap in proxy (for segments)
        text = text.replace(/^(http.+)$/gm, (match) => {
            return `/api/proxy?url=${encodeURIComponent(match)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
        });

        // Rewrite EXT-X URIs
        text = text.replace(/URI="([^"]+)"/g, (match, uri) => {
            const absoluteUrl = uri.startsWith('http') 
              ? uri 
              : (uri.startsWith('/') ? new URL(targetUrl).origin + uri : baseUrl + uri);
            return `URI="/api/proxy?url=${encodeURIComponent(absoluteUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}"`;
        });

        res.send(text);
      } else {
        if (fetchRes.body) {
           Readable.fromWeb(fetchRes.body as any).pipe(res);
        } else {
           res.end();
        }
      }
      
    } catch (e: any) {
      console.error(e);
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

const serverAppPromise = startServer();
export default serverAppPromise; // Vercel can handle async exports or we can export the promise

