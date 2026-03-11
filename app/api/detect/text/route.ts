import { NextRequest, NextResponse } from "next/server";
import { detectWithHive, combineScores } from "@/lib/detector";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const text = body.text;

        if (!text || typeof text !== "string" || text.trim().length === 0) {
            return NextResponse.json(
                { success: false, message: "Please provide valid text" },
                { status: 400 }
            );
        }

        if (text.length > 5000) {
            return NextResponse.json(
                { success: false, message: "Text too long (max 5000 characters)" },
                { status: 400 }
            );
        }

        // Convert text to buffer to simulate a file for the Hive API
        const buffer = Buffer.from(text, "utf-8");
        const hiveScore = await detectWithHive(buffer, "text/plain");

        const result = combineScores(hiveScore);

        return NextResponse.json(result);
    } catch (error) {
        console.error("Text detection error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to analyze text" },
            { status: 500 }
        );
    }
}
