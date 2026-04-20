export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json(
    {
      ok: true,
      service: "webp-lab",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
