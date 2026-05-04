import express from "express";
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
    // Always set CORS headers early
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Origin, Accept, Referer, User-Agent, X-Requested-With");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Type");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

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
        method: req.method,
        headers,
        redirect: 'follow'
      });

      // Forward status code (handle 206 for ranges)
      res.status(fetchRes.status);

      // Important for Vercel and other proxies to not buffer the response
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      
      // Copy key headers back to client, but EXCLUDE Access-Control and Content-Length for M3U8
      const headersToCopy = [
        "content-type",
        "content-range",
        "accept-ranges",
        "cache-control",
        "expires",
        "last-modified",
        "etag"
      ];

      // We handle content-length separately for non-m3u8 files
      const contentType = fetchRes.headers.get("content-type") || "";
      const isM3u8 = targetUrl.split('?')[0].toLowerCase().endsWith('.m3u8') || 
                     contentType.includes('mpegurl') || 
                     contentType.includes('application/x-mpegURL');

      fetchRes.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (headersToCopy.includes(lowerKey)) {
          res.setHeader(key, value);
        }
      });

      if (!isM3u8 && fetchRes.headers.has("content-length")) {
        res.setHeader("Content-Length", fetchRes.headers.get("content-length")!);
      }

      if (req.method === "HEAD") {
        res.status(fetchRes.status);
        return res.end();
      }

      if (!fetchRes.ok && fetchRes.status !== 206) {
        const errText = await fetchRes.text();
        return res.status(fetchRes.status).send(errText || `Failed to fetch from target ${fetchRes.status}`);
      }

      if (isM3u8) {
        // Rewritten playlists must be 200
        res.status(200);
        const text = await fetchRes.text();
        
        const lines = text.split(/\r?\n/);
        const rewrittenLines = lines.map(line => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          
          if (trimmed.startsWith('#')) {
            // Rewrite URI in tags like #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA, etc.
            return line.replace(/URI="([^"]+)"/g, (match, uri) => {
              try {
                const abs = new URL(uri, targetUrl).href;
                let proxyUrl = `/api/proxy?url=${encodeURIComponent(abs)}`;
                if (referer) proxyUrl += `&referer=${encodeURIComponent(referer)}`;
                return `URI="${proxyUrl}"`;
              } catch (e) {
                return match;
              }
            });
          }
          
          // Regular line (segment or sub-playlist URL)
          try {
            const abs = new URL(trimmed, targetUrl).href;
            let proxyUrl = `/api/proxy?url=${encodeURIComponent(abs)}`;
            if (referer) proxyUrl += `&referer=${encodeURIComponent(referer)}`;
            return proxyUrl;
          } catch (e) {
            return line;
          }
        });

        const output = rewrittenLines.join('\n');
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Content-Length", Buffer.byteLength(output).toString());
        res.send(output);
      } else {
        if (fetchRes.body) {
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
    const { createServer: createViteServer } = await import("vite");
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

