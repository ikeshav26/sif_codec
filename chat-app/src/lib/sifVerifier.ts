import crypto from "crypto";

const SIF_MAGIC_BINARY = Buffer.from([0x53, 0x49, 0x46, 0x01]); // "SIF\x01" (canonical SIF format)
const SIF_MAGIC_ASCII = Buffer.from([0x53, 0x49, 0x46, 0x31]); // "SIF1"
const HEADER_SIZE = 140;

export interface SifVerificationResult {
  isValidContainer: boolean;
  isOwner: boolean;
  header?: {
    magic: string;
    version: number;
    cipherSuite: number;
    flags: number;
    imageUuid: string;
    ownerIdHash: string;
    kekId: string;
    payloadLength: number;
  };
  computedSenderHash: string;
  error?: string;
}

/**
 * Decentralized Zero-DB SIF Container Verifier
 * Reads and verifies the SIF binary header mathematically without querying any external DB.
 */
export function verifySifContainerZeroDb(
  sifBuffer: Buffer,
  senderIdentity: string
): SifVerificationResult {
  const computedSenderHash = crypto
    .createHash("sha256")
    .update(senderIdentity)
    .digest("hex");

  if (!sifBuffer || sifBuffer.length < HEADER_SIZE) {
    return {
      isValidContainer: false,
      isOwner: false,
      computedSenderHash,
      error: `File too small to be a valid SIF container (minimum ${HEADER_SIZE} bytes required)`,
    };
  }

  // 1. Verify Magic Bytes (Supports standard SIF\x01 or ASCII SIF1)
  const magicSlice = sifBuffer.subarray(0, 4);
  const isValidMagic =
    magicSlice.equals(SIF_MAGIC_BINARY) || magicSlice.equals(SIF_MAGIC_ASCII);

  if (!isValidMagic) {
    return {
      isValidContainer: false,
      isOwner: false,
      computedSenderHash,
      error: "Invalid SIF container: Magic bytes mismatch (expected 'SIF\\x01' or 'SIF1')",
    };
  }

  try {
    const version = sifBuffer.readUInt8(4);
    const cipherSuite = sifBuffer.readUInt8(5);
    const flags = sifBuffer.readUInt16LE(6);
    const imageUuid = sifBuffer.subarray(8, 24).toString("hex");
    const ownerIdHash = sifBuffer.subarray(24, 56).toString("hex");
    const kekId = sifBuffer.subarray(56, 72).toString("hex");
    const payloadLength = Number(sifBuffer.readBigUInt64LE(132));

    const isOwner = ownerIdHash.toLowerCase() === computedSenderHash.toLowerCase();

    return {
      isValidContainer: true,
      isOwner,
      header: {
        magic: "SIF1",
        version,
        cipherSuite,
        flags,
        imageUuid,
        ownerIdHash,
        kekId,
        payloadLength,
      },
      computedSenderHash,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse SIF container header";
    return {
      isValidContainer: false,
      isOwner: false,
      computedSenderHash,
      error: message,
    };
  }
}
