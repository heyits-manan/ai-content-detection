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

        // Run detection based on file type
        const isImage = type.startsWith("image/");
        let hiveScore = 0;
        let sdxlScore: number | undefined = undefined;

        if (isImage) {
            // Forward image requests to our new Python FastAPI backend
            const backendFormData = new FormData();
            backendFormData.append("file", file);
            
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:8000";
            
            try {
                const response = await fetch(`${apiBase}/api/v1/image/detect`, {
                    method: "POST",
                    body: backendFormData,
                    cache: "no-store",
                });
                
                if (!response.ok) {
                    let errorMsg = `Backend error: ${response.status}`;
                    try {
                        const errorJson = await response.json();
                        if (errorJson.detail) errorMsg = errorJson.detail;
                    } catch (e) {
                         // Fallback to text if JSON parsing fails
                         const text = await response.text();
                         if (text) errorMsg += ` - ${text.substring(0, 100)}`;
                    }
                    throw new Error(errorMsg);
                }
                
                const pythonResponse = await response.json();
                
                if (!pythonResponse.success || !pythonResponse.data) {
                    throw new Error("Invalid response format from Python backend");
                }
                
                const pythonData = pythonResponse.data;
                
                return NextResponse.json({
                    success: true,
                    ai_generated: pythonData.is_ai_generated,
                    confidence: pythonData.confidence,
                    detectors: {
                        // Map the AI probability to the generic score so the UI displays it
                        hive: pythonData.ai_probability,
                        // And if we know the models used, we can map SDXL too
                        sdxl: pythonData.models_used?.includes('sdxl') ? pythonData.ai_probability : undefined
                    }
                });
            } catch (err) {
                console.error("Failed to connect to Python backend:", err);
                throw new Error(err instanceof Error ? err.message : "Failed to connect to Python backend");
            }
        } else {
            // For video/audio/text that are uploaded as files, use original Next.js implementation for now
            // Parse file to buffer only if we need it here
            const parsedFile = await parseFile(file);
            hiveScore = await detectWithHive(parsedFile.buffer, parsedFile.mimeType);
            
            const result = combineScores(hiveScore, sdxlScore);
            return NextResponse.json(result);
        }
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";

        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}
