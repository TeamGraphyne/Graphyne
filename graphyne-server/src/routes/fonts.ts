import { FastifyPluginAsync } from 'fastify';
import fontList from 'font-list';

// Cache the fonts for 10 minutes so we don't spam the OS
let cachedFonts: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000;

export const fontsRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/api/fonts', async (request, reply) => {
        try {
            const now = Date.now();
            if (cachedFonts && now - cacheTimestamp < CACHE_DURATION) {
                return reply.send({ success: true, fonts: cachedFonts });
            }

            const fonts = await fontList.getFonts();

            // Clean up quotes (e.g. '"Agency FB"' -> 'Agency FB')
            cachedFonts = fonts.map(f => f.replace(/^['"]|['"]$/g, ''));
            cacheTimestamp = now;

            return reply.send({ success: true, fonts: cachedFonts });
        } catch (err) {
            console.error('Failed to list system fonts:', err);
            // Fallback empty list if enumeration fails to avoid breaking UI
            return reply.send({ success: false, fonts: [] });
        }
    });
};
