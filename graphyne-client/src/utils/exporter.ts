import type { CanvasElement, CanvasConfig } from '../types/canvas';

export const compileGraphicToHTML = (
  config: CanvasConfig,
  elements: CanvasElement[]
): string => {

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
  const domElements = elements.map(el => {
    return `<div id="${el.id}" style="${generateStyles(el)}">${el.type === 'text' ? el.text : ''
      }</div>`;
  }).join('\n');

  // 3. EMBED ANIMATION LOGIC (GSAP + Triggers)
  const scriptLogic = `
    const tl = gsap.timeline({ paused: true });
    
    // --- ANIMATION MAPPING ---
    const elements = ${JSON.stringify(elements)};
    
    elements.forEach(el => {
      const target = "#" + el.id;
      // Default to fade if no animation specified
      const anim = el.inAnimation || { type: 'fade', duration: 0.5, delay: 0 };
      
      gsap.set(target, { opacity: 0 }); // Init state

      switch(anim.type) {
        case 'slide-left':
          gsap.set(target, { x: -100 });
          tl.to(target, { x: 0, opacity: 1, duration: anim.duration, ease: "power2.out" }, anim.delay);
          break;
        case 'slide-right':
          gsap.set(target, { x: 100 });
          tl.to(target, { x: 0, opacity: 1, duration: anim.duration, ease: "power2.out" }, anim.delay);
          break;
        case 'scale':
          gsap.set(target, { scale: 0 });
          tl.to(target, { scale: 1, opacity: 1, duration: anim.duration, ease: "back.out(1.7)" }, anim.delay);
          break;
        default: // fade
          tl.to(target, { opacity: 1, duration: anim.duration }, anim.delay);
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
    <style>
        body { margin: 0; overflow: hidden; background: transparent; }
        #gfx-container {
            position: relative;
            width: ${config.width}px;
            height: ${config.height}px;
            overflow: hidden;
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