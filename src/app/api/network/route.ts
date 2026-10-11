import { discoverAddresses } from "@/lib/network";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return Response.json(
      {
        addresses: discoverAddresses({
          port: url.port,
          protocol: url.protocol,
          publicUrl: process.env.LINGUALOCAL_PUBLIC_URL,
          container: process.env.LINGUALOCAL_CONTAINER === "1",
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Network address lookup failed", error);
    return Response.json(
      {
        error: "Unable to find the school address.",
        code: process.env.LINGUALOCAL_PUBLIC_URL
          ? "configuration"
          : "unavailable",
      },
      { status: 500 },
    );
  }
}
