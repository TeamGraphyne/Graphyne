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

// FIX: System/generic fonts that should NEVER be sent to Google Fonts
const SYSTEM_FONTS = new Set([
  'arial',
  'helvetica',
  'times new roman',
  'times',
  'courier new',
  'courier',
  'verdana',
  'georgia',
  'palatino',
  'garamond',
  'bookman',
  'trebuchet ms',
  'comic sans ms',
  'impact',
  'tahoma',
  'lucida console',
  'lucida sans unicode',
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
]);

// FIX: Extract the primary font name from a CSS font-family string
// e.g. "'Roboto', sans-serif" → "Roboto", "Arial, sans-serif" → "Arial"
const extractPrimaryFont = (fontFamily: string): string => {
  const first = fontFamily.split(',')[0].trim();
  // Remove surrounding quotes (single or double)
  return first.replace(/^['"]|['"]$/g, '');
};

// FIX: Check whether a font is a system/generic font
const isSystemFont = (fontFamily: string): boolean => {
  const primary = extractPrimaryFont(fontFamily);
  return SYSTEM_FONTS.has(primary.toLowerCase());
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

  // FIX: Collect unique fonts, EXCLUDING system fonts
  // We should also map the weights for Google Fonts if possible, but standard is swap
  const usedFonts = Array.from(new Set(
    processedElements
      .filter(el => el.type === 'text' && el.fontFamily && !isSystemFont(el.fontFamily))
      .map(el => extractPrimaryFont(el.fontFamily!))
  ));

  // Create Google Fonts link — only if there are actual Google Fonts to load
  // Include standard weights 300,400,600,700,900 for flexibility
  const fontLink = usedFonts.length > 0
    ? `<link href="https://fonts.googleapis.com/css2?family=${usedFonts.map(f => f.replace(/ /g, '+') + ':ital,wght@0,300;0,400;0,600;0,700;0,900;1,400;1,700').join('&family=')}&display=swap" rel="stylesheet">`
    : '';

  // 1. GENERATE CSS (Positioning & Styling)
  const generateStyles = (el: CanvasElement) => {
    let css = `
      position: absolute;
      left: ${el.x}px;
      top: ${el.y}px;
      width: ${el.width}px;
      height: ${el.height}px;
      transform-origin: top left;
      transform: rotate(${el.rotation || 0}deg) scale(${el.scaleX || 1}, ${el.scaleY || 1});
      opacity: 0; /* Start hidden for animation */
      z-index: ${el.zIndex || 0};
      ${el.blendMode && el.blendMode !== 'source-over' ? `mix-blend-mode: ${el.blendMode};` : ''}
    `;

    // Handle Shadows
    let shadowCss = '';
    if (el.shadow) {
      const { color, blur, offsetX, offsetY } = el.shadow;
      if (blur > 0 || offsetX !== 0 || offsetY !== 0) {
        shadowCss = `${offsetX}px ${offsetY}px ${blur}px ${color}`;
      }
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
        line-height: ${el.lineHeight || 1.2};
        ${el.fontWeight ? `font-weight: ${el.fontWeight};` : ''}
        ${el.fontStyle && el.fontStyle !== 'normal' ? `font-style: ${el.fontStyle};` : ''}
        ${shadowCss ? `text-shadow: ${shadowCss};` : ''} 
      `;
    } else {
      let backgroundCss = `background-color: ${el.fill};`;
      if (el.fillType === 'linear' && el.fillSecondary) {
        backgroundCss = `background: linear-gradient(to right, ${el.fill}, ${el.fillSecondary});`;
      } else if (el.fillType === 'radial' && el.fillSecondary) {
        backgroundCss = `background: radial-gradient(circle, ${el.fill}, ${el.fillSecondary});`;
      }

      css += `
        ${backgroundCss}
        border-radius: ${el.cornerRadius || 0}px;
        ${(el.stroke && el.strokeWidth && el.strokeWidth > 0) ? `border: ${el.strokeWidth}px solid ${el.stroke};` : ''}
        ${shadowCss ? `box-shadow: ${shadowCss};` : ''}
      `;
    }

    if (el.type === 'image' && el.src) {
      css += `background-image: url('${el.src}'); background-size: cover;`;
    }

    return css.replace(/\s+/g, ' '); // Minify styles
  };

  // 2. GENERATE DOM ELEMENTS
  const domElements = processedElements.map(el => {
    // Wrap text inside a span so we can measure its exact width/height for shrink-to-fit
    if (el.type === 'text') {
      const content = escapeHtml(el.text);
      return `<div id="gfx-${el.id}" style="${generateStyles(el)}" data-original-font-size="${el.fontSize || 24}">
          <span class="text-inner">${content}</span>
      </div>`;
    } else {
      return `<div id="gfx-${el.id}" style="${generateStyles(el)}"></div>`;
    }
  }).join('\n');

  // 3. EMBED ANIMATION LOGIC (GSAP + Triggers)
  const scriptLogic = `
    const tlIn = gsap.timeline({ paused: true });
    const tlOut = gsap.timeline({ paused: true });
    
    // Process Data
    const elements = ${JSON.stringify(processedElements).replace(/<\/script>/g, '<\\/script>')};
    
    // ========== FEATURE: AUTO TEXT SHRINK ==========
    function fitText(domEl) {
        if (!domEl.hasAttribute('data-original-font-size')) return;
        var originalSize = parseFloat(domEl.getAttribute('data-original-font-size'));
        domEl.style.fontSize = originalSize + 'px'; // Reset to standard size
        
        var span = domEl.querySelector('.text-inner');
        if (!span) return;
        
        var currentSize = originalSize;
        // Keep dropping the font size down by 1px until the span stops overflowing the div boundaries (with a 5px tolerance)
        while ((span.offsetWidth > domEl.clientWidth + 3 || span.offsetHeight > domEl.clientHeight + 5) && currentSize > 4) {
            currentSize -= 1;
            domEl.style.fontSize = currentSize + 'px';
        }
    }

    elements.forEach(el => {
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

    // Run text fit initially for all text elements
    document.querySelectorAll('[data-original-font-size]').forEach(fitText);

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
        // Handle animation commands (existing)
        const cmd = typeof event.data === 'string' ? event.data : event.data.command;
        if (cmd === 'play' || cmd === 'take') window.playIn();
        if (cmd === 'stop' || cmd === 'out' || cmd === 'clear') window.playOut();

        // --- DATA BINDING LISTENER ---
        if (event.data && event.data.type === 'data:update') {
            var updates = event.data.updates || [];
            for (var i = 0; i < updates.length; i++) {
                var u = updates[i];
                var domEl = document.getElementById(u.elementId);
                if (!domEl) continue;

                switch (u.property) {
                    case 'text':
                        // Check if it has our inner wrapper
                        var span = domEl.querySelector('.text-inner');
                        if (span) {
                            span.textContent = u.value;
                            fitText(domEl); // Re-calculate fit instantly
                        } else {
                            domEl.textContent = u.value;
                        }
                        break;
                    case 'fill':
                        if (domEl.style.color) {
                            domEl.style.color = u.value;
                        } else {
                            domEl.style.backgroundColor = u.value;
                        }
                        break;
                    case 'src':
                        domEl.style.backgroundImage = "url('" + u.value + "')";
                        break;
                    case 'opacity':
                        domEl.style.opacity = u.value;
                        break;
                    case 'fontSize':
                        if (domEl.hasAttribute('data-original-font-size')) {
                            domEl.setAttribute('data-original-font-size', u.value);
                            fitText(domEl);
                        } else {
                            domEl.style.fontSize = u.value + 'px';
                        }
                        break;
                }
            }
        }
    });
  `;

  // 4. RETURN FINAL HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Graphyne Export</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js"></script>
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
    <script>
      // NEW: Snapshot handler — captures #gfx-container at requested scale
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'snapshot') {
          var scale = event.data.scale || 3;
          var container = document.getElementById('gfx-container');
          if (!container || typeof htmlToImage === 'undefined') {
            window.parent.postMessage({ type: 'snapshot-result', error: 'Not ready' }, '*');
            return;
          }
          htmlToImage.toPng(container, {
            pixelRatio: scale,
            backgroundColor: null,
            width: ${config.width},
            height: ${config.height}
          }).then(function(dataUrl) {
            window.parent.postMessage({ type: 'snapshot-result', dataUrl: dataUrl }, '*');
          }).catch(function(err) {
            window.parent.postMessage({ type: 'snapshot-result', error: String(err) }, '*');
          });
        }
      });
    </script>
</body>
</html>`;
};