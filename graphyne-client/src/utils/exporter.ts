import type { CanvasElement, CanvasConfig } from '../types/canvas';

// Helper to convert Blob URL to Base64
const blobToBase64 = async (blobUrl: string): Promise<string> => {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Failed to convert blob to base64", e);
    return blobUrl; // Fallback to original if failed
  }
};

// Helper to escape HTML characters
const escapeHtml = (unsafe: string | undefined) => {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const compileGraphicToHTML = async (
  config: CanvasConfig,
  elements: CanvasElement[]
): Promise<string> => {

  // A. PRE-PROCESS ELEMENTS (Convert Images & Collect Fonts)
  const processedElements = await Promise.all(elements.map(async (el) => {
    const newEl = { ...el };
    if (newEl.type === 'image' && newEl.src && newEl.src.startsWith('blob:')) {
      newEl.src = await blobToBase64(newEl.src);
    }
    return newEl;
  }));

  // Collect unique fonts
  const usedFonts = Array.from(new Set(
    processedElements
      .filter(el => el.type === 'text' && el.fontFamily)
      .map(el => el.fontFamily)
  ));

  // Create Google Fonts link (simple implementation assuming standard Google Fonts names)
  const fontLink = usedFonts.length > 0
    ? `<link href="https://fonts.googleapis.com/css2?family=${usedFonts.map(f => f?.replace(/ /g, '+')).join('&family=')}&display=swap" rel="stylesheet">`
    : '';

  // 1. GENERATE CSS (Positioning & Styling)
  const generateStyles = (el: CanvasElement) => {
    let css = `
      position: absolute;
      left: ${el.x}px;
      top: ${el.y}px;
      width: ${el.width}px;
      height: ${el.height}px;
      transform: rotate(${el.rotation || 0}deg) scale(${el.scaleX || 1}, ${el.scaleY || 1});
      opacity: 0; /* Start hidden for animation */
      z-index: ${el.zIndex || 0};
    `;

    if (el.type === 'text') {
      css += `
        font-family: ${el.fontFamily || 'Arial, sans-serif'};
        font-size: ${el.fontSize || 24}px;
        color: ${el.fill};
        display: flex;
        align-items: center;
        /* Fix: Add text-align for multi-line text alignment */
        text-align: ${el.align || 'left'};
        justify-content: ${el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start'};
        white-space: pre-wrap;
      `;
    } else {
      css += `
        background-color: ${el.fill};
        border-radius: ${el.cornerRadius || 0}px;
        ${el.stroke ? `border: ${el.strokeWidth || 1}px solid ${el.stroke};` : ''}
      `;
    }

    // Image Handling
    if (el.type === 'image' && el.src) {
      css += `background-image: url('${el.src}'); background-size: cover;`;
    }

    return css.replace(/\s+/g, ' '); // Minify styles
  };

  // 2. GENERATE DOM ELEMENTS
  const domElements = processedElements.map(el => {
    // Fix: Escape text content
    const content = el.type === 'text' ? escapeHtml(el.text) : '';
    return `<div id="${el.id}" style="${generateStyles(el)}">${content}</div>`;
  }).join('\n');

  // 3. EMBED ANIMATION LOGIC (GSAP + Triggers)
  const scriptLogic = `
    const tl = gsap.timeline({ paused: true });
    
    // --- ANIMATION MAPPING ---
    const elements = ${JSON.stringify(processedElements).replace(/<\/script>/g, '<\\/script>')}; // Fix: Escape closing script tags
    
    elements.forEach(el => {
      const target = "#" + el.id;
      // Default to fade if no animation specified
      const anim = el.inAnimation || { type: 'fade', duration: 0.5, delay: 0 };
      
      const targetOpacity = typeof el.opacity === 'number' ? el.opacity : 1;
      
      gsap.set(target, { opacity: 0 }); // Init state

      switch(anim.type) {
        case 'slide-left':
          gsap.set(target, { x: -100 });
          tl.to(target, { x: 0, opacity: targetOpacity, duration: anim.duration, ease: "power2.out" }, anim.delay);
          break;
        case 'slide-right':
          gsap.set(target, { x: 100 });
          tl.to(target, { x: 0, opacity: targetOpacity, duration: anim.duration, ease: "power2.out" }, anim.delay);
          break;
        case 'scale':
          gsap.set(target, { scale: 0 });
          tl.to(target, { scale: 1, opacity: targetOpacity, duration: anim.duration, ease: "back.out(1.7)" }, anim.delay);
          break;
        default: // fade
          tl.to(target, { opacity: targetOpacity, duration: anim.duration }, anim.delay);
      }
    });

    // --- CONTROLLERS ---
    window.playIn = () => tl.restart();
    window.playOut = () => tl.reverse();

    // --- TRIGGERS ---
    
    // 1. Keyboard (1 = IN, 2 = OUT)
    window.addEventListener('keydown', (e) => {
        if (e.key === '1') window.playIn();
        if (e.key === '2') window.playOut();
    });

    // 2. API / Socket Commands
    window.addEventListener('message', (event) => {
        const cmd = typeof event.data === 'string' ? event.data : event.data.command;
        if (cmd === 'play' || cmd === 'take') window.playIn();
        if (cmd === 'stop' || cmd === 'out' || cmd === 'clear') window.playOut();
    });

    // Auto-play for testing
    // window.playIn();
  `;

  // 4. RETURN FINAL HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Graphyne Export</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    ${fontLink}
    <style>
        body { margin: 0; overflow: hidden; background: transparent; }
        #gfx-container {
            position: relative;
            width: ${config.width}px;
            height: ${config.height}px;
            overflow: hidden;
            background-color: transparent;
        }
    </style>
</head>
<body>
    <div id="gfx-container">
        ${domElements}
    </div>
    <script id="graphyne-source" type="application/json">
        ${JSON.stringify({ config, elements })}
    </script>
    <script>${scriptLogic}</script>
</body>
</html>`;
};