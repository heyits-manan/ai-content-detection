const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

export interface ParsedFile {
    buffer: Buffer;
    mimeType: string;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
        return { valid: false, error: "No file provided" };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Unsupported file type: ${file.type || "unknown"}. Supported: jpg, png, webp`,
        };
    }

    return { valid: true };
}

export async function parseFile(file: File): Promise<ParsedFile> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { buffer, mimeType: file.type };
}
