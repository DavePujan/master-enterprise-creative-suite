# Creative Suite: AI-Powered Brand Engine

A high-performance creative automation platform powered by Google Gemini and Imagen. This suite enables brands to initialize their identity and instantly generate high-impact marketing assets across text, image, and video.

## 🚀 Core Features

- **Brand Initialization**: Define your brand's strategic brief and generate a complete identity system (pillars, colors, typography, and logo concepts).
- **Storyline Generator**: Create 6-8 image progressive narratives with AI-generated visuals and copy.
- **Campaign Architect**: Synthesize complete marketing campaigns with copy and multiple key visuals.
- **Slideshow Maker**: Build professional corporate presentations with real-time fact-checking via Google Search.
- **Video Promo Producer**: Generate cinematic video promos using the Veo model.
- **Social Visual Designer**: Create high-quality brand visuals with support for Imagen 4.0.
- **Brand Copywriter**: Craft professional copy in multiple languages and tones.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4.
- **Animations**: Motion (fka Framer Motion).
- **AI Engine**: Google Gemini API (@google/genai).
- **Icons**: Lucide React.
- **Export**: JSZip, FileSaver, jsPDF, html2canvas.

## 📦 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or `v24.x` (LTS recommended)
- **NPM**: `v10+` or `v11+`

### 1. Installation
Clone the repository and install project dependencies:
```bash
npm install
```
*Note: If install scripts fail in restricted environments, run with:*
```bash
npm install --ignore-scripts
```

### 2. Environment Configuration
Create a `.env` file in the project root:
```env
# Required: Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Port configuration (defaults to 3000)
PORT=3000

# Optional: Fal.ai key for alternative visual generation models
FAL_API_KEY=your_fal_api_key_here

# Optional: Razorpay payment gateway credentials
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3. Run Development Server
Start the development server (Express backend + Vite HMR frontend):
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!TIP]
> **Windows PowerShell Script Execution Error (`PSSecurityException`)**:
> If PowerShell blocks `npm` scripts with `cannot be loaded because running scripts is disabled`, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
> Or use `npm.cmd run dev`.

---

## 📜 Available Commands & Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Express server with Vite in development middleware mode (`tsx server.ts`) |
| `npm run build` | Builds the Vite frontend client bundle and compiles `server.ts` with esbuild to `dist/server.cjs` |
| `npm start` | Runs the compiled production server (`node dist/server.cjs`) |
| `npm run preview` | Runs a local Vite static preview server for production assets |
| `npm run lint` | Runs TypeScript compiler checks without emitting files (`tsc --noEmit`) |
| `npm run clean` | Cleans up the `dist/` build output folder |

---

## 🏗️ Production Build & Local Run

To build and run the production bundle locally:

```bash
# 1. Build client and server bundles
npm run build

# 2. Start the production server
npm start
```

---

## 🌐 Deploying to Vercel

This suite includes pre-configured serverless API adapters under the `/api` directory, making it fully compatible with Vercel out of the box.

### Step-by-Step Deployment:
1. **Push to GitHub**: Commit and push this codebase to a public or private GitHub repository.
2. **Import to Vercel**:
   - Go to your Vercel Dashboard and click **Add New** > **Project**.
   - Import your newly created GitHub repository.
3. **Configure Environment Variables**:
   Under the "Environment Variables" section in Vercel, add the following:
   - `GEMINI_API_KEY` (Required): Your Google AI Studio API key.
   - `FAL_API_KEY` (Optional): Required if you plan to use Fal.ai for premium `openai/gpt-image-2` generations.
4. **Deploy**: Click **Deploy**. Vercel will build your static assets and set up the serverless endpoints in `/api` automatically!

## 📖 Documentation

- [AI Pipeline & Model Architecture](./docs/PIPELINE.md) - Detailed breakdown of how AI models are utilized.
- [Model Directory & Benchmarks](./docs/MODELS.md) - Overview of models used across tasks.
- [Token Usage Guide](./docs/TOKEN_USAGE.md) - Optimization and cost estimation details.

