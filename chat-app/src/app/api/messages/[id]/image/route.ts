import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Message } from "@/models/Message";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { decodeSif } = require("@sif/node");

const masterKekHex =
  process.env.SIF_MASTER_KEK ||
  "fbf58ec94f041762044a8d8bbabc05b51c658bbdaf4a01fd13cc12fd31459a7b";
const MASTER_KEK = Buffer.from(masterKekHex, "hex");
const SIF_AUTHORITY_PUBLIC_KEY =
  process.env.SIF_AUTHORITY_PUBLIC_KEY ||
  "8426916a2fa914070eedccb404b78bf868670b6ad00bfcb36ba38726c1819b41";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const message = await Message.findById(id);

    if (!message || !message.isSif || !message.sifData?.sifBase64) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Security provenance gate:
    // Only verified / approved containers can be decrypted and viewed!
    const isVerified =
      message.sifData.verificationStatus === "VERIFIED" ||
      message.sifData.sifVerified === true;

    if (!isVerified) {
      return NextResponse.json(
        {
          error: "Decryption Forbidden",
          details:
            "This SIF container is pending owner authorization and cannot be decrypted.",
        },
        { status: 403 }
      );
    }

    const sifBuffer = Buffer.from(message.sifData.sifBase64, "base64");

    // Decrypt on-the-fly using Rust SIF Codec
    const decoded = await decodeSif(
      sifBuffer,
      MASTER_KEK,
      SIF_AUTHORITY_PUBLIC_KEY
    );

    const plaintextBytes = new Uint8Array(decoded.plaintext);

    // Detect MIME type from magic bytes
    let mimeType = "image/png";
    if (plaintextBytes.length >= 8 && plaintextBytes[0] === 0x89 && plaintextBytes[1] === 0x50 && plaintextBytes[2] === 0x4e && plaintextBytes[3] === 0x47) {
      mimeType = "image/png";
    } else if (plaintextBytes.length >= 3 && plaintextBytes[0] === 0xff && plaintextBytes[1] === 0xd8 && plaintextBytes[2] === 0xff) {
      mimeType = "image/jpeg";
    } else if (plaintextBytes.length >= 12 && plaintextBytes[0] === 0x52 && plaintextBytes[1] === 0x49 && plaintextBytes[2] === 0x46 && plaintextBytes[3] === 0x46) {
      mimeType = "image/webp";
    } else if (plaintextBytes.length >= 4 && plaintextBytes[0] === 0x47 && plaintextBytes[1] === 0x49 && plaintextBytes[2] === 0x46 && plaintextBytes[3] === 0x38) {
      mimeType = "image/gif";
    }

    // Return the decrypted image stream
    return new NextResponse(plaintextBytes, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Disposition": `inline; filename="${message.sifData.fileName?.replace(/\.sif$/i, "") || "image"}"`,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/messages/[id]/image error:", errorMsg);
    return NextResponse.json(
      { error: "Failed to decrypt SIF container", details: errorMsg },
      { status: 500 }
    );
  }
}
