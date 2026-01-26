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

  // Create Google Fonts link
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

    // Handle Shadows
    let shadowCss = '';
    if (el.shadow) {
        const { color, blur, offsetX, offsetY } = el.shadow;
        shadowCss = `${offsetX}px ${offsetY}px ${blur}px ${color}`;
    }

    if (el.type === 'text') {
      css += `
        font-family: ${el.fontFamily || 'Arial, sans-serif'};
        font-size: ${el.fontSize || 24}px;
        color: ${el.fill};
        display: flex;
        align-items: center;
        text-align: ${el.align || 'left'};
        justify-content: ${el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start'};
        white-space: pre-wrap;
        ${shadowCss ? `text-shadow: ${shadowCss};` : ''} 
      `;
    } else {
      css += `
        background-color: ${el.fill};
        border-radius: ${el.cornerRadius || 0}px;
        ${el.stroke ? `border: ${el.strokeWidth || 1}px solid ${el.stroke};` : ''}
        ${shadowCss ? `box-shadow: ${shadowCss};` : ''}
      `;
    }

    if (el.type === 'image' && el.src) {
      css += `background-image: url('${el.src}'); background-size: cover;`;
    }

    return css.replace(/\s+/g, ' '); // Minify styles
  };

  // 2. GENERATE DOM ELEMENTS
  // ✅ FIX: Prefix ID with "gfx-" to prevent "not a valid selector" error
  const domElements = processedElements.map(el => {
    const content = el.type === 'text' ? escapeHtml(el.text) : '';
    return `<div id="gfx-${el.id}" style="${generateStyles(el)}">${content}</div>`;
  }).join('\n');

  // 3. EMBED ANIMATION LOGIC (GSAP + Triggers)
  const scriptLogic = `
    const tlIn = gsap.timeline({ paused: true });
    const tlOut = gsap.timeline({ paused: true });
    
    // Process Data
    const elements = ${JSON.stringify(processedElements).replace(/<\/script>/g, '<\\/script>')};
    
    elements.forEach(el => {
      // ✅ FIX: Target the prefixed ID
      const target = "#gfx-" + el.id;
      
      const targetOpacity = typeof el.opacity === 'number' ? el.opacity : 1;
      const inAnim = el.inAnimation || { type: 'fade', duration: 0.5, delay: 0 };
      const inEase = inAnim.ease || "power2.out";

      // Initialize State
      gsap.set(target, { opacity: 0 }); 

      // --- IN ANIMATION (Enter) ---
      switch(inAnim.type) {
        case 'slide-left': // Enters from Left
          gsap.set(target, { x: -100 });
          tlIn.to(target, { x: 0, opacity: targetOpacity, duration: inAnim.duration, ease: inEase }, inAnim.delay);
          break;
        case 'slide-right': // Enters from Right
          gsap.set(target, { x: 100 });
          tlIn.to(target, { x: 0, opacity: targetOpacity, duration: inAnim.duration, ease: inEase }, inAnim.delay);
          break;
        case 'slide-up': // Enters from Bottom (Moves Up)
          gsap.set(target, { y: 100 });
          tlIn.to(target, { y: 0, opacity: targetOpacity, duration: inAnim.duration, ease: inEase }, inAnim.delay);
          break;
        case 'slide-down': // Enters from Top (Moves Down)
          gsap.set(target, { y: -100 });
          tlIn.to(target, { y: 0, opacity: targetOpacity, duration: inAnim.duration, ease: inEase }, inAnim.delay);
          break;
        case 'scale': // Pop In
          gsap.set(target, { scale: 0 });
          tlIn.to(target, { scale: 1, opacity: targetOpacity, duration: inAnim.duration, ease: "back.out(1.7)" }, inAnim.delay);
          break;
        default: // fade
          tlIn.to(target, { opacity: targetOpacity, duration: inAnim.duration, ease: inEase }, inAnim.delay);
      }

      // --- OUT ANIMATION (Exit) ---
      if (el.outAnimation) {
        const outAnim = el.outAnimation;
        const outEase = outAnim.ease || "power2.in"; 

        switch(outAnim.type) {
            case 'slide-left': // Exits to Left
                tlOut.to(target, { x: -100, opacity: 0, duration: outAnim.duration, ease: outEase }, outAnim.delay);
                break;
            case 'slide-right': // Exits to Right
                tlOut.to(target, { x: 100, opacity: 0, duration: outAnim.duration, ease: outEase }, outAnim.delay);
                break;
            case 'slide-up': // Exits Up (Moves to -Y)
                tlOut.to(target, { y: -100, opacity: 0, duration: outAnim.duration, ease: outEase }, outAnim.delay);
                break;
            case 'slide-down': // Exits Down (Moves to +Y)
                tlOut.to(target, { y: 100, opacity: 0, duration: outAnim.duration, ease: outEase }, outAnim.delay);
                break;
            case 'scale': // Pop Out
                tlOut.to(target, { scale: 0, opacity: 0, duration: outAnim.duration, ease: "back.in(1.7)" }, outAnim.delay);
                break;
            default: // Fade Out
                tlOut.to(target, { opacity: 0, duration: outAnim.duration, ease: outEase }, outAnim.delay);
        }
      }
    });

    // --- CONTROLLERS ---
    window.playIn = () => tlIn.restart();
    window.playOut = () => {
        if (tlOut.getChildren().length > 0) {
            tlOut.restart();
        } else {
            tlIn.reverse();
        }
    };

    // --- TRIGGERS ---
    window.addEventListener('keydown', (e) => {
        if (e.key === '1') window.playIn();
        if (e.key === '2') window.playOut();
    });

    window.addEventListener('message', (event) => {
        const cmd = typeof event.data === 'string' ? event.data : event.data.command;
        if (cmd === 'play' || cmd === 'take') window.playIn();
        if (cmd === 'stop' || cmd === 'out' || cmd === 'clear') window.playOut();
    });
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