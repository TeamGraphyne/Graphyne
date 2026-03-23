/**
 * aiPipeline.ts
 * =============
 * TypeScript port of graphyne-ai/pipeline.py + models.py.
 *
 * Replaces the Python child-process spawn so the AI pipeline works inside
 * the packaged Tauri binary (no Python / .venv required).
 *
 * The Gemini API key is supplied per-call by the caller (passed from the
 * client via the POST body). GEMINI_MODEL is read from process.env.
 */

import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from "uuid";

// ── Config ────────────────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";

// ── Types (mirrors graphyne-client/src/types/canvas.ts) ──────────────────────

export interface AnimationConfig {
  type: "fade" | "slide-left" | "slide-right" | "slide-up" | "slide-down" | "scale";
  duration: number;
  delay: number;
  ease: string;
}

export interface ShadowEffect {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface CanvasElement {
  id: string;
  type: "rect" | "circle" | "text" | "image";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  opacity?: number;
  zIndex?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  align?: "left" | "center" | "right";
  src?: string;
  shadow?: ShadowEffect;
  isVisible?: boolean;
  isLocked?: boolean;
  inAnimation?: AnimationConfig;
  outAnimation?: AnimationConfig;
}

export interface CanvasConfig {
  width: number;
  height: number;
  background: string;
}

export interface GraphicDesign {
  name: string;
  config: CanvasConfig;
  elements: CanvasElement[];
}

// ── System Prompt (verbatim from pipeline.py) ─────────────────────────────────

const SYSTEM_PROMPT = `
You are a broadcast graphics designer for Graphyne, a real-time HTML-based
broadcast graphics engine. Your job is to design graphics by outputting a
valid JSON object that exactly matches the Graphyne canvas schema.

## Canvas Rules
- Default canvas: 1920x1080 pixels (16:9 broadcast standard)
- Coordinate origin (0,0) is TOP-LEFT
- x increases rightward, y increases downward
- zIndex: higher numbers appear on top
- All colours must be valid CSS hex strings (e.g. "#FF0000") or "transparent"
- opacity: 0.0 (invisible) to 1.0 (fully opaque)

## Positioning & Layout Rules (CRITICAL)

Every element uses absolute x, y, width, height values in pixels. There is NO
automatic layout engine — you must calculate every position yourself. Follow
these rules precisely:

### Coordinate Math
- An element's **right edge** = x + width
- An element's **bottom edge** = y + height
- An element's **horizontal center** = x + (width / 2)
- An element's **vertical center** = y + (height / 2)

### Placing Text Inside a Rectangle
To visually center text inside a background rect:
1. Give the text element the SAME x, y, width, and height as the rect.
2. Set align: "center" on the text.
3. The renderer will horizontally center the text within its bounding box.
4. To vertically center, offset the text y so that:
   text.y = rect.y + (rect.height / 2) - (fontSize / 2)
   and give the text a height equal to fontSize (or slightly larger).

Example — name label on a bar:
  rect:  { x: 100, y: 800, width: 600, height: 70 }
  text:  { x: 100, y: 800 + (70/2) - (36/2) = 817, width: 600, height: 36, fontSize: 36, align: "center" }

### Stacking Elements Vertically (No Gaps)
To place element B directly below element A with a gap of G pixels:
  B.y = A.y + A.height + G

Example — subtitle bar flush beneath name bar (5px gap):
  nameBar:     { y: 800, height: 70 }
  subtitleBar: { y: 800 + 70 + 5 = 875, height: 50 }

### Stacking Elements Horizontally
To place element B directly to the right of element A with a gap of G pixels:
  B.x = A.x + A.width + G

### Centering an Element on the Canvas
  x = (canvasWidth / 2) - (elementWidth / 2)
  y = (canvasHeight / 2) - (elementHeight / 2)

Example — center a 400x80 element on a 1920x1080 canvas:
  x = (1920 / 2) - (400 / 2) = 760
  y = (1080 / 2) - (80 / 2) = 500

### Right-Aligning an Element
To place an element's right edge at a distance \`margin\` from the canvas right:
  x = canvasWidth - elementWidth - margin

Example — right-aligned score bug, 80px margin:
  x = 1920 - 300 - 80 = 1540

### Consistent Left Edge (Column Alignment)
When multiple elements should be left-aligned, give them ALL the same x value.
When they should be the same width, give them ALL the same width value.

### Padding Inside Containers
If a rect acts as a container with P pixels of internal padding:
  innerElement.x = container.x + P
  innerElement.y = container.y + P
  innerElement.width = container.width - (2 * P)
  innerElement.height = container.height - (2 * P)

### Design Checklist (Verify Before Output)
Before returning your JSON, mentally verify:
1. No text element overflows its parent rect (text.x >= rect.x AND text.x + text.width <= rect.x + rect.width)
2. Vertically stacked elements have correct y math (next.y = prev.y + prev.height + gap)
3. All elements that should be left-aligned share the same x value
4. All elements that should be the same width share the same width value
5. Text is vertically centered in its bar using the formula above
6. Nothing extends beyond the safe area (x: 80–1840, y: 50–1030)

## Element Types and Their Rules

### rect
- A filled rectangle. Use for backgrounds, bars, panels, overlays.
- fill: hex color (required)
- cornerRadius: optional, for rounded corners

### circle
- A filled circle. Use for score bugs, indicators, avatars.
- width and height MUST be equal for a perfect circle.

### text
- A text label. MUST have a non-empty \`text\` field.
- fontFamily: use common broadcast fonts e.g. "Arial", "Roboto", "Inter", "Montserrat"
- fontWeight: "normal", "bold", "700" etc.
- fontSize: in pixels — typical range 24–120px for broadcast
- align: "left", "center", or "right"
- fill: the TEXT colour (hex)
- width MUST be wide enough for the text content — estimate ~0.6 × fontSize per character for typical fonts.

### image
- fill MUST always be "transparent" for image elements.
- src must be a full URL.

## Animation Rules
- inAnimation: plays when graphic is taken to air
- outAnimation: plays when graphic is cleared
- type options: "fade", "slide-left", "slide-right", "slide-up", "slide-down", "scale"
- duration: seconds (0.3–1.0 is typical for broadcast)
- ease: GSAP ease string e.g. "power2.out", "power2.inOut", "back.out(1.7)"

## Broadcast Design Conventions
- Lower thirds: positioned in bottom 20–25% of canvas (y: 750–900)
- Score bugs: typically top-right or top-center, compact
- Full-screen overlays: semi-transparent background (opacity 0.7–0.9) over full canvas
- Standard lower third: a name bar (height 60–80px) with a subtitle bar directly below (height 40–55px), both sharing the same x and width
- Safe area: keep important content within x: 80–1840, y: 50–1030

## Output Format
Return ONLY a valid JSON object. No markdown, no explanation, no code fences.
The JSON must match this exact structure:

{
  "name": "string — short display name for this graphic",
  "config": {
    "width": 1920,
    "height": 1080,
    "background": "transparent"
  },
  "elements": [
    {
      "id": "uuid-string",
      "type": "rect|circle|text|image",
      "name": "human readable layer name",
      "x": 0, "y": 0, "width": 100, "height": 50,
      "fill": "#FFFFFF",
      "opacity": 1.0,
      "zIndex": 0,
      "rotation": 0, "scaleX": 1.0, "scaleY": 1.0,
      "isVisible": true, "isLocked": false,
      "inAnimation": { "type": "fade", "duration": 0.5, "delay": 0.0, "ease": "power2.out" },
      "outAnimation": { "type": "fade", "duration": 0.4, "delay": 0.0, "ease": "power2.in" }
    }
  ]
}

Generate UUIDs for each element id (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).
Always include inAnimation and outAnimation on every element.
Layer elements logically — backgrounds first (low zIndex), text last (high zIndex).

## Worked Example: Lower Third

Prompt: "Create a lower third for 'Jane Doe', title 'Senior Correspondent'"

Step-by-step layout math:
- Name bar: x=100, y=850, width=600, height=70
- Name text: x=100, y=850+(70/2)-(40/2)=865, width=600, height=40, fontSize=40, align="left", padded → x=120, width=560
- Subtitle bar: x=100, y=850+70+4=924, width=600, height=45
- Subtitle text: x=100, y=924+(45/2)-(26/2)=933, width=600, height=26, fontSize=26, align="left", padded → x=120, width=560

This produces elements that are flush-stacked, column-aligned, and have text
vertically centered within each bar.
`.trim();

// ── Validation helpers (mirrors models.py) ────────────────────────────────────

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_ANIM_TYPES = new Set(["fade", "slide-left", "slide-right", "slide-up", "slide-down", "scale"]);
const VALID_ELEMENT_TYPES = new Set(["rect", "circle", "text", "image"]);
const VALID_ALIGN = new Set(["left", "center", "right"]);

function validateDesign(raw: unknown): GraphicDesign {
  if (!raw || typeof raw !== "object") throw new Error("Response is not a JSON object");

  const obj = raw as Record<string, unknown>;

  if (typeof obj.name !== "string" || !obj.name.trim()) throw new Error("'name' must be a non-empty string");
  if (!obj.config || typeof obj.config !== "object") throw new Error("'config' is required");
  if (!Array.isArray(obj.elements) || obj.elements.length === 0) throw new Error("'elements' must be a non-empty array");

  // Validate config
  const cfg = obj.config as Record<string, unknown>;
  if (typeof cfg.width !== "number" || cfg.width <= 0) throw new Error("config.width must be a positive number");
  if (typeof cfg.height !== "number" || cfg.height <= 0) throw new Error("config.height must be a positive number");
  if (typeof cfg.background !== "string") throw new Error("config.background must be a string");
  if (cfg.background !== "transparent" && !HEX_RE.test(cfg.background as string)) {
    throw new Error(`config.background must be a hex colour or 'transparent', got: ${cfg.background}`);
  }

  const elements: CanvasElement[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < obj.elements.length; i++) {
    const el = obj.elements[i] as Record<string, unknown>;
    const prefix = `elements[${i}]`;

    if (typeof el.id !== "string" || !el.id) throw new Error(`${prefix}.id must be a non-empty string`);
    if (seenIds.has(el.id)) throw new Error(`${prefix}.id '${el.id}' is a duplicate`);
    seenIds.add(el.id);

    if (!VALID_ELEMENT_TYPES.has(el.type as string)) {
      throw new Error(`${prefix}.type must be rect|circle|text|image, got: ${el.type}`);
    }
    if (typeof el.name !== "string") throw new Error(`${prefix}.name must be a string`);
    if (typeof el.x !== "number") throw new Error(`${prefix}.x must be a number`);
    if (typeof el.y !== "number") throw new Error(`${prefix}.y must be a number`);
    if (typeof el.width !== "number" || el.width <= 0) throw new Error(`${prefix}.width must be > 0`);
    if (typeof el.height !== "number" || el.height <= 0) throw new Error(`${prefix}.height must be > 0`);

    if (typeof el.fill !== "string") throw new Error(`${prefix}.fill must be a string`);
    if (el.fill !== "transparent" && !HEX_RE.test(el.fill as string)) {
      throw new Error(`${prefix}.fill must be a hex colour or 'transparent', got: ${el.fill}`);
    }

    if (el.opacity !== undefined && (typeof el.opacity !== "number" || el.opacity < 0 || el.opacity > 1)) {
      throw new Error(`${prefix}.opacity must be 0.0–1.0`);
    }

    if (el.align !== undefined && !VALID_ALIGN.has(el.align as string)) {
      throw new Error(`${prefix}.align must be left|center|right`);
    }

    // Validate animations (optional)
    for (const animKey of ["inAnimation", "outAnimation"] as const) {
      const anim = el[animKey];
      if (anim !== undefined && anim !== null) {
        const a = anim as Record<string, unknown>;
        if (!VALID_ANIM_TYPES.has(a.type as string)) {
          throw new Error(`${prefix}.${animKey}.type must be a valid animation type, got: ${a.type}`);
        }
        if (typeof a.duration !== "number" || a.duration < 0.1) {
          throw new Error(`${prefix}.${animKey}.duration must be >= 0.1`);
        }
      }
    }

    // Business rule warnings (mirrors models.py validate_element_rules)
    const type = el.type as string;
    if (type === "image" && el.fill !== "transparent") {
      console.warn(`⚠️  Element '${el.name}' is type 'image' but fill is '${el.fill}' — should be 'transparent'`);
    }
    if (type === "text" && !el.text) {
      console.warn(`⚠️  Element '${el.name}' is type 'text' but has no text content`);
    }
    if ((el.x as number) > (cfg.width as number) || (el.y as number) > (cfg.height as number)) {
      console.warn(`⚠️  Element '${el.name}' at (${el.x}, ${el.y}) is outside the canvas`);
    }

    elements.push(el as unknown as CanvasElement);
  }

  return {
    name: obj.name as string,
    config: obj.config as CanvasConfig,
    elements,
  };
}

function ensureUuids(design: GraphicDesign): GraphicDesign {
  for (const el of design.elements) {
    if (!UUID_RE.test(el.id)) {
      el.id = uuidv4();
    }
  }
  return design;
}

function parseLlmResponse(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip markdown code fences if present
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split("\n");
    const inner = lines[lines.length - 1].trim() === "```"
      ? lines.slice(1, -1)
      : lines.slice(1);
    return JSON.parse(inner.join("\n"));
  }
  return JSON.parse(trimmed);
}

