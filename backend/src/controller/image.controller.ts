import { Response } from "express";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import prisma from "../config/db.js";
import { encodeImageToSif, decodeSifImage, inspectSifContainer, getOwnerIdHash } from "../utils/sif.js";
import { sendOwnershipAlertEmail } from "../services/email.service.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const ORIGINALS_DIR = path.join(UPLOADS_DIR, "originals");
const SIF_DIR = path.join(UPLOADS_DIR, "sif");

await fs.mkdir(ORIGINALS_DIR, { recursive: true });
await fs.mkdir(SIF_DIR, { recursive: true });


export const uploadAndEncodeImage = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: "No image file provided" });
        }

        // Check if the uploaded file is an existing .sif container
        const isSifFile =
            file.originalname.toLowerCase().endsWith(".sif") ||
            (file.buffer.length >= 4 &&
                file.buffer[0] === 0x53 &&
                file.buffer[1] === 0x49 &&
                file.buffer[2] === 0x46 &&
                (file.buffer[3] === 0x01 || file.buffer[3] === 0x31));

        if (isSifFile) {
            let header;
            try {
                header = inspectSifContainer(file.buffer);
            } catch (err: any) {
                return res.status(400).json({
                    message: "Invalid or corrupted SIF container format",
                    error: err.message,
                });
            }

            const currentOwnerHash = getOwnerIdHash(userId);
            const isOwner = header.ownerIdHashHex.toLowerCase() === currentOwnerHash.toLowerCase();

            // Ownership Conflict: Container belongs to a different owner!
            if (!isOwner) {
                const existingRecord = await prisma.image.findFirst({
                    where: {
                        OR: [
                            { ownerIdHash: header.ownerIdHashHex },
                            { imageUuid: header.imageUuidHex },
                        ],
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                });

                const maskEmail = (email?: string) => {
                    if (!email) return "u***@domain.com";
                    const [userPart, domainPart] = email.split("@");
                    if (userPart.length <= 2) return `${userPart}***@${domainPart}`;
                    return `${userPart[0]}***${userPart[userPart.length - 1]}@${domainPart}`;
                };

                // Dispatch security alert email to original creator asynchronously
                if (existingRecord?.user?.email) {
                    sendOwnershipAlertEmail({
                        toEmail: existingRecord.user.email,
                        ownerName: existingRecord.user.name,
                        imageUuid: header.imageUuidHex,
                        originalName: existingRecord.originalName,
                        attemptedByUserId: userId,
                    }).catch((err) => console.error("Failed to send ownership alert email:", err));
                }

                return res.status(403).json({
                    status: "OWNERSHIP_CONFLICT",
                    message: "Ownership violation: This SIF container is cryptographically signed to another user.",
                    conflict: {
                        isOwner: false,
                        originalOwnerName: existingRecord?.user?.name || "Original Creator",
                        originalOwnerEmail: maskEmail(existingRecord?.user?.email),
                        registeredAt: existingRecord?.createdAt,
                        imageUuid: header.imageUuidHex,
                        ownerIdHash: header.ownerIdHashHex,
                        cipherSuite: header.cipherSuite,
                    },
                });
            }

            // Valid owner re-uploading / registering existing SIF container
            const decoded = await decodeSifImage(file.buffer);
            const imageUuid = header.imageUuidHex;
            const originalFileName = `${imageUuid}.png`;
            const sifFileName = `${imageUuid}.sif`;

            const originalFilePath = path.join(ORIGINALS_DIR, originalFileName);
            const sifFilePath = path.join(SIF_DIR, sifFileName);

            await fs.writeFile(originalFilePath, decoded.plaintext);
            await fs.writeFile(sifFilePath, file.buffer);

            const imageRecord = await prisma.image.create({
                data: {
                    userId,
                    originalName: file.originalname.replace(/\.sif$/i, ".png"),
                    mimeType: "image/png",
                    originalSize: decoded.plaintext.length,
                    originalPath: originalFilePath,
                    sifPath: sifFilePath,
                    sifSize: file.buffer.length,
                    imageUuid,
                    ownerIdHash: header.ownerIdHashHex,
                    kekId: header.kekIdHex,
                    cipherSuite: header.cipherSuite,
                },
            });

            return res.status(200).json({
                message: "SIF container verified and registered successfully",
                image: imageRecord,
                stats: {
                    originalBytes: decoded.plaintext.length,
                    sifBytes: file.buffer.length,
                    overheadBytes: file.buffer.length - decoded.plaintext.length,
                },
            });
        }

        // Standard image file (PNG, JPG, WebP, etc.) -> Encode to SIF
        const imageUuid = crypto.randomUUID().replace(/-/g, "");
        const fileExt = path.extname(file.originalname) || ".png";

        const { sifBuffer, ownerIdHash, kekId } = await encodeImageToSif(
            file.buffer,
            userId,
            { imageUuidHex: imageUuid }
        );

        const originalFileName = `${imageUuid}${fileExt}`;
        const sifFileName = `${imageUuid}.sif`;

        const originalFilePath = path.join(ORIGINALS_DIR, originalFileName);
        const sifFilePath = path.join(SIF_DIR, sifFileName);

        await fs.writeFile(originalFilePath, file.buffer);
        await fs.writeFile(sifFilePath, sifBuffer);

        const imageRecord = await prisma.image.create({
            data: {
                userId,
                originalName: file.originalname,
                mimeType: file.mimetype,
                originalSize: file.size,
                originalPath: originalFilePath,
                sifPath: sifFilePath,
                sifSize: sifBuffer.length,
                imageUuid,
                ownerIdHash,
                kekId,
                cipherSuite: 1,
            },
        });

        return res.status(201).json({
            message: "Image successfully encoded to SIF format",
            image: imageRecord,
            stats: {
                originalBytes: file.size,
                sifBytes: sifBuffer.length,
                overheadBytes: sifBuffer.length - file.size,
            },
        });
    } catch (err: any) {
        console.error("Upload & encode error:", err);
        return res.status(500).json({ message: "Failed to process image", error: err.message });
    }
};


