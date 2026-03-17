import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/apiBase";

function buildTargetUrl(pathParts: string[], search: string): string {
  const base = getBackendBaseUrl().replace(/\/+$/, "");
  const joined = pathParts.join("/");
  const target = `${base}/video/${joined}`;

  return `${target}${search || ""}`;
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await ctx.params;
  const targetUrl = buildTargetUrl(path, req.nextUrl.search);

  console.log("[frontend-proxy][video] incoming request", {
    method: req.method,
    targetUrl,
    contentType: req.headers.get("content-type"),
    contentLength: req.headers.get("content-length"),
  });

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  const res = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    cache: "no-store",
  });

  const contentType =
    res.headers.get("content-type") || "application/octet-stream";
  const responseText = await res.text();

  console.log("[frontend-proxy][video] backend response", {
    targetUrl,
    status: res.status,
    ok: res.ok,
    bodyPreview: responseText.slice(0, 500),
  });

  return new NextResponse(responseText, {
    status: res.status,
    headers: {
      "content-type": contentType,
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  return proxy(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  return proxy(req, ctx);
}
