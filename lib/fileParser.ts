// const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB [use this later]
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB (Vercel serverless limit)

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

    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: "File size exceeds 10MB limit" };
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
