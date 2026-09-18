import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };

createServer((request, response) => {
  const path = request.url === "/" ? "/dashboard/index.html" : request.url;
  const file = resolve(root, `.${path}`);
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404); response.end("Not found"); return;
  }
  response.writeHead(200, { "Content-Type": types[extname(file)] ?? "text/plain" });
  createReadStream(file).pipe(response);
}).listen(4173, "127.0.0.1", () => console.log("Continuum dashboard: http://localhost:4173"));
