import type { CanvasElement } from "../types/canvas";

export const generateStandaloneHTML = (
  elements: CanvasElement[],
  width: number,
  height: number
): string => {
  const elementsJSON = JSON.stringify(elements);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Graphyne Export</title>
  <script src="https://unpkg.com/konva@9/konva.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <style>
    body { margin: 0; overflow: hidden; background: transparent; }
    #container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="container"></div>
  <script>
    // inject data
    const width = ${width};
    const height = ${height};
    const elements = ${elementsJSON};

    // initialise konva stage
    const stage = new Konva.Stage({
      container: 'container',
      width: width,
      height: height
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // master timeline
    const masterTimeline = gsap.timeline({ paused: true });

    // render elements and animation
    elements.forEach(el => {
      let node;

      // create node
      if (el.type === 'rect') node = new Konva.Rect(el);
      else if (el.type === 'circle') node = new Konva.Circle(el);
      else if (el.type === 'text') node = new Konva.Text(el);
      else if (el.type === 'image' && el.src) {
        const imageObj = new Image();
        imageObj.src = el.src;

        imageObj.onload = () => {
          node = new Konva.Image({
            image: imageObj,
            x: el.x ?? 0,
            y: el.y ?? 0,
            width: el.width ?? imageObj.width,
            height: el.height ?? imageObj.height,
            opacity: el.opacity ?? 1
          });

          node.id(el.id);
          layer.add(node);

          // parse animation config
          const animConfig = el.inAnimation || { type: 'fade', duration: 0.5, delay: 0, ease: 'power1.out' };
          let tweenVars = { duration: animConfig.duration, ease: animConfig.ease };

          // apply initial state and target
          if (animConfig.type === 'fade') {
            node.opacity(0);
            tweenVars.opacity = el.opacity ?? 1;
          } else if (animConfig.type === 'slide-left') {
            const originalX = el.x ?? 0;
            node.x(originalX - 100);
            node.opacity(0);
            tweenVars.x = originalX;
            tweenVars.opacity = el.opacity ?? 1;
          } else if (animConfig.type === 'slide-right') {
            const originalX = el.x ?? 0;
            node.x(originalX + 100);
            node.opacity(0);
            tweenVars.x = originalX;
            tweenVars.opacity = el.opacity ?? 1;
          } else if (animConfig.type === 'slide-bottom') {
            const originalY = el.y ?? 0;
            node.y(originalY + 50);
            node.opacity(0);
            tweenVars.y = originalY;
            tweenVars.opacity = el.opacity ?? 1;
          } else {
            node.opacity(0);
            tweenVars.opacity = el.opacity ?? 1;
          }

          // add to timeline
          masterTimeline.to(node, tweenVars, animConfig.delay || 0);

          layer.draw();
        };
      }

      // handle rect/circle/text
      if (node && el.type !== 'image') {
        node.id(el.id);
        layer.add(node);

        const animConfig = el.inAnimation || { type: 'fade', duration: 0.5, delay: 0, ease: 'power1.out' };
        let tweenVars = { duration: animConfig.duration, ease: animConfig.ease };

        if (animConfig.type === 'fade') {
          node.opacity(0);
          tweenVars.opacity = el.opacity ?? 1;
        } else if (animConfig.type === 'slide-left') {
          const originalX = el.x;
          node.x(originalX - 100);
          node.opacity(0);
          tweenVars.x = originalX;
          tweenVars.opacity = el.opacity ?? 1;
        } else if (animConfig.type === 'slide-right') {
          const originalX = el.x;
          node.x(originalX + 100);
          node.opacity(0);
          tweenVars.x = originalX;
          tweenVars.opacity = el.opacity ?? 1;
        } else if (animConfig.type === 'slide-bottom') {
          const originalY = el.y;
          node.y(originalY + 50);
          node.opacity(0);
          tweenVars.y = originalY;
          tweenVars.opacity = el.opacity ?? 1;
        } else {
          node.opacity(0);
          tweenVars.opacity = el.opacity ?? 1;
        }

        masterTimeline.to(node, tweenVars, animConfig.delay || 0);
      }
    });

    // draw layer
    layer.draw();

    // key controls
    window.addEventListener('keydown', e => {
      if (e.key === '1') masterTimeline.play();
      if (e.key === '2') masterTimeline.reverse();
    });
  </script>
</body>
</html>
  `;
};
