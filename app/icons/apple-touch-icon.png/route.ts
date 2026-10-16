import { generatePwaIcon } from "@/lib/pwa-icon";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  return new Response(new Uint8Array(generatePwaIcon(180)), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
