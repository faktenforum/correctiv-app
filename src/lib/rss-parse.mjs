/**
 * Dependency-free parsing for WordPress RSS 2.0 and YouTube Atom feeds.
 * Deliberately regex-based instead of an XML lib: fast-xml-parser collides
 * with the CommonJS resolver of @nativescript/vite, and the two feed formats
 * are stable enough. Runs identically in Node (scripts) and in the app.
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
 * WordPress RSS → items.
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
 * YouTube Atom → videos.
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

/** iTunes <itunes:duration> is either seconds ("1478") or HH:MM:SS / MM:SS. */
function parseDuration(value) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return value.split(':').reduce((acc, p) => acc * 60 + (parseInt(p, 10) || 0), 0);
}

/**
 * Podcast RSS 2.0 (iTunes namespace) → one series with its episodes.
 * Used for the Salon5 Castopod feeds (salon5.correctiv.net/@<handle>/feed.xml):
 * each episode carries a real MP3 <enclosure> and an <itunes:duration>.
 * @returns {{title:string, description:string, imageUrl:string|null,
 *   episodes:Array<{id:string, title:string, date:string, durationSec:number, audioUrl:string}>}}
 */
export function parsePodcastFeed(xml) {
  // The channel header is everything before the first <item>.
  const channel = xml.split('<item>')[0];
  const image =
    channel.match(/<itunes:image[^>]+href="([^"]+)"/) ||
    channel.match(/<image>[\s\S]*?<url>([\s\S]*?)<\/url>/);

  const episodes = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const enclosure = block.match(/<enclosure[^>]+url="([^"]+)"/);
    if (!enclosure) continue; // no audio → not a playable episode
    const pub = blockTag(block, 'pubDate');
    episodes.push({
      id: blockTag(block, 'guid') || enclosure[1],
      title: blockTag(block, 'title'),
      date: pub ? new Date(pub).toISOString() : new Date(0).toISOString(),
      durationSec: parseDuration(blockTag(block, 'itunes:duration')),
      audioUrl: enclosure[1],
    });
  }

  return {
    title: blockTag(channel, 'title'),
    description: blockTag(channel, 'description'),
    imageUrl: image ? image[1].trim() : null,
    episodes,
  };
}
