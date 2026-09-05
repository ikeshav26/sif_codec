import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Message } from "@/models/Message";
import { verifySifContainerZeroDb } from "@/lib/sifVerifier";

export async function GET() {
  try {
    await connectToDatabase();
    const messages = await Message.find({}).sort({ createdAt: 1 }).limit(100);
    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json(
      { error: "Failed to fetch messages", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const formData = await req.formData();

    const senderName = (formData.get("senderName") as string) || "Anonymous";
    const senderEmail = (formData.get("senderEmail") as string) || "anonymous@chat.local";
    const content = (formData.get("content") as string) || "";
    const sifFile = formData.get("sifFile") as File | null;

    let isSif = false;
    let sifData = undefined;

    if (sifFile && sifFile.size > 0) {
      const arrayBuffer = await sifFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Perform Zero-DB SIF container verification
      const verification = verifySifContainerZeroDb(buffer, senderEmail);

      if (!verification.isValidContainer) {
        return NextResponse.json(
          { error: "Invalid SIF container binary", details: verification.error },
          { status: 400 }
        );
      }

      isSif = true;
      sifData = {
        fileName: sifFile.name,
        imageUuid: verification.header?.imageUuid || "",
        ownerIdHash: verification.header?.ownerIdHash || "",
        cipherSuite: verification.header?.cipherSuite || 1,
        payloadLength: verification.header?.payloadLength || buffer.length,
        sifVerified: verification.isOwner,
        sifBase64: buffer.toString("base64"),
      };
    }

    const newMessage = await Message.create({
      senderName,
      senderEmail,
      content,
      isSif,
      sifData,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/messages error:", err);
    return NextResponse.json(
      { error: "Failed to create message", details: err.message },
      { status: 500 }
    );
  }
}
