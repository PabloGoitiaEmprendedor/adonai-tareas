const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "dist");
const port = Number(process.env.PORT || 5173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  fs.createReadStream(filePath).pipe(res);
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const candidate = path.join(root, urlPath === "/" ? "index.html" : urlPath);

    fs.stat(candidate, (err, stats) => {
      if (!err && stats.isFile()) {
        return sendFile(res, candidate);
      }

      const fallback = path.join(root, "index.html");
      fs.stat(fallback, (fallbackErr, fallbackStats) => {
        if (!fallbackErr && fallbackStats.isFile()) {
          return sendFile(res, fallback);
        }

        res.writeHead(404, {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        });
        res.end("dist/index.html not found");
      });
    });
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Serving ${root} on http://localhost:${port}`);
  });
