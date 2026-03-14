import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/apiBase";

const MAX_TEXT_LENGTH = 5000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Please provide valid text" },
        { status: 400 },
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Text too long (max ${MAX_TEXT_LENGTH} characters)` },
        { status: 400 },
      );
    }

    const targetUrl = `${getBackendBaseUrl()}/api/v1/text/detect`;
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text.trim() }),
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Text detection error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyze text" },
      { status: 500 },
    );
  }
}
