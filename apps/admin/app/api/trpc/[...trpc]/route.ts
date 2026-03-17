import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

async function proxy(req: NextRequest) {
  const webUrl = (process.env.NEXT_PUBLIC_WEB_URL || "").replace(/\/+$/, "");
  const adminToken = process.env.ADMIN_API_TOKEN || "";

  const jwt = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!jwt || jwt.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!webUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_WEB_URL is not configured" },
      { status: 500 },
    );
  }

  const { pathname, search } = new URL(req.url);
  const target = `${webUrl}${pathname}${search}`;

  const headers = new Headers();
  headers.set("Content-Type", req.headers.get("Content-Type") || "application/json");
  headers.set("x-admin-token", adminToken);

  try {
    const body =
      req.method !== "GET" && req.method !== "HEAD"
        ? await req.arrayBuffer()
        : undefined;

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err: any) {
    console.error("[admin-proxy] upstream error:", err?.message);
    return NextResponse.json(
      { error: `Proxy error: ${err?.message || "unknown"}` },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
