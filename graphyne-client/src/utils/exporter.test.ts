import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { compileGraphicToHTML } from './exporter';
import type { CanvasElement } from '../types/canvas';

describe('exporter', () => {
  beforeAll(() => {
    // Mock global fetch for the blobToBase64 helper
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['fake-image-data'], { type: 'image/png' }))
    });

    // Use an actual class to properly mock the `new FileReader()` constructor
    class MockFileReader {
      result: string = '';
      onloadend: () => void = () => {};
      onerror: (err: unknown) => void = () => {}; // Changed to unknown to satisfy ESLint
      
      readAsDataURL() {
        this.result = 'data:image/png;base64,fake';
        if (this.onloadend) {
            this.onloadend();
        }
      }
    }
    
    vi.stubGlobal('FileReader', MockFileReader);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  const baseConfig = { width: 1920, height: 1080, background: '#000' };

  it('Output contains <!DOCTYPE html> and a <div id="gfx-container">', async () => {
    const html = await compileGraphicToHTML(baseConfig, []);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<div id="gfx-container">');
  });

  it('Element IDs are prefixed with gfx-', async () => {
    const el: CanvasElement = { id: 'test-uuid', type: 'rect', x: 0, y: 0 } as CanvasElement;
    const html = await compileGraphicToHTML(baseConfig, [el]);
    expect(html).toContain('id="gfx-test-uuid"');
  });

  it('blob: URL images are converted to Base64 in the output', async () => {
    const el: CanvasElement = { id: 'img', type: 'image', x: 0, y: 0, src: 'blob:http://localhost/123' } as CanvasElement;
    const html = await compileGraphicToHTML(baseConfig, [el]);
    expect(html).toContain("url('data:image/png;base64,fake')");
  });

  it('System fonts do NOT generate a Google Fonts <link>', async () => {
    const el: CanvasElement = { id: 'txt', type: 'text', text: 'Hi', fontFamily: 'Arial' } as CanvasElement;
    const html = await compileGraphicToHTML(baseConfig, [el]);
    expect(html).not.toContain('fonts.googleapis.com');
  });

  it('A Google Font DOES generate a <link> to Google Fonts', async () => {
    const el: CanvasElement = { id: 'txt', type: 'text', text: 'Hi', fontFamily: 'Roboto' } as CanvasElement;
    const html = await compileGraphicToHTML(baseConfig, [el]);
    expect(html).toContain('fonts.googleapis.com/css2?family=Roboto');
  });

  it('Output contains a <script id="graphyne-source" type="application/json"> tag', async () => {
    const html = await compileGraphicToHTML(baseConfig, []);
    expect(html).toContain('<script id="graphyne-source" type="application/json">');
  });

  it('GSAP tlIn and tlOut timelines are generated in the script block', async () => {
    const html = await compileGraphicToHTML(baseConfig, []);
    expect(html).toContain('const tlIn = gsap.timeline');
    expect(html).toContain('const tlOut = gsap.timeline');
  });

  it('A slide-left in-animation generates gsap.set(target, { x: -100 })', async () => {
    const el = { id: 'txt', type: 'rect', inAnimation: { type: 'slide-left', duration: 1, delay: 0 } } as CanvasElement;
    const html = await compileGraphicToHTML(baseConfig, [el]);
    expect(html).toContain('gsap.set(target, { x: -100 })');
  });
});