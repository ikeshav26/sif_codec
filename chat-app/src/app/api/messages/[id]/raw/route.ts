import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Message } from "@/models/Message";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const message = await Message.findById(id).select("sifData");

    if (!message || !message.sifData?.sifBase64) {
      return NextResponse.json({ error: "SIF container not found" }, { status: 404 });
    }

    const sifBuffer = Buffer.from(message.sifData.sifBase64, "base64");
    const filename = message.sifData.fileName || `${message.sifData.imageUuid || "container"}.sif`;

    return new NextResponse(sifBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/messages/[id]/raw error:", errorMsg);
    return NextResponse.json(
      { error: "Failed to download SIF container", details: errorMsg },
      { status: 500 }
    );
  }
}
