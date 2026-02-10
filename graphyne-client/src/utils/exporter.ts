import type { CanvasElement, CanvasConfig } from '../types/canvas';

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
    return blobUrl;
  }
};

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

  // 1. Pre-process Images
  const processedElements = await Promise.all(elements.map(async (el) => {
    const newEl = { ...el };
    if (newEl.type === 'image' && newEl.src && newEl.src.startsWith('blob:')) {
      newEl.src = await blobToBase64(newEl.src);
    }
    return newEl;
  }));

  // 2. Collect Fonts
  const usedFonts = Array.from(new Set(
    processedElements
      .filter(el => el.type === 'text' && el.fontFamily)
      .map(el => el.fontFamily)
  ));
  
  const fontLink = usedFonts.length > 0
    ? `<link href="https://fonts.googleapis.com/css2?family=${usedFonts.map(f => f?.replace(/ /g, '+')).join('&family=')}&display=swap" rel="stylesheet">`
    : '';

  // 3. Generate Styles
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

    return css.replace(/\s+/g, ' ');
  };

  // 4. Generate DOM (With GFX Prefix)
  const domElements = processedElements.map(el => {
    const content = el.type === 'text' ? escapeHtml(el.text) : '';
    return `<div id="gfx-${el.id}" style="${generateStyles(el)}">${content}</div>`;
  }).join('\n');

  // 5. Generate Script Logic
  const scriptLogic = `
    // Safety check for GSAP
    if (typeof gsap === 'undefined') {
        console.error("GSAP failed to load. Check internet connection or CDN.");
        document.body.innerHTML += '<div style="color:red; font-size:20px; background:white;">Error: GSAP Not Found</div>';
    }

    const tlIn = gsap.timeline({ paused: true });
    const tlOut = gsap.timeline({ paused: true });
    
    const elements = ${JSON.stringify(processedElements).replace(/<\/script>/g, '<\\/script>')};
    
    elements.forEach(el => {
      // 1. Target the Prefixed ID
      const target = "#gfx-" + el.id;
      
      const targetOpacity = typeof el.opacity === 'number' ? el.opacity : 1;
      const inAnim = el.inAnimation || { type: 'fade', duration: 0.5, delay: 0 };
      const inEase = inAnim.ease || "power2.out";

      gsap.set(target, { opacity: 0 }); 

      // --- IN ANIMATION ---
      switch(inAnim.type) {
        case 'slide-left':
          gsap.set(target, { x: -100 });
          tlIn.to(target, { x: 0, opacity: targetOpacity, duration: inAnim.duration, ease: inEase }, inAnim.delay);
          break;
        case 'slide-right':
          gsap.set(target, { x: 100 });
          tlIn.to(target, { x: 0, opacity: targetOpacity, duration: inAnim.duration, ease: inEase }, inAnim.delay);
          break;
        case 'slide-up':
          gsap.set(target, { y: 100 });
          tlIn.to(target, { y: 0, opacity: targetOpacity, duration: inAnim.duration, ease: inEase }, inAnim.delay);
          break;
        case 'slide-down':
          gsap.set(target, { y: -100 });
          tlIn.to(target, { y: 0, opacity: targetOpacity, duration: inAnim.duration, ease: inEase }, inAnim.delay);
          break;
        case 'scale':
          gsap.set(target, { scale: 0 });
          tlIn.to(target, { scale: 1, opacity: targetOpacity, duration: inAnim.duration, ease: "back.out(1.7)" }, inAnim.delay);
          break;
        default:
          tlIn.to(target, { opacity: targetOpacity, duration: inAnim.duration, ease: inEase }, inAnim.delay);
      }

      // --- OUT ANIMATION ---
      if (el.outAnimation) {
        const outAnim = el.outAnimation;
        const outEase = outAnim.ease || "power2.in"; 

        switch(outAnim.type) {
            case 'slide-left': tlOut.to(target, { x: -100, opacity: 0, duration: outAnim.duration, ease: outEase }, outAnim.delay); break;
            case 'slide-right': tlOut.to(target, { x: 100, opacity: 0, duration: outAnim.duration, ease: outEase }, outAnim.delay); break;
            case 'slide-up': tlOut.to(target, { y: -100, opacity: 0, duration: outAnim.duration, ease: outEase }, outAnim.delay); break;
            case 'slide-down': tlOut.to(target, { y: 100, opacity: 0, duration: outAnim.duration, ease: outEase }, outAnim.delay); break;
            case 'scale': tlOut.to(target, { scale: 0, opacity: 0, duration: outAnim.duration, ease: "back.in(1.7)" }, outAnim.delay); break;
            default: tlOut.to(target, { opacity: 0, duration: outAnim.duration, ease: outEase }, outAnim.delay);
        }
      }
    });

    // --- CONTROLLERS ---
    window.playIn = () => tlIn.restart();
    window.playOut = () => {
        if (tlOut.getChildren().length > 0) tlOut.restart();
        else tlIn.reverse();
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

        // --- DATA BINDING FIX ---
        if (event.data && event.data.type === 'data:update') {
            const updates = event.data.updates || [];
            updates.forEach(u => {
                // ✅ FIX: Use "gfx-" prefix to find the DOM element
                const el = document.getElementById("gfx-" + u.elementId);
                if (!el) return;

                switch (u.property) {
                    case 'text': el.textContent = u.value; break;
                    case 'fill': 
                        if (el.style.color) el.style.color = u.value;
                        else el.style.backgroundColor = u.value;
                        break;
                    case 'src': el.style.backgroundImage = "url('" + u.value + "')"; break;
                    case 'opacity': el.style.opacity = u.value; break;
                    case 'fontSize': el.style.fontSize = u.value + 'px'; break;
                }
            });
        }
    });
  `;

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