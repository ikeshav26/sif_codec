import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Message } from "@/models/Message";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action") || "approve";

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    const isReject = action === "reject";

    const updatedMessage = await Message.findOneAndUpdate(
      { "sifData.verificationToken": token },
      {
        $set: {
          "sifData.verificationStatus": isReject ? "REJECTED" : "VERIFIED",
          "sifData.sifVerified": !isReject,
          "sifData.approvedAt": isReject ? undefined : new Date(),
        },
      },
      { new: true }
    );

    if (!updatedMessage || !updatedMessage.sifData) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 404 }
      );
    }

    console.log(
      `\n[Verification Complete] Token ${token} marked as ${updatedMessage.sifData.verificationStatus} for SIF ${updatedMessage.sifData.imageUuid}\n`
    );

    const isJson = req.headers.get("accept")?.includes("application/json");

    if (isJson) {
      return NextResponse.json({
        success: true,
        status: updatedMessage.sifData.verificationStatus,
        imageUuid: updatedMessage.sifData.imageUuid,
        senderName: updatedMessage.senderName,
      });
    }

    if (isReject) {
      return NextResponse.redirect(
        new URL(
          `/verify?status=rejected&uuid=${updatedMessage.sifData.imageUuid}`,
          req.url
        )
      );
    }

    return NextResponse.redirect(
      new URL(
        `/verify?status=approved&uuid=${updatedMessage.sifData.imageUuid}&sender=${encodeURIComponent(
          updatedMessage.senderName
        )}`,
        req.url
      )
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/verify error:", errorMsg);
    return NextResponse.json(
      { error: "Verification processing failed", details: errorMsg },
      { status: 500 }
    );
  }
}