export const getUserImages = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const images = await prisma.image.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({ images });
    } catch (err: any) {
        return res.status(500).json({ message: "Failed to fetch images", error: err.message });
    }
};


export const getImageDetails = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.userId;

        const image = await prisma.image.findFirst({
            where: { id, userId },
        });

        if (!image) {
            return res.status(404).json({ message: "Image not found" });
        }

        const sifBuffer = await fs.readFile(image.sifPath);
        const header = inspectSifContainer(sifBuffer);

        return res.status(200).json({
            image,
            sifHeader: header,
        });
    } catch (err: any) {
        return res.status(500).json({ message: "Failed to fetch image details", error: err.message });
    }
};


export const downloadSifFile = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.userId;

        const image = await prisma.image.findFirst({
            where: { id, userId },
        });

        if (!image) {
            return res.status(404).json({ message: "Image not found" });
        }

        return res.download(image.sifPath, `${image.imageUuid}.sif`);
    } catch (err: any) {
        return res.status(500).json({ message: "Failed to download SIF file", error: err.message });
    }
};


export const decodeAndServeImage = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.userId;

        const image = await prisma.image.findFirst({
            where: { id, userId },
        });

        if (!image) {
            return res.status(404).json({ message: "Image not found" });
        }

        const sifBuffer = await fs.readFile(image.sifPath);
        const decoded = await decodeSifImage(sifBuffer);

        res.setHeader("Content-Type", image.mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${image.originalName}"`);
        return res.send(decoded.plaintext);
    } catch (err: any) {
        console.error("Decode error:", err);
        return res.status(500).json({ message: "Failed to decode SIF image", error: err.message });
    }
};
