/**
 * 一次性脚本：把全球主流平台补进 docs/design/platform-icons-verified.json。
 *
 * 只做映射与校验，不产出图形：nameEn 与品牌色一律取自 simple-icons（上游已核验），
 * slug 不存在即抛错，避免「写了个不存在的 slug 却静默降级成占位」。
 *
 * 用法：node scripts/expand-platforms.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as simpleIcons from 'simple-icons';
import { slugToVariableName } from 'simple-icons/sdk';

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(here, '../../../docs/design/platform-icons-verified.json');

/** [id, simple-icons slug, category, nameZh, ...aliases]；nameEn/hex 从 simple-icons 取。 */
const SIMPLE = [
  // 社交
  ['mastodon', 'mastodon', 'social', 'Mastodon', '长毛象'],
  ['bluesky', 'bluesky', 'social', 'Bluesky', '蓝天'],
  ['reddit', 'reddit', 'social', 'Reddit'],
  ['pinterest', 'pinterest', 'social', 'Pinterest'],
  ['snapchat', 'snapchat', 'social', 'Snapchat'],
  ['vk', 'vk', 'social', 'VK'],
  ['line', 'line', 'social', 'LINE'],
  ['kakaotalk', 'kakaotalk', 'social', 'KakaoTalk'],
  ['tumblr', 'tumblr', 'social', 'Tumblr'],
  ['quora', 'quora', 'social', 'Quora'],
  // 视频
  ['vimeo', 'vimeo', 'video', 'Vimeo'],
  ['dailymotion', 'dailymotion', 'video', 'Dailymotion'],
  ['rumble', 'rumble', 'video', 'Rumble'],
  // 音频与音乐
  ['apple-music', 'applemusic', 'music', 'Apple Music'],
  ['apple-podcasts', 'applepodcasts', 'music', 'Apple Podcasts', '苹果播客'],
  ['soundcloud', 'soundcloud', 'music', 'SoundCloud'],
  ['bandcamp', 'bandcamp', 'music', 'Bandcamp'],
  ['pocket-casts', 'pocketcasts', 'music', 'Pocket Casts'],
  ['deezer', 'deezer', 'music', 'Deezer'],
  ['tidal', 'tidal', 'music', 'TIDAL'],
  ['lastfm', 'lastdotfm', 'music', 'Last.fm'],
  // 写作与内容
  ['medium', 'medium', 'content', 'Medium'],
  ['substack', 'substack', 'content', 'Substack'],
  ['ghost', 'ghost', 'content', 'Ghost'],
  ['wordpress', 'wordpress', 'content', 'WordPress'],
  ['blogger', 'blogger', 'content', 'Blogger'],
  ['notion', 'notion', 'content', 'Notion'],
  ['hashnode', 'hashnode', 'content', 'Hashnode'],
  ['devto', 'devdotto', 'content', 'DEV'],
  // 设计与作品集
  ['behance', 'behance', 'design', 'Behance'],
  ['dribbble', 'dribbble', 'design', 'Dribbble'],
  ['figma', 'figma', 'design', 'Figma'],
  ['artstation', 'artstation', 'design', 'ArtStation'],
  ['deviantart', 'deviantart', 'design', 'DeviantArt'],
  ['unsplash', 'unsplash', 'design', 'Unsplash'],
  ['flickr', 'flickr', 'design', 'Flickr'],
  ['500px', '500px', 'design', '500px'],
  ['pixiv', 'pixiv', 'design', 'pixiv', 'P站'],
  // 开发
  ['gitlab', 'gitlab', 'dev', 'GitLab'],
  ['stack-overflow', 'stackoverflow', 'dev', 'Stack Overflow'],
  ['npm', 'npm', 'dev', 'npm'],
  ['pypi', 'pypi', 'dev', 'PyPI'],
  ['hugging-face', 'huggingface', 'dev', 'Hugging Face', '抱抱脸'],
  ['kaggle', 'kaggle', 'dev', 'Kaggle'],
  ['replit', 'replit', 'dev', 'Replit'],
  ['docker-hub', 'docker', 'dev', 'Docker Hub'],
  ['bitbucket', 'bitbucket', 'dev', 'Bitbucket'],
  ['leetcode', 'leetcode', 'dev', 'LeetCode', '力扣'],
  // 电商与收款
  ['etsy', 'etsy', 'shopping', 'Etsy'],
  ['shopify', 'shopify', 'shopping', 'Shopify'],
  ['ebay', 'ebay', 'shopping', 'eBay'],
  ['gumroad', 'gumroad', 'shopping', 'Gumroad'],
  ['patreon', 'patreon', 'support', 'Patreon'],
  ['ko-fi', 'kofi', 'support', 'Ko-fi'],
  ['buy-me-a-coffee', 'buymeacoffee', 'support', 'Buy Me a Coffee'],
  ['paypal', 'paypal', 'support', 'PayPal'],
  ['stripe', 'stripe', 'support', 'Stripe'],
  ['open-collective', 'opencollective', 'support', 'Open Collective'],
  // 预约与协作
  ['calendly', 'calendly', 'booking', 'Calendly'],
  ['cal-com', 'caldotcom', 'booking', 'Cal.com'],
  ['zoom', 'zoom', 'booking', 'Zoom'],
  // 游戏
  ['steam', 'steam', 'game', 'Steam'],
  ['itch-io', 'itchdotio', 'game', 'itch.io'],
  ['epic-games', 'epicgames', 'game', 'Epic Games'],
  ['roblox', 'roblox', 'game', 'Roblox'],
  ['playstation', 'playstation', 'game', 'PlayStation'],
  // 生活与学术
  ['goodreads', 'goodreads', 'life', 'Goodreads'],
  ['letterboxd', 'letterboxd', 'life', 'Letterboxd'],
  ['imdb', 'imdb', 'life', 'IMDb'],
  ['strava', 'strava', 'life', 'Strava'],
  ['product-hunt', 'producthunt', 'life', 'Product Hunt'],
  ['meetup', 'meetup', 'life', 'Meetup'],
  ['wikipedia', 'wikipedia', 'life', '维基百科', 'Wikipedia'],
  ['google-scholar', 'googlescholar', 'academic', '谷歌学术', 'Google Scholar'],
  ['orcid', 'orcid', 'academic', 'ORCID'],
  ['researchgate', 'researchgate', 'academic', 'ResearchGate'],
  ['signal', 'signal', 'contact', 'Signal'],
];

