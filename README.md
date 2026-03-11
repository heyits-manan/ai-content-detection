# 🔍 AI Content Detector

A web application that detects whether media content (images, videos, or audio) is AI-generated. Built as part of the [futurestoreai.com](https://futurestoreai.com) ecosystem.


## Features

- **Upload media files** — Drag-and-drop or browse to upload images, or paste text
- **AI detection** — Analyzes content using machine learning models concurrently
- **Combined scoring** — Leverages Hive AI and HuggingFace models (SDXL, RoBERTa)
- **Multiple formats** — Supports text content, and images (JPG, PNG, WebP)
- **4MB file limit** — Lightweight and optimized for Vercel serverless functions

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Frontend | React, Tailwind CSS v4 |
| Backend | Next.js API Routes |
| AI Detection | Hive API, HuggingFace Inference API (SDXL, RoBERTa) |
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
HUGGINGFACE_API_KEY=your_hf_api_key_here
HIVE_API_KEY=your_hive_api_key_here
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
│   │   ├── route.ts          # POST /api/detect (Image detection)
│   │   └── text/
│   │       └── route.ts      # POST /api/detect/text (Text detection)
│   ├── globals.css            # Global styles & Tailwind config
│   ├── layout.tsx             # Root layout with metadata
│   └── page.tsx               # Main upload & text input page
├── components/
│   ├── UploadBox.tsx          # File upload with drag-and-drop
│   └── ResultBox.tsx          # Advanced breakdown result display
├── lib/
│   ├── detector.ts            # AI detection logic (Hive + HF Aggregator)
│   └── fileParser.ts          # File validation & parsing
└── public/
    ├── logo.png               # FutureStore logo
    └── favicon.png            # Browser tab icon
```

## API

### `POST /api/detect`

Accepts `multipart/form-data` with a `file` field. Used for image validation.

**Success Response:**

```json
{
  "success": true,
  "ai_generated": true,
  "confidence": 0.82,
  "detectors": {
    "hive": 0.78,
    "sdxl": 0.91
  }
}
```

### `POST /api/detect/text`

Accepts a JSON payload `{"text": "Sample text to check"}`.

**Success Response:**

```json
{
  "success": true,
  "ai_generated": true,
  "confidence": 0.96,
  "detectors": {
    "roberta": 0.96
  }
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

- [x] Text AI Detection (RoBERTa)
- [x] Multi-model architecture for imagery
- [ ] Video deepfake detection
- [ ] Audio/voice clone detection
- [ ] Multi-file upload
- [ ] Public developer API
- [ ] Browser extension

## License

This project is part of the FutureStore.ai ecosystem.
