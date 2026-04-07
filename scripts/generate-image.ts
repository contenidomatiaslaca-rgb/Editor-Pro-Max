import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

const PLATFORM_SIZES: Record<string, { width: number; height: number }> = {
  instagram: { width: 1080, height: 1080 },
  "instagram-story": { width: 1080, height: 1920 },
  facebook: { width: 1200, height: 630 },
  twitter: { width: 1200, height: 675 },
  youtube: { width: 1280, height: 720 },
  linkedin: { width: 1200, height: 627 },
  tiktok: { width: 1080, height: 1920 },
  default: { width: 1024, height: 1024 },
};

function parseArgs(): { prompt: string; name: string; platform: string } {
  const args = process.argv.slice(2);
  let prompt = "";
  let name = "";
  let platform = "default";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--prompt":
        prompt = args[++i];
        break;
      case "--name":
        name = args[++i];
        break;
      case "--platform":
        platform = args[++i];
        break;
    }
  }

  if (!prompt) {
    console.error(
      "Uso: npx tsx scripts/generate-image.ts --prompt <texto> --name <nombre> [--platform <plataforma>]"
    );
    console.error(
      `Plataformas disponibles: ${Object.keys(PLATFORM_SIZES).join(", ")}`
    );
    process.exit(1);
  }

  if (!name) {
    name = prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50);
  }

  return { prompt, name, platform };
}

async function generateImage(
  prompt: string,
  name: string,
  platform: string
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: La variable de entorno GEMINI_API_KEY no está configurada.");
    console.error("Configurala con: export GEMINI_API_KEY=tu_api_key");
    process.exit(1);
  }

  const size = PLATFORM_SIZES[platform] ?? PLATFORM_SIZES["default"];
  console.log(`Generando imagen para "${platform}" (${size.width}x${size.height})...`);
  console.log(`Prompt: ${prompt}`);

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateImages({
    model: "imagen-3.0-generate-002",
    prompt,
    config: {
      numberOfImages: 1,
    },
  });

  if (!response.generatedImages || response.generatedImages.length === 0) {
    console.error("Error: No se generaron imágenes.");
    process.exit(1);
  }

  const imageData = response.generatedImages[0].image?.imageBytes;
  if (!imageData) {
    console.error("Error: La imagen generada no contiene datos.");
    process.exit(1);
  }

  const outputDir = path.resolve(__dirname, "../public/assets");
  fs.mkdirSync(outputDir, { recursive: true });

  const filename = `${name}-${platform}.png`;
  const outputPath = path.join(outputDir, filename);

  fs.writeFileSync(outputPath, Buffer.from(imageData, "base64"));
  console.log(`Imagen guardada en: ${outputPath}`);
}

const { prompt, name, platform } = parseArgs();
generateImage(prompt, name, platform).catch((err) => {
  console.error("Error generando imagen:", err.message);
  process.exit(1);
});
