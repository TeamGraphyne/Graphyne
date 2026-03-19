import { describe, it, expect } from 'vitest';
import { parseHtmlGraphic } from './importer';

describe('importer', () => {
  it('Successfully parses a file exported by compileGraphicToHTML (round-trip)', async () => {
    const mockState = { config: { width: 1920 }, elements: [{ id: '1', type: 'rect' }] };
    const htmlString = `
      <!DOCTYPE html>
      <html><body>
        <script id="graphyne-source" type="application/json">
          ${JSON.stringify(mockState)}
        </script>
      </body></html>
    `;
    const file = new File([htmlString], 'export.html', { type: 'text/html' });
    
    const result = await parseHtmlGraphic(file);
    expect(result.config.width).toBe(1920);
    expect(result.elements[0].id).toBe('1');
  });

  it('Rejects with a descriptive error if no graphyne-source script tag is found', async () => {
    const htmlString = `<!DOCTYPE html><html><body><h1>No Script</h1></body></html>`;
    const file = new File([htmlString], 'bad.html', { type: 'text/html' });
    
    await expect(parseHtmlGraphic(file)).rejects.toMatch(/No source data found/);
  });

  it('Rejects on malformed JSON inside the script tag', async () => {
    const htmlString = `
      <!DOCTYPE html>
      <html><body>
        <script id="graphyne-source" type="application/json">{ bad_json: true </script>
      </body></html>
    `;
    const file = new File([htmlString], 'corrupt.html', { type: 'text/html' });
    
    await expect(parseHtmlGraphic(file)).rejects.toMatch(/Failed to parse Graphic JSON/);
  });
});