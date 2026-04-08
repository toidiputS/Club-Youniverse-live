import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import quote_plus

import feedparser
import trafilatura

RSS_FEEDS = [
    "https://feeds.arstechnica.com/arstechnica/index",
    "https://techcrunch.com/feed/",
    "https://www.theverge.com/rss/index.xml",
    "https://feeds.feedburner.com/venturebeat/SZYF",
    "https://www.wired.com/feed/rss",
    "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
    "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "https://www.reutersagency.com/feed/?best-topics=technology",
]

TIME_PATTERNS = [
    (r"(\d+)\s*hour(?:s)?\s*update", "hours"),
    (r"(\d+)\s*day(?:s)?\s*update", "days"),
    (r"(\d+)\s*week(?:s)?\s*update", "weeks"),
    (r"daily\s*update", "daily"),
    (r"weekly\s*update", "weekly"),
]


def parse_phrase(phrase: str):
    normalized = " ".join(phrase.strip().split())
    lowered = normalized.lower()
    time_window = {"value": None, "unit": None, "label": "unspecified"}

    for pattern, unit in TIME_PATTERNS:
        m = re.search(pattern, lowered)
        if m:
            if unit == "daily":
                time_window = {"value": 24, "unit": "hours", "label": "24 hour update"}
            elif unit == "weekly":
                time_window = {"value": 7, "unit": "days", "label": "weekly update"}
            else:
                value = int(m.group(1))
                time_window = {"value": value, "unit": unit, "label": m.group(0)}
            normalized = re.sub(pattern, "", normalized, flags=re.I).strip(" -,")
            break

    topic = normalized.strip() or phrase.strip()
    keywords = [k for k in re.split(r"[^a-zA-Z0-9]+", topic.lower()) if k]
    return {
        "raw_phrase": phrase,
        "topic": topic,
        "keywords": keywords,
        "time_window": time_window,
    }


def parse_entry_date(entry):
    for field in ("published_parsed", "updated_parsed"):
        value = entry.get(field)
        if value:
            return datetime(*value[:6], tzinfo=timezone.utc)
    for field in ("published", "updated"):
        value = entry.get(field)
        if value:
            try:
                dt = parsedate_to_datetime(value)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
            except Exception:
                pass
    return None


def score_entry(entry, keywords):
    hay = " ".join([
        entry.get("title", ""),
        entry.get("summary", ""),
        " ".join(t.get("term", "") for t in entry.get("tags", [])) if entry.get("tags") else "",
    ]).lower()
    score = 0
    for kw in keywords:
        if kw in hay:
            score += 3
    if entry.get("title"):
        for kw in keywords:
            if kw in entry.get("title", "").lower():
                score += 2
    return score


def fetch_rss_articles(topic_info, max_items=12):
    keywords = topic_info["keywords"]
    collected = []
    seen_links = set()

    for feed_url in RSS_FEEDS:
        feed = feedparser.parse(feed_url)
        for entry in feed.entries:
            link = entry.get("link")
            if not link or link in seen_links:
                continue
            relevance = score_entry(entry, keywords)
            if relevance <= 0:
                continue
            seen_links.add(link)
            collected.append({
                "title": entry.get("title", "Untitled"),
                "link": link,
                "source": feed.feed.get("title", feed_url),
                "published_utc": parse_entry_date(entry).isoformat() if parse_entry_date(entry) else None,
                "summary": re.sub(r"<[^>]+>", "", entry.get("summary", "")).strip(),
                "relevance_score": relevance,
            })

    collected.sort(key=lambda x: (x["relevance_score"], x["published_utc"] or ""), reverse=True)
    return collected[:max_items]


def extract_article_text(url):
    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        return None
    text = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
    return text


def build_manifest(topic_info, articles):
    enriched = []
    for article in articles:
        text = extract_article_text(article["link"])
        time.sleep(0.5)
        enriched.append({
            **article,
            "extracted_text": (text[:4000] if text else None),
            "extracted_text_preview": (text[:500] if text else None),
        })

    return {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "input": topic_info,
        "article_count": len(enriched),
        "articles": enriched,
    }


def main():
    parser = argparse.ArgumentParser(description="Phase 1 news aggregation engine")
    parser.add_argument("phrase", help='Example: "AI breakthroughs 24 hour update"')
    parser.add_argument("--max-items", type=int, default=8)
    parser.add_argument("--output", default="episode_manifest.json")
    args = parser.parse_args()

    topic_info = parse_phrase(args.phrase)
    articles = fetch_rss_articles(topic_info, max_items=args.max_items)

    if not articles:
        print("No relevant RSS articles found. Try a broader topic phrase.")
        sys.exit(1)

    manifest = build_manifest(topic_info, articles)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"Saved manifest to {args.output}")
    print(f"Topic: {topic_info['topic']}")
    print(f"Articles: {len(articles)}")
    for i, article in enumerate(articles, 1):
        print(f"{i}. {article['title']} [{article['source']}]")
        print(f"   {article['link']}")


if __name__ == "__main__":
    main()
