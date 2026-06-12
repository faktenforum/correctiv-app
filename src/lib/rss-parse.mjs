/**
 * Abhängigkeitsfreies Parsing für WordPress-RSS-2.0 und YouTube-Atom-Feeds.
 * Bewusst regex-basiert statt XML-Lib: fast-xml-parser kollidiert mit dem
 * CommonJS-Resolver von @nativescript/vite, und die beiden Feed-Formate sind
 * stabil genug. Läuft identisch in Node (Skripte) und in der App.
 */
import { decodeEntities } from './extract.mjs';

function blockTag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  if (!m) return '';
  return decodeEntities(
    m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * WordPress-RSS → Items.
 * @returns {Array<{id:string, feed:string, title:string, url:string, teaser:string,
 *   author?:string, publishedAt:string, categories:string[], imageUrl:null}>}
 */
export function parseWpFeed(xml, feed) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const url = blockTag(block, 'link');
    if (!url) continue;
    const categories = [...block.matchAll(/<category>([\s\S]*?)<\/category>/g)]
      .map((c) => decodeEntities(c[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).trim())
      .filter(Boolean);
    const pub = blockTag(block, 'pubDate');
    items.push({
      id: blockTag(block, 'guid') || url,
      feed,
      title: blockTag(block, 'title'),
      url,
      teaser: blockTag(block, 'description'),
      author: blockTag(block, 'dc:creator') || undefined,
      publishedAt: pub ? new Date(pub).toISOString() : new Date(0).toISOString(),
      categories,
      imageUrl: null,
    });
  }
  return items;
}

/**
 * YouTube-Atom → Videos.
 * @returns {Array<{id:string, title:string, url:string, thumbnailUrl:string,
 *   publishedAt:string, description?:string}>}
 */
export function parseYoutubeFeed(xml) {
  const videos = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    const block = m[1];
    const id = blockTag(block, 'yt:videoId');
    if (!id) continue;
    const thumb = block.match(/<media:thumbnail[^>]+url="([^"]+)"/);
    videos.push({
      id,
      title: blockTag(block, 'title'),
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnailUrl: thumb ? thumb[1] : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: blockTag(block, 'published'),
      description: blockTag(block, 'media:description').slice(0, 300) || undefined,
    });
  }
  return videos;
}
