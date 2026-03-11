import { NextRequest, NextResponse } from "next/server";
import { validateFile, parseFile } from "@/lib/fileParser";
import { detectImage } from "@/lib/detector";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

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

        // Run AI image detection
        const result = await detectImage(parsedFile.buffer, parsedFile.mimeType);

        return NextResponse.json({
            success: true,
            ai_generated: result.ai_generated,
            confidence: result.confidence,
            artificial_score: result.artificial_score,
            human_score: result.human_score,
            detected_model: result.detected_model,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";

        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}
