"""
Graphyne AI Design Pipeline
============================
Exposes two entry points:
  - generate_only(prompt)  → returns validated design as dict (for API mode / Option A)
  - run_pipeline(prompt)   → generates + saves to Graphyne (for CLI mode / Option B)

Usage (CLI):
    python pipeline.py "lower third with player name JOHN DOE, position MIDFIELDER"

Requires:
    GEMINI_API_KEY  — Google AI Studio API key (https://aistudio.google.com/app/apikey)
    GEMINI_MODEL    — optional, defaults to gemini-2.0-flash-lite
"""

import os
import sys
import json
import uuid
import re
import requests
from dotenv import load_dotenv
from pydantic import ValidationError

from google import genai
from google.genai import types

from models import GraphicDesign, CanvasConfig, CanvasElement

load_dotenv()

GRAPHYNE_URL   = os.getenv("GRAPHYNE_URL",  "http://localhost:3001")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL",  "gemini-2.0-flash-lite")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

if not GEMINI_API_KEY:
    print("❌ GEMINI_API_KEY is not set. Add it to graphyne-ai/.env", file=sys.stderr)
    sys.exit(1)

# Single shared client — google.genai replaces the old google.generativeai
_client = genai.Client(api_key=GEMINI_API_KEY)

# ── System Prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
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
To place an element's right edge at a distance `margin` from the canvas right:
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
- A text label. MUST have a non-empty `text` field.
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
"""

# ── LLM Call ──────────────────────────────────────────────────────────────────

def _call_llm(contents: list[types.Content]) -> str:
    """
    Call Gemini via the new google.genai SDK and return the raw text response.

    system_instruction is passed in GenerateContentConfig — Gemini keeps it
    separate from the user/model conversation turns, equivalent to OpenAI's
    system role message.
    """
    response = _client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,       # low = deterministic JSON output
            candidate_count=1,
        ),
    )
    return response.text or ""


# ── Shared Steps ──────────────────────────────────────────────────────────────

def _parse_llm_response(raw: str) -> dict:
    """Strip markdown fences if present and parse JSON."""
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    return json.loads(raw)


def _validate(raw_json: dict) -> GraphicDesign:
    """Validate raw dict against Pydantic schema. Raises ValueError on failure."""
    try:
        design = GraphicDesign.model_validate(raw_json)
    except ValidationError as e:
        error_lines = []
        for err in e.errors():
            location = " → ".join(str(loc) for loc in err['loc'])
            error_lines.append(f"  • {location}: {err['msg']}")
        raise ValueError("Schema validation failed:\n" + "\n".join(error_lines))

    warnings = design.validate_element_rules()
    for w in warnings:
        print(f"⚠️  {w}", file=sys.stderr)

    return design


def _ensure_uuids(design: GraphicDesign) -> GraphicDesign:
    """Replace any non-UUID element IDs with fresh UUIDs."""
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    for el in design.elements:
        if not re.match(uuid_pattern, el.id, re.IGNORECASE):
            el.id = str(uuid.uuid4())
    return design


def _to_dict(design: GraphicDesign) -> dict:
    """Serialise to a plain dict matching the { name, config, elements } shape."""
    return {
        "name": design.name,
        "config": design.config.model_dump(),
        "elements": [el.model_dump() for el in design.elements],
    }


# ── Public API ────────────────────────────────────────────────────────────────

def generate_only(prompt: str, max_retries: int = 3) -> dict:
    """
    Generate and validate a graphic design from a natural language prompt.
    Returns the validated design as a plain dict — does NOT save to Graphyne.

    This is the entry point used by the Fastify /api/ai/generate route.
    The client receives the dict and loads it as a draft into the Redux editor state.
    """
    # google.genai uses types.Content objects for multi-turn conversation
    # "model" is the role name for assistant turns (not "assistant")
    contents: list[types.Content] = [
        types.Content(role="user", parts=[types.Part(text=prompt)]),
    ]

    last_error: str | None = None
    last_raw: str = ""

    for attempt in range(max_retries):
        try:
            last_raw = _call_llm(contents)

            if not last_raw.strip():
                raise ValueError(
                    "Model returned empty content. "
                    "Check that GEMINI_API_KEY is valid and the model responded."
                )

            raw_json = _parse_llm_response(last_raw)
            design   = _validate(raw_json)
            design   = _ensure_uuids(design)
            return _to_dict(design)

        except (ValueError, json.JSONDecodeError) as e:
            last_error = str(e)
            print(f"⚠️  Attempt {attempt + 1} failed: {last_error}", file=sys.stderr)

            if attempt < max_retries - 1:
                # Extend the conversation so the model sees its broken output
                # and the correction request — proper multi-turn retry
                contents.append(types.Content(role="model", parts=[types.Part(text=last_raw)]))
                contents.append(types.Content(role="user",  parts=[types.Part(text=(
                    f"Your previous response had errors. "
                    f"Fix them and return corrected JSON only.\n"
                    f"Original request: {prompt}\n"
                    f"Errors: {last_error}"
                ))]))
            else:
                raise RuntimeError(
                    f"Pipeline failed after {max_retries} attempts.\n"
                    f"Last error: {last_error}"
                )

    raise RuntimeError("Unexpected exit")


def run_pipeline(prompt: str, project_id: str | None = None, max_retries: int = 3) -> dict:
    """
    Full pipeline: generate → validate → save to Graphyne via REST API.
    Used by the CLI and for Option B (immediate playout).
    """
    design_dict = generate_only(prompt, max_retries)

    payload = {
        "name": design_dict["name"],
        "html": "",
        "json": json.dumps({
            "config": design_dict["config"],
            "elements": design_dict["elements"],
        }),
    }
    if project_id:
        payload["projectId"] = project_id

    try:
        response = requests.post(f"{GRAPHYNE_URL}/api/graphics", json=payload, timeout=10)
        response.raise_for_status()
        result = response.json()
        print(f"🎉 Saved: {design_dict['name']} → {result.get('id')}", file=sys.stderr)
        return result
    except requests.exceptions.ConnectionError:
        raise ConnectionError(f"Could not connect to Graphyne at {GRAPHYNE_URL}")


# ── CLI entry point ──────────────��────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python pipeline.py "<description>" [project_id]')
        sys.exit(1)

    result = run_pipeline(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
    print(json.dumps(result, indent=2))