import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/apiBase";

function buildTargetUrl(pathParts: string[], search: string): string {
  const base = getBackendBaseUrl().replace(/\/+$/, "");
  const joined = pathParts.join("/");
  const target = `${base}/api/v1/image/${joined}`;
  console.log("Target: ", target);

  return `${target}${search || ""}`;
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await ctx.params;
  const targetUrl = buildTargetUrl(path, req.nextUrl.search);
  console.log("TargetURL: ", targetUrl);

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");

  // For multipart uploads, forwarding `req.body` as a stream can be unreliable in some runtimes.
  // Buffering the request body keeps boundaries intact and is more robust for local dev.
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
  const resBody = await res.arrayBuffer();

  return new NextResponse(resBody, {
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
