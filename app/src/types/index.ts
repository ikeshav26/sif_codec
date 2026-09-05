export interface User {
  userId: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface SifHeader {
  magic?: string;
  version?: number;
  cipherSuite?: number;
  imageUuid?: string;
  ownerIdHash?: string;
  kekId?: string;
  payloadLength?: number;
  flags?: number;
  [key: string]: any;
}

export interface ImageRecord {
  id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  originalSize: number;
  originalPath: string;
  sifPath: string;
  sifSize: number;
  imageUuid: string;
  ownerIdHash: string;
  kekId: string;
  cipherSuite: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadStats {
  originalBytes: number;
  sifBytes: number;
  overheadBytes: number;
}

export interface OwnershipConflict {
  isOwner: boolean;
  originalOwnerName: string;
  originalOwnerEmail: string;
  registeredAt?: string;
  imageUuid: string;
  ownerIdHash: string;
  cipherSuite?: number;
}

