# Signal Desk

Signal Desk is an AI-first marketing command center built for the It's Today Media build competition. It helps a paid media team answer the daily operating question that matters most:

```text
What should we do with today's budget?
```

Live demo:

```text
https://marketing-signal-desk.onrender.com/
```

The app analyzes campaign CSV exports, detects budget leaks, ranks the next best actions, explains the evidence, and turns those decisions into a daily operating plan for the marketing team.

## Competition Demo Note

This repository is a demo version built specifically for the competition instance.

Some UI elements are intentionally included to make judging and walkthroughs easier, such as the **Judge demo path**, built-in sample data, CSV contract panel, and one-click full demo flow. In a production deployment, those demo affordances would be removed or moved behind onboarding/admin tools. The production version would focus on live ad platform connectors, CRM data, scheduled reporting, approval workflows, and team delivery channels.

## Why It Exists

Media buying teams already have dashboards. The harder problem is deciding what to do next.

A marketer may have campaign data from Meta, Google, TikTok, native platforms, landing pages, and CRM exports. That creates a lot of reporting, but not always a clear operating queue. Signal Desk turns performance data into practical recommendations:

- where budget is leaking
- what should be scaled
- where landing page mismatch is hurting conversion
- which messages are producing qualified leads
- what experiment should launch next
- what the team should discuss in today's standup

The goal is not to replace the media buyer. The goal is to give the team an AI-assisted operator that can process account signals quickly and produce grounded next steps.

## What Signal Desk Does

- Imports campaign performance CSVs.
- Normalizes flexible platform export headers.
- Calculates spend, impressions, clicks, leads, qualified leads, CPL, qualified CPL, CTR, lead conversion rate, qualified rate, and revenue.
- Detects budget leaks, scale candidates, landing page issues, and creative fatigue.
- Ranks actions by estimated impact.
- Explains each recommendation with supporting metrics.
- Groups creative copy into winning message themes.
- Generates a Daily Action Memo.
- Generates Ad Copy Ideas for the selected recommendation.
- Generates an Experiment Plan with hypothesis, launch plan, success rule, kill rule, and metrics to watch.
- Lets users approve, review, ignore, or mark actions done.
- Builds a copyable Team Standup Plan from approved actions.
- Allows row-level corrections after upload without editing and re-uploading the CSV.
- Supports optional OpenAI output while keeping a deterministic fallback mode.

## AI Agent Design

Signal Desk uses a grounded two-layer design:

1. **Deterministic analysis engine**
   The Python backend normalizes rows, calculates metrics, scores actions, detects issues, and builds structured recommendations.

2. **AI analyst layer**
   When OpenAI is available, the app turns the grounded analysis into operator-facing memos and creative ideas. If OpenAI is not available, the app returns polished deterministic fallback output from the same analysis pipeline.

This keeps the demo reliable. It can run with no API key, but it can also use live AI output.

Users can provide an OpenAI API key inside the app under **AI Settings**. The server does not store that key. If the user chooses "Remember on this device," the key is stored only in that browser's local storage.

## Main Workflow

1. Load the sample account or upload a campaign CSV.
2. Review account metrics: spend, leads, qualified CPL, and budget at risk.
3. Inspect the ranked Action Queue.
4. Select a recommendation to see evidence and next steps.
5. Approve, review, ignore, or mark recommendations done.
6. Generate the Daily Action Memo and Ad Copy Ideas.
7. Review Winning Messages.
8. Review or copy the Experiment Plan.
9. Copy the Team Standup Plan for the media buying team.

## Demo Data

The built-in sample account includes realistic rows across platforms such as Meta, Google, TikTok, and Taboola-style campaign data.

The demo intentionally includes a budget leak so the app can show:

- Budget At Risk
- urgent action detection
- recommendation ranking
- decision support
- fallback AI output
- standup plan generation

## CSV Format

Recommended fields:

```csv
date,platform,campaign,ad_set,ad_name,spend,impressions,clicks,leads,qualified_leads,revenue,landing_page_url,creative_text
```

The parser also recognizes common aliases, including:

```text
campaign_name, ad_group, amount_spent, conversions, qualified, url, headline, copy
```

After upload, users can make lightweight corrections inside the app. This is meant for fixing obvious row-level issues without turning Signal Desk into a full spreadsheet editor.

## Architecture

```text
signal-desk/
  backend/
    main.py          FastAPI routes and static frontend serving
    analysis.py      Normalization, metrics, detection rules, ranking, briefs
    ai.py            Optional OpenAI layer and deterministic fallback
    schemas.py       Pydantic API contracts
    sample_data.py   Demo account loader
    sample-data.csv  Contest demo fixture
  frontend/
    index.html       Operator console
    app.js           Frontend state, API calls, rendering, workflow controls
    styles.css       Responsive interface and dashboard styling
```

## API

```text
GET  /api/health
GET  /api/sample-account
GET  /api/sample-csv
POST /api/analyze
POST /api/analyze-csv
POST /api/generate-brief
POST /api/ai/daily-memo
POST /api/ai/creative-variants
POST /api/export-actions
```

## Run Locally

```powershell
git clone https://github.com/MonoChromatical/marketing-signal-desk.git
cd marketing-signal-desk
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8001
```

Open:

```text
http://127.0.0.1:8001
```

## Optional OpenAI

Signal Desk works without OpenAI configuration.

For live AI output, either:

- paste an API key into **AI Settings** in the app, or
- set environment variables before starting the backend.

PowerShell:

```powershell
$env:OPENAI_API_KEY="paste_your_openai_key_here"
$env:OPENAI_MODEL="gpt-4.1-mini"
uvicorn backend.main:app --reload --port 8001
```

Health check:

```text
http://127.0.0.1:8001/api/health
```

## Deployment

The demo is deployed on Render:

```text
https://marketing-signal-desk.onrender.com/
```

Render settings:

```text
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
Health Check Path: /api/health
```

The repository includes `render.yaml` for blueprint-based deployment.

## Verification

```bash
python smoke_api.py
python -m compileall backend
node --check frontend/app.js
```

## Production Direction

If this became a production product, the contest-specific demo scaffolding would be removed or replaced with production workflows:

1. Live connectors for Meta, Google Ads, TikTok, Taboola, and other ad platforms.
2. CRM and lead-quality ingestion so the team optimizes for qualified leads and revenue, not just cheap form fills.
3. Scheduled daily analysis and Slack/email delivery.
4. Human approval workflows for budget changes, pauses, and creative launches.
5. Landing page crawler for message match, page speed, trust signals, and CTA friction.
6. Creative asset analysis for images and videos.
7. Agent/MCP interface so internal tools can query account health and create optimization plans.
8. Closed-loop learning from accepted, ignored, and successful recommendations.

## Tech Stack

- FastAPI
- Pydantic
- Vanilla HTML/CSS/JavaScript
- Optional OpenAI API
- Render hosting

## Project Status

Signal Desk is a competition-ready demo. It is designed to show the product direction clearly without requiring private ad account access, paid API usage, or complex setup.