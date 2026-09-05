import crypto from "crypto";
import { Pool } from "pg";

let pgPool: Pool | null = null;

function getPgPool(): Pool | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  if (!pgPool) {
    pgPool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 3000,
    });
  }
  return pgPool;
}

export interface OwnerLookupResult {
  ownerEmail: string;
  ownerName: string;
  resolvedVia: "DATABASE" | "IDENTITY_HASH" | "CUSTOM" | "FALLBACK";
}

// Known default demo identities
const KNOWN_IDENTITIES = [
  { name: "Alice (Creator)", email: "alice@sif.io" },
  { name: "Bob (Forwarder)", email: "bob@sif.io" },
  { name: "Keshav", email: "keshav@ikeshav.in" },
];

/**
 * Resolves the genuine owner email for an uploaded .sif container:
 * 1. Queries PostgreSQL database (Image -> User) by imageUuid and ownerIdHash
 * 2. Checks known cryptographic identity hashes
 * 3. Falls back to requested email or default alert email
 */
export async function resolveContainerOwner(
  imageUuid: string,
  ownerIdHash: string,
  requestedEmail?: string
): Promise<OwnerLookupResult> {
  // 1. If a specific email was explicitly provided by the user, use it directly
  if (requestedEmail && requestedEmail.trim().length > 0) {
    const trimmed = requestedEmail.trim();
    return {
      ownerEmail: trimmed,
      ownerName: trimmed.split("@")[0],
      resolvedVia: "CUSTOM",
    };
  }

  const pool = getPgPool();

  // 2. Check PostgreSQL Database for the registered owner
  if (pool) {
    try {
      const query = `
        SELECT u.email, u.name, i."originalName", i."imageUuid"
        FROM "Image" i
        JOIN "User" u ON i."userId" = u.id
        WHERE LOWER(i."imageUuid") = LOWER($1) OR LOWER(i."ownerIdHash") = LOWER($2)
        LIMIT 1;
      `;
      const res = await pool.query(query, [imageUuid, ownerIdHash]);
      if (res.rows.length > 0 && res.rows[0].email) {
        return {
          ownerEmail: res.rows[0].email,
          ownerName: res.rows[0].name || "SIF Creator",
          resolvedVia: "DATABASE",
        };
      }
    } catch (err) {
      console.warn("[OwnerLookup] Postgres lookup error (falling back to hash check):", err);
    }
  }

  // 3. Check if ownerIdHash matches any known identities
  const normalizedHash = ownerIdHash.toLowerCase();
  for (const id of KNOWN_IDENTITIES) {
    const computed = crypto.createHash("sha256").update(id.email).digest("hex");
    if (computed.toLowerCase() === normalizedHash) {
      return {
        ownerEmail: id.email,
        ownerName: id.name,
        resolvedVia: "IDENTITY_HASH",
      };
    }
  }

  // 4. Fallback default
  const fallback = process.env.DEFAULT_OWNER_ALERT_EMAIL || "keshav@ikeshav.in";
  return {
    ownerEmail: fallback,
    ownerName: "Asset Owner",
    resolvedVia: "FALLBACK",
  };
}
