import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/_lib/api-auth";

// Use the internal lib path to avoid pdf-parse loading a test PDF at module
// evaluation time (which causes Next.js build to fail with ENOENT).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;

const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  // 1. Auth
  const user = await getRequestUser(request);
  if (!user) {
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
    return NextResponse.json({ error: "PDF exceeds 50MB limit" }, { status: 413 });
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

  // 4. Return extracted text — caller is responsible for calling /parse
  return NextResponse.json({ text });
}
