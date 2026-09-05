import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { Message } from "@/models/Message";
import { verifySifContainerZeroDb } from "@/lib/sifVerifier";
import { sendOwnershipVerificationEmail } from "@/lib/emailService";
import { resolveContainerOwner } from "@/lib/ownerLookup";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const viewerEmail = searchParams.get("viewerEmail");

    // Privacy rule:
    // Approved / verified messages (and regular text messages) are broadcast to everyone.
    // Unapproved (PENDING_APPROVAL or REJECTED) messages are ONLY visible to the sender who submitted them.
    const queryConditions: Record<string, unknown>[] = [
      { isSif: false },
      { "sifData.verificationStatus": "VERIFIED" },
    ];

    if (viewerEmail) {
      queryConditions.push({ senderEmail: viewerEmail });
    }

    const messages = await Message.find({ $or: queryConditions })
      .sort({ createdAt: 1 })
      .limit(100);
    return NextResponse.json({ messages });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err);
    console.error("GET /api/messages error:", err);
    return NextResponse.json(
      { error: "Failed to fetch messages", details },
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
    const requestedOwnerEmail = (formData.get("ownerEmail") as string) || "";
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

      if (verification.isOwner) {
        // Direct Owner Verification: Instant Verified Release
        sifData = {
          fileName: sifFile.name,
          imageUuid: verification.header?.imageUuid || "",
          ownerIdHash: verification.header?.ownerIdHash || "",
          cipherSuite: verification.header?.cipherSuite || 1,
          payloadLength: verification.header?.payloadLength || buffer.length,
          sifVerified: true,
          verificationStatus: "VERIFIED" as const,
          sifBase64: buffer.toString("base64"),
          approvedAt: new Date(),
        };
      } else {
        // Non-Owner Forwarding: Resolve real owner email from database / identity hash
        const imageUuid = verification.header?.imageUuid || "";
        const ownerIdHash = verification.header?.ownerIdHash || "";

        const ownerInfo = await resolveContainerOwner(
          imageUuid,
          ownerIdHash,
          requestedOwnerEmail
        );
        const targetOwnerEmail = ownerInfo.ownerEmail;
        console.log(
          `[Provenance Gate] Non-owner container detected. Owner resolved as: ${targetOwnerEmail} (via ${ownerInfo.resolvedVia})`
        );

        const token = crypto.randomUUID();

        sifData = {
          fileName: sifFile.name,
          imageUuid,
          ownerIdHash,
          cipherSuite: verification.header?.cipherSuite || 1,
          payloadLength: verification.header?.payloadLength || buffer.length,
          sifVerified: false,
          verificationStatus: "PENDING_APPROVAL" as const,
          verificationToken: token,
          ownerEmail: targetOwnerEmail,
          sifBase64: buffer.toString("base64"),
        };

        // Dispatch verification authorization email asynchronously
        sendOwnershipVerificationEmail({
          toEmail: targetOwnerEmail,
          senderName,
          senderEmail,
          imageUuid,
          fileName: sifFile.name,
          token,
        }).catch((err) =>
          console.error("Failed to dispatch ownership verification email:", err)
        );
      }
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
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err);
    console.error("POST /api/messages error:", err);
    return NextResponse.json(
      { error: "Failed to create message", details },
      { status: 500 }
    );
  }
}
