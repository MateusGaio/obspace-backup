"use strict";

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unwrapDuckDuckGoUrl(value) {
  try {
    const url = new URL(value);
    const uddg = url.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : value;
  } catch {
    return value;
  }
}

function parseDuckDuckGo(html) {
  const results = [];
  const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let match = resultRegex.exec(html);

  while (match && results.length < 5) {
    results.push({
      title: decodeHtml(match[2]),
      url: unwrapDuckDuckGoUrl(decodeHtml(match[1])),
      snippet: decodeHtml(match[3])
    });
    match = resultRegex.exec(html);
  }

  return results;
}

async function searchWeb(query) {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) {
    return [];
  }

  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 Obspace/0.1"
      }
    });
    if (!response.ok) {
      return [];
    }
    const html = await response.text();
    return parseDuckDuckGo(html);
  } catch {
    return [];
  }
}

module.exports = {
  searchWeb
};
