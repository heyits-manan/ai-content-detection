# 🔍 AI Content Detector

A web application that detects whether media content (images, videos, or audio) is AI-generated. Built as part of the [FutureStore.ai](https://futurestoreai.com) ecosystem.

> **Live URL:** [verify.futurestore.ai](https://verify.futurestore.ai)

## Features

- **Upload media files** — Drag-and-drop or browse to upload
- **AI detection** — Analyzes content using machine learning models
- **Confidence scoring** — Returns probability scores for artificial vs human content
- **Multiple formats** — Supports images (JPG, PNG, WebP), video (MP4), and audio (MP3, WAV)
- **10MB file limit** — Lightweight and fast processing

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Frontend | React, Tailwind CSS v4 |
| Backend | Next.js API Routes |
| AI Detection | HuggingFace Inference API |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A [HuggingFace API key](https://huggingface.co/settings/tokens)

### Installation

```bash
git clone https://github.com/heyits-manan/ai-content-detection.git
cd ai-content-detection
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
HUGGINGFACE_API_KEY=your_api_key_here
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ai-content-detector/
├── app/
│   ├── api/detect/
│   │   └── route.ts          # POST /api/detect endpoint
│   ├── globals.css            # Global styles & Tailwind config
│   ├── layout.tsx             # Root layout with metadata
│   └── page.tsx               # Main upload page
├── components/
│   ├── UploadBox.tsx          # File upload with drag-and-drop
│   └── ResultBox.tsx          # Detection result display
├── lib/
│   ├── detector.ts            # AI detection logic (HuggingFace)
│   └── fileParser.ts          # File validation & parsing
└── public/
    ├── logo.png               # FutureStore logo
    └── favicon.png            # Browser tab icon
```

## API

### `POST /api/detect`

Accepts `multipart/form-data` with a `file` field.

**Success Response:**

```json
{
  "success": true,
  "ai_generated": true,
  "confidence": 0.91,
  "artificial_score": 0.91,
  "human_score": 0.09,
  "detected_model": "AI-image-detector"
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Unsupported file type"
}
```

## Roadmap

- [x] Image AI detection
- [ ] Video deepfake detection
- [ ] Audio/voice clone detection
- [ ] Multi-file upload
- [ ] Visual probability charts
- [ ] Public developer API
- [ ] Browser extension

## License

This project is part of the FutureStore.ai ecosystem.
