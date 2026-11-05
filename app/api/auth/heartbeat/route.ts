import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const active = await refreshSession();
    if (!active) {
      return NextResponse.json({ ok: false, error: "Session expirée." }, { status: 401 });
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("session_heartbeat_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
