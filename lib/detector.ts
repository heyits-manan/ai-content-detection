import { InferenceClient } from "@huggingface/inference";

const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

const AI_THRESHOLD = 0.7;
const IMAGE_MODEL = "umm-maybe/AI-image-detector";

export interface DetectionResult {
    ai_generated: boolean;
    confidence: number;
    detected_model: string | null;
}

export async function detectImage(buffer: Buffer, mimeType: string): Promise<DetectionResult> {
    const uint8 = new Uint8Array(buffer);
    const blob = new Blob([uint8], { type: mimeType });

    const result = await hf.imageClassification({
        model: IMAGE_MODEL,
        data: blob,
    });

    // Model returns labels like "artificial" and "human"
    const artificialResult = result.find(
        (r) => r.label.toLowerCase() === "artificial"
    );

    const confidence = artificialResult?.score ?? 0;
    const aiGenerated = confidence > AI_THRESHOLD;

    return {
        ai_generated: aiGenerated,
        confidence: Math.round(confidence * 100) / 100,
        detected_model: aiGenerated ? "AI-image-detector" : null,
    };
}
