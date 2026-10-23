---
name: competitor-post-scout
description: Finds which LinkedIn, Instagram and YouTube posts of your competitors worked in the last 80 days and turns them into topics, hooks and formats for your own content and positioning. Sets up the local competitor-post-scout app (clone, keys in .env, brain.json with your ICP and 10-20 competitors), runs a hunt from the command line, reads runs/<id>/result.json and writes a short competitor content map - top posts, hit rate by topic, hook and format, topics nobody covers. A hit is a post with at least twice its own author's median reach. Use when someone says "пости конкурентів", "що постять конкуренти", "які пости конкурентів спрацювали", "competitor posts", "competitor content", "content gap", "карта конкурентів", or works on lesson 03.11 of the AI-native outreach course. NOT for a full competitor analysis of websites, ads and SEO (that is the competitor-analysis instruction of the course).
---

# Competitor post scout

The app lives in this repository. This skill only drives it: setup, one hunt, and a readable summary. Every content judgment comes from the app's own model (Jev). Do not re-judge posts yourself.

## 1. Get the app

If the user has no copy yet:

```bash
git clone https://github.com/victor-shulga/competitor-post-scout.git
cd competitor-post-scout
pip3 install -r requirements.txt
cp .env.example .env
cp brain.example.json brain.json
```

If a copy exists, run `git pull` inside it. Below, `<app>` is the folder of that clone: the app's files are not part of this skill, they live there.

## 2. Keys

Two keys are required: `HARVESTAPI_KEY` (LinkedIn posts) and `OPENROUTER_API_KEY` (Jev). `APIFY_API_TOKEN` (Instagram) and `YOUTUBE_DATA_API_KEY` or `yt-dlp` (YouTube) are optional.

Never ask the user to paste a key into the chat. Tell them to open `.env` in an editor, put each key after its `=` and save. Then check presence only, without printing values:

```bash
grep -E '^(HARVESTAPI_KEY|OPENROUTER_API_KEY)=.+' .env | cut -d= -f1
```

## 3. Fill brain.json

Fill `brain.json` from what the user already has (their ICP document, site, offer). Ask only for what is missing.

- `identity`: company name, what they do and for whom, how they differ.
- `icp`: buyer segments, pain points, goals. Jev scores audience fit against this, so vague text here gives vague scores.
- `competitors`: the user's own accounts first, each name ending in `(ви)`; then 10-20 competitors of a similar size and their founders. LinkedIn takes company pages (`/company/...`) and personal profiles (`/in/...`). In service companies founders usually post more than the company page, so add both.

Never invent a competitor or a profile URL. If the user has no list yet, ask for it or point them to lesson 03.9 (search, ads, Clutch).

## 4. Run a hunt

```bash
python3 <app>/engine/hunt.py all --run runs/$(date +%Y-%m-%d) --platforms linkedin
```

Add `instagram` or `youtube` to `--platforms` only when their keys exist. LinkedIn over 20 accounts takes 5-10 minutes. The user can also run it from the page: `python3 <app>/server.py --open`, then the run button.

Report what the log says plainly: accounts with 0 posts, HTTP errors (401 = wrong key, 402 = no credits), the Jev cost line. An account with 0 posts is "could not collect or silent, check by hand", never "this competitor does not use LinkedIn".

## 5. Read the result

Open `<app>/runs/<id>/result.json`. Each item in `pieces` has the author (`competitor`), `format`, reach, breakout against the author's median, and `jev` with `topic_lane`, `hook_type`, `icp_fit`, `replicable`. Skip `off_niche` and sponsored posts. Keep the user's own `(ви)` accounts as the benchmark and out of the competitor slices.

Write the summary in the user's language, in this order:

1. The top 5 competitor posts by score: author, first line, format, topic, hook, why it worked in one line.
2. Hit rate by topic, hook and format (a hit = at least 2x the author's median reach). Leave out groups with fewer than 3 posts.
3. Where the user stands: their median reach against the best competitor's.
4. Topics that no competitor covers but that fit the user's ICP. These go into the competitor map and positioning.
5. Three post ideas for the user: the mechanics of a hit (topic, hook, format) on the user's own project and numbers. Never copy a competitor's text.

Every number in the summary comes from `result.json`. If a number is not there, say it is unknown.
