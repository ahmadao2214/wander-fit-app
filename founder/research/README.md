# Review-mining scripts (Deep research tab, Oct 16, 2026)

Reproduces the App Store job and pain coding in the "Deep research" tab of the market research doc.

Raw reviews are not committed. They're Apple-hosted user content; re-pull them instead.

```bash
mkdir -p reviews
# app_id name: volt 1189345596, trainheroic 955074569, techne 1298569303, peakstrength 1632549195,
# plt4m 1291869726, teambuildr 1588729407, fitfor90 1215367316, hevy 1458862350, strong 464254577,
# boostcamp 1529354455, fitbod 1041517543, liftosaur 1661880849
python3 fetch_reviews.py 1189345596 volt reviews   # repeat per app
python3 code_reviews.py reviews > summary.txt       # writes ../coded.json next to reviews/
```

- `fetch_reviews.py` pulls up to 500 of the newest US reviews per app from Apple's public RSS feed.
- `code_reviews.py` applies the regex codebook (`CODES`) and prints prevalence by segment and app.
- Segments: "team" = athlete and team apps; "gym" = gym trackers.
- To replicate, have a second coder hand-code 300 random reviews blind and compute Cohen's kappa per code.
