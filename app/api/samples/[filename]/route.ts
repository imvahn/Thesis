import { NextResponse } from "next/server";
import { db } from "@/db";
import { samplesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, { params }: any) {
  const { filename } = await params;

  // Query the sample by name (adjust as needed if using a different identifier)
  const result = await db
    .select()
    .from(samplesTable)
    .where(eq(samplesTable.name, filename));

  if (!result || result.length === 0) {
    return NextResponse.json({ error: "Sample not found" }, { status: 404 });
  }
  const sample = result[0].sample as Buffer;
  return new Response(sample, {
    headers: {
      "Content-Type": "audio/mpeg",
    },
  });
}
