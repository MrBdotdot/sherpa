import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// pdf-parse v1.1.1 is CommonJS with a default function export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB

function cookiesFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=");
    return { name: name.trim(), value: rest.join("=") };
  });
}

export async function POST(request: Request) {
  // 1. Auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => cookiesFromRequest(request),
        setAll: () => {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const gameId = formData.get("gameId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (typeof gameId !== "string") {
    return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF exceeds 20MB limit" }, { status: 413 });
  }

  // 3. Extract text
  let text: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);
    text = result.text;
  } catch (err) {
    console.error("[import/rulebook/pdf] pdf-parse error:", err);
    return NextResponse.json({ error: "Could not read PDF" }, { status: 422 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "PDF contains no extractable text" }, { status: 422 });
  }

  // 4. Forward to text route
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const forwardRes = await fetch(`${baseUrl}/api/import/rulebook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ text, gameId }),
  });

  const data = await forwardRes.json();
  return NextResponse.json(data, { status: forwardRes.status });
}
