"""
Graphyne AI Design Pipeline
============================
Exposes two entry points:
  - generate_only(prompt)  → returns validated design as dict (for API mode / Option A)
  - run_pipeline(prompt)   → generates + saves to Graphyne (for CLI mode / Option B)

Usage (CLI):
    python pipeline.py "lower third with team name LEFT FC and score 2-1"
"""

import os
import sys
import json
import uuid
import re
import requests
from dotenv import load_dotenv
from pydantic import ValidationError

from agno.agent import Agent
from agno.models.openai import OpenAIChat

from models import GraphicDesign, CanvasConfig, CanvasElement

load_dotenv()

GRAPHYNE_URL = os.getenv("GRAPHYNE_URL", "http://localhost:3001")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

# ── System Prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
You are a broadcast graphics designer for Graphyne, a real-time HTML-based
broadcast graphics engine. Your job is to design graphics by outputting a
valid JSON object that exactly matches the Graphyne canvas schema.

## Canvas Rules
- Default canvas: 1920x1080 pixels (16:9 broadcast standard)
- Coordinate origin (0,0) is TOP-LEFT
- zIndex: higher numbers appear on top
- All colours must be valid CSS hex strings (e.g. "#FF0000") or "transparent"
- opacity: 0.0 (invisible) to 1.0 (fully opaque)

## Element Types and Their Rules

### rect
- A filled rectangle. Use for backgrounds, bars, panels, overlays.
- fill: hex color (required)
- cornerRadius: optional, for rounded corners

### circle
- A filled circle. Use for score bugs, indicators, avatars.
- width and height should be equal for a perfect circle.

### text
- A text label. MUST have a non-empty `text` field.
- fontFamily: use common broadcast fonts e.g. "Arial", "Roboto", "Inter", "Montserrat"
- fontWeight: "normal", "bold", "700" etc.
- fontSize: in pixels — typical range 24-120px for broadcast
- align: "left", "center", or "right"
- fill: the TEXT colour (hex)

### image
- fill MUST always be "transparent" for image elements.
- src must be a full URL.

## Animation Rules
- inAnimation: plays when graphic is taken to air
- outAnimation: plays when graphic is cleared
- type options: "fade", "slide-left", "slide-right", "slide-up", "slide-down", "scale"
- duration: seconds (0.3-1.0 is typical for broadcast)
- ease: GSAP ease string e.g. "power2.out", "power2.inOut", "back.out(1.7)"

## Broadcast Design Conventions
- Lower thirds: positioned in bottom 20-25% of the canvas (y: 750-900)
- Score bugs: typically top-right or top-center, compact
- Full-screen overlays: semi-transparent background (opacity 0.7-0.9) over full canvas
- Standard lower third height: 80-120px for the bar, 40-60px for text
- Safe area: keep important content within x: 80-1840, y: 50-1030

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
"""


# ── Agent ─────────────────────────────────────────────────────────────────────

def create_agent() -> Agent:
    return Agent(
        model=OpenAIChat(id=OPENAI_MODEL),
        system_prompt=SYSTEM_PROMPT,
        markdown=False,
    )


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

    This is the entry point used by the Fastify /api/ai/generate route (Option A).
    The client receives the dict and loads it as a draft into the Redux editor state.

    Args:
        prompt:      Natural language description of the graphic
        max_retries: Retry attempts if the LLM returns invalid JSON

    Returns:
        { name, config, elements } dict matching Graphyne's CanvasState shape
    """
    agent = create_agent()
    last_error: str | None = None

    for attempt in range(max_retries):
        try:
            if attempt == 0:
                raw_text = agent.run(prompt).content
            else:
                correction = f"""
Your previous response had errors. Fix them and return corrected JSON only.
Original request: {prompt}
Errors: {last_error}
"""
                raw_text = agent.run(correction).content

            raw_json = _parse_llm_response(raw_text)
            design   = _validate(raw_json)
            design   = _ensure_uuids(design)
            return _to_dict(design)

        except (ValueError, json.JSONDecodeError) as e:
            last_error = str(e)
            if attempt == max_retries - 1:
                raise RuntimeError(
                    f"Pipeline failed after {max_retries} attempts.\nLast error: {last_error}"
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


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python pipeline.py "<description>" [project_id]')
        sys.exit(1)

    result = run_pipeline(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
    print(json.dumps(result, indent=2))