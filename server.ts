import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

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
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    const referer = req.query.referer as string;

    if (!targetUrl) {
      return res.status(400).send("No target URL specified.");
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      };

      if (referer) {
        headers["Referer"] = referer;
        headers["Origin"] = new URL(referer).origin;
      }
      
      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }

      const fetchRes = await fetch(targetUrl, {
        method: "GET",
        headers
      });

      if (!fetchRes.ok && fetchRes.status !== 206) {
        return res.status(fetchRes.status).send(`Failed to fetch from target ${fetchRes.status}`);
      }

      // Important: allow CORS for our client to read the proxied stream
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent");
      
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
           const { Readable } = await import('stream');
           Readable.fromWeb(fetchRes.body as any).pipe(res);
        } else {
           res.end();
        }
      }
      
    } catch (e: any) {
      console.error(e);
      res.status(500).send("Proxy error: " + e.message);
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
    // Note: Since this is for an AI studio app backend server, we don't necessarily need to implement the dist path exactly unless it builds, but the framework says "esbuild or similar" and "In Express v4, use app.get('*', ...)"
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
