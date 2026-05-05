export async function POST(req: Request) {
  const auth = req.headers.get("authorization");

  if (auth !== "Bearer dev-secret") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  console.log("Intradark CS2 EVENT:", JSON.stringify(body, null, 2));

  return Response.json({ ok: true });
}
