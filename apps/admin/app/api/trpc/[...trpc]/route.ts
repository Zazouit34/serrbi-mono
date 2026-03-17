import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL!;
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN!;

async function proxy(req: NextRequest) {
  const jwt = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!jwt || jwt.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { pathname, search } = new URL(req.url);
  const target = `${WEB_URL}${pathname}${search}`;

  const headers = new Headers();
  headers.set("Content-Type", req.headers.get("Content-Type") || "application/json");
  headers.set("x-admin-token", ADMIN_TOKEN);

  const body = req.method !== "GET" && req.method !== "HEAD" ? await req.arrayBuffer() : undefined;

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
}

export const GET = proxy;
export const POST = proxy;
