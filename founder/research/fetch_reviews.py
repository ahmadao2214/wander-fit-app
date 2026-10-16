import json, sys, time, urllib.request
appid, name, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
rows, seen = [], set()
for page in range(1, 11):
    url = f"https://itunes.apple.com/us/rss/customerreviews/page={page}/id={appid}/sortby=mostrecent/json"
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30) as r:
                d = json.load(r); break
        except Exception as e:
            time.sleep(2 + attempt * 3); d = None
    if not d: break
    entries = d.get("feed", {}).get("entry", [])
    if isinstance(entries, dict): entries = [entries]
    new = 0
    for e in entries:
        if "im:rating" not in e: continue
        rid = e["id"]["label"]
        if rid in seen: continue
        seen.add(rid); new += 1
        rows.append({"app": name, "id": rid, "rating": int(e["im:rating"]["label"]),
                     "title": e["title"]["label"], "text": e["content"]["label"],
                     "version": e.get("im:version", {}).get("label"), "date": e.get("updated", {}).get("label")})
    if new == 0: break
    time.sleep(1)
json.dump(rows, open(f"{outdir}/{name}.json", "w"), indent=0)
print(name, len(rows), (min(r['date'] for r in rows)[:10] if rows else '-'), (max(r['date'] for r in rows)[:10] if rows else '-'))
