import { NextRequest, NextResponse } from "next/server";
import { validateFile, parseFile } from "@/lib/fileParser";
import { detectWithHive, detectWithSDXL, combineScores } from "@/lib/detector";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const type = formData.get("type") as string | null || file?.type || "";

        if (!file) {
            return NextResponse.json(
                { success: false, message: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type and size
        const validation = validateFile(file);
        if (!validation.valid) {
            return NextResponse.json(
                { success: false, message: validation.error },
                { status: 400 }
            );
        }

        // Parse file to buffer
        const parsedFile = await parseFile(file);

        // Run detection based on file type
        const isImage = type.startsWith("image/");
        let hiveScore = 0;
        let sdxlScore: number | undefined = undefined;

        if (isImage) {
            // Run detectors in parallel for images
            const results = await Promise.all([
                detectWithHive(parsedFile.buffer, parsedFile.mimeType),
                detectWithSDXL(parsedFile.buffer, parsedFile.mimeType)
            ]);
            hiveScore = results[0];
            sdxlScore = results[1];
        } else {
            // For video/audio/text that are uploaded as files
            hiveScore = await detectWithHive(parsedFile.buffer, parsedFile.mimeType);
        }

        const result = combineScores(hiveScore, sdxlScore);

        return NextResponse.json(result);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";

        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}
