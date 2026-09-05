import 'dotenv/config';
import crypto from 'crypto';
import {
    encodeSif,
    decodeSif,
    inspectSif,
    generateKeypair,
    type JsEncodeOptions,
    type JsSifHeader,
    type JsDecodedResult
} from '@sif/node';


let authorityPrivateKey = process.env.SIF_AUTHORITY_PRIVATE_KEY;
let authorityPublicKey = process.env.SIF_AUTHORITY_PUBLIC_KEY;


if (!authorityPrivateKey || !authorityPublicKey) {
    const generated = generateKeypair();
    authorityPrivateKey = generated.privateKeyHex;
    authorityPublicKey = generated.publicKeyHex;
    console.log('[SIF] Generated ephemeral Authority Keypair for session.');
}


const masterKekHex = process.env.SIF_MASTER_KEK || '5a'.repeat(32);
const MASTER_KEK = Buffer.from(masterKekHex, 'hex');
const KEK_ID_HEX = process.env.SIF_KEK_ID || '0102030405060708090a0b0c0d0e0f10';



export function getOwnerIdHash(userId: string): string {
    return crypto.createHash('sha256').update(userId).digest('hex');
}


export async function encodeImageToSif(
    imageBuffer: Buffer,
    userId: string,
    options?: { imageUuidHex?: string; cipherSuite?: number }
): Promise<{ sifBuffer: Buffer; imageUuid: string; ownerIdHash: string; kekId: string }> {
    const ownerIdHashHex = getOwnerIdHash(userId);
    const imageUuidHex = options?.imageUuidHex || crypto.randomUUID().replace(/-/g, '');

    const encodeOpts: JsEncodeOptions = {
        ownerIdHashHex,
        kekIdHex: KEK_ID_HEX,
        cipherSuite: options?.cipherSuite ?? 1,
        flags: 0,
        imageUuidHex,
    };

    const sifBuffer = await encodeSif(
        imageBuffer,
        MASTER_KEK,
        authorityPrivateKey as string,
        encodeOpts
    );

    return {
        sifBuffer,
        imageUuid: imageUuidHex,
        ownerIdHash: ownerIdHashHex,
        kekId: KEK_ID_HEX,
    };
}


export async function decodeSifImage(sifBuffer: Buffer): Promise<JsDecodedResult> {
    return await decodeSif(sifBuffer, MASTER_KEK, authorityPublicKey as string);
}


export function inspectSifContainer(sifBuffer: Buffer): JsSifHeader {
    return inspectSif(sifBuffer);
}