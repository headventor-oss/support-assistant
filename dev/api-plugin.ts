import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

type Handler = (req: IncomingMessage & { body?: unknown; query?: Record<string, string> }, res: ServerResponse & {
  status: (code: number) => ServerResponse & { json: (body: unknown) => void };
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => unknown;
}) => Promise<unknown>;

const routes: Record<string, string> = {
  "/api/chat": "/api/chat.ts",
  "/api/ticket": "/api/ticket.ts",
  "/api/analysis": "/api/analysis.ts",
  "/api/admin/datasets": "/api/admin/datasets.ts",
};

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) return resolve(undefined);
      const raw = Buffer.concat(chunks).toString("utf-8");
      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(err);
        }
      } else {
        resolve(raw);
      }
    });
    req.on("error", reject);
  });
}

function enhanceResponse(res: ServerResponse) {
  const enhanced = res as ServerResponse & {
    status: (code: number) => ServerResponse & { json: (body: unknown) => void };
    json: (body: unknown) => void;
  };
  enhanced.status = (code: number) => {
    res.statusCode = code;
    return enhanced as ServerResponse & { json: (body: unknown) => void };
  };
  enhanced.json = (body: unknown) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };
  return enhanced;
}

export function apiDevPlugin(): Plugin {
  return {
    name: "local-api-dev-server",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] || "";
        const modulePath = routes[url];
        if (!modulePath) return next();

        try {
          const mod = await server.ssrLoadModule(modulePath);
          const handler = mod.default as Handler;

          const body = req.method !== "GET" && req.method !== "HEAD" ? await readBody(req) : undefined;
          const reqWithBody = Object.assign(req, { body, query: {} });
          const enhancedRes = enhanceResponse(res);

          await handler(reqWithBody, enhancedRes as never);
        } catch (err) {
          console.error(`[api] Error handling ${url}:`, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        }
      });
    },
  };
}