/** simple-icons 已下架（商标原因）但 Remix Icon 仍收录的，走 src/custom 兜底。 */
const CUSTOM = [
  ['amazon', 'shopping', '亚马逊', 'Amazon'],
  ['slack', 'booking', 'Slack'],
  ['codepen', 'dev', 'CodePen'],
  ['xbox', 'game', 'Xbox'],
];

function iconFor(slug) {
  const icon = simpleIcons[slugToVariableName(slug)];
  if (!icon?.path) throw new Error(`simple-icons 没有 slug: ${slug}`);
  return icon;
}

const data = JSON.parse(await readFile(dataPath, 'utf8'));
const existing = new Set(data.platforms.map((p) => p.id));
let added = 0;

for (const [id, slug, category, nameZh, ...aliases] of SIMPLE) {
  if (existing.has(id)) continue;
  const icon = iconFor(slug);
  data.platforms.push({
    id,
    nameZh,
    nameEn: icon.title,
    category,
    aliases: [nameZh, ...aliases, icon.title].filter((v, i, a) => a.indexOf(v) === i),
    simpleIcon: { slug },
    stickerHex: `#${icon.hex}`,
    needsCustomGlyph: false,
  });
  added += 1;
}

for (const [id, category, nameZh, ...aliases] of CUSTOM) {
  if (existing.has(id)) continue;
  data.platforms.push({
    id,
    nameZh,
    nameEn: aliases[aliases.length - 1] ?? nameZh,
    category,
    aliases: [nameZh, ...aliases].filter((v, i, a) => a.indexOf(v) === i),
    simpleIcon: null,
    stickerHex: null,
    needsCustomGlyph: true,
  });
  added += 1;
}

data.generatedAt = data.generatedAt;
await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`新增 ${added} 个平台，合计 ${data.platforms.length}`);
