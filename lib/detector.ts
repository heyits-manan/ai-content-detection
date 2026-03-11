import { InferenceClient } from "@huggingface/inference";

const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

const AI_THRESHOLD = 0.7;
const IMAGE_MODEL = "umm-maybe/AI-image-detector";
const HF_INFERENCE = "hf-inference"

export interface DetectionResult {
    ai_generated: boolean;
    confidence: number;
    artificial_score: number;
    human_score: number;
    detected_model: string | null;
}

export async function detectImage(buffer: Buffer, mimeType: string): Promise<DetectionResult> {
    const uint8 = new Uint8Array(buffer);
    const blob = new Blob([uint8], { type: mimeType });

    const result = await hf.imageClassification({
        model: IMAGE_MODEL,
        data: blob,
        provider: HF_INFERENCE
    });

    const artificialScore = result.find(
        (r) => r.label.toLowerCase() === "artificial"
    )?.score ?? 0;

    const humanScore = result.find(
        (r) => r.label.toLowerCase() === "human"
    )?.score ?? 0;

    const aiGenerated = artificialScore > AI_THRESHOLD;

    return {
        ai_generated: aiGenerated,
        confidence: Math.round(artificialScore * 100) / 100,
        artificial_score: Math.round(artificialScore * 100) / 100,
        human_score: Math.round(humanScore * 100) / 100,
        detected_model: aiGenerated ? "AI-image-detector" : null,
    };
}
