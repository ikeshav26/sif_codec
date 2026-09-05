import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISifData {
  fileName: string;
  imageUuid: string;
  ownerIdHash: string;
  cipherSuite: number;
  payloadLength: number;
  sifVerified: boolean;
  sifBase64?: string;
}

export interface IMessage extends Document {
  senderName: string;
  senderEmail: string;
  content: string;
  isSif: boolean;
  sifData?: ISifData;
  createdAt: Date;
}

const SifDataSchema = new Schema<ISifData>(
  {
    fileName: { type: String, required: true },
    imageUuid: { type: String, required: true },
    ownerIdHash: { type: String, required: true },
    cipherSuite: { type: Number, default: 1 },
    payloadLength: { type: Number, default: 0 },
    sifVerified: { type: Boolean, default: false },
    sifBase64: { type: String },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    senderName: { type: String, required: true },
    senderEmail: { type: String, required: true },
    content: { type: String, default: "" },
    isSif: { type: Boolean, default: false },
    sifData: { type: SifDataSchema, required: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