// ── LLM call ──────────────────────────────────────────────────────────────────

async function callLlm(
  client: GoogleGenAI,
  contents: { role: string; parts: { text: string }[] }[],
): Promise<string> {
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
      candidateCount: 1,
    },
  });
  return response.text ?? "";
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate and validate a graphic design from a natural language prompt.
 * Mirrors pipeline.py#generate_only().
 *
 * @param prompt           Natural-language description of the graphic
 * @param apiKey           Gemini API key (supplied per-request from the client)
 * @param maxRetries       Number of retry attempts on bad LLM output (default 3)
 * @param currentDesignJson  Optional JSON string of an existing design to modify
 */
export async function generateOnly(
  prompt: string,
  apiKey: string,
  maxRetries = 3,
  currentDesignJson?: string,
): Promise<GraphicDesign> {
  // NEW: Create the client lazily per-call so the key comes from the request, not the env
  const client = new GoogleGenAI({ apiKey });

  type Turn = { role: string; parts: { text: string }[] };
  const contents: Turn[] = [];

  if (currentDesignJson) {
    const userMessage =
      `Here is the existing graphic JSON:\n\`\`\`json\n${currentDesignJson}\n\`\`\`\n\n` +
      `Modification Request: ${prompt}\n\n` +
      `Please modify this JSON based on the request and return the complete updated JSON. ` +
      `IMPORTANT: Preserve all existing 'id' fields (UUIDs) for elements you modify or keep. ` +
      `If adding new elements, generate new UUIDs for them.`;
    contents.push({ role: "user", parts: [{ text: userMessage }] });
  } else {
    contents.push({ role: "user", parts: [{ text: prompt }] });
  }

  let lastError = "";
  let lastRaw = "";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      lastRaw = await callLlm(client, contents);

      if (!lastRaw.trim()) {
        throw new Error(
          "Model returned empty content. Check that the API key is valid and the model responded.",
        );
      }

      const rawJson = parseLlmResponse(lastRaw);
      const design = validateDesign(rawJson);
      return ensureUuids(design);

    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️  AI attempt ${attempt + 1} failed: ${lastError}`);

      if (attempt < maxRetries - 1) {
        // Multi-turn retry — show the model its broken output and ask it to fix it
        contents.push({ role: "model", parts: [{ text: lastRaw }] });
        contents.push({
          role: "user", parts: [{
            text:
              `Your previous response had errors. Fix them and return corrected JSON only.\n` +
              `Original request: ${prompt}\n` +
              `Errors: ${lastError}`,
          }]
        });
      }
    }
  }

  throw new Error(`AI pipeline failed after ${maxRetries} attempts. Last error: ${lastError}`);
}
