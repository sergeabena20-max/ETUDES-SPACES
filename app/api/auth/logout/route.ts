import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login?logged_out=1", request.url), 303);
}
