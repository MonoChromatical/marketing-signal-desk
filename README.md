# Signal Desk

Signal Desk is an AI-first media buying command center for paid media teams. It turns cross-platform ad exports into a prioritized action queue: where budget is leaking, which winning messages are working, and what test the team should launch next.

The product is built as a FastAPI service plus a lightweight operator console because the long-term version should behave like internal marketing infrastructure: API-first, connector-friendly, and easy to expose through agent/MCP tools.

## Demo Path

1. Open the app.
2. Click **Run Full Demo**.
3. Review the account metrics and ranked action queue.
4. Select an action to inspect the evidence.
5. Review the generated daily action memo, ad copy ideas, and experiment plan.

The full demo works without private ad accounts or API keys. Use **Load Sample Data** if you want to inspect the workflow one step at a time. The app also includes an in-app CSV contract panel and a downloadable sample CSV. If `OPENAI_API_KEY` is configured, the AI analyst layer upgrades memo and creative copy. If it is unavailable, Signal Desk uses deterministic agent fallback output from the same campaign analysis pipeline.

## What It Does

- Imports campaign performance CSVs from paid media exports.
- Normalizes fields across platforms such as Meta, Google, TikTok, and Taboola.
- Detects spend leaks, scale candidates, landing page mismatch symptoms, and creative fatigue.
- Ranks recommendations by estimated impact.
- Explains every recommendation with supporting metrics.
- Clusters creative copy into performance messages.
- Generates deterministic experiment plans from selected actions.
- Uses an optional OpenAI analyst layer for action memos and ad copy ideas.
- Exports the action queue for a media buying team to use in a daily standup.

## Why This Problem

Media buying teams do not need another passive dashboard. They need faster answers to the question: what should we do with today's budget?

Signal Desk sits directly in the workflow described by It's Today Media: ad platforms, reporting, optimization, landing pages, and lead generation. The first version uses CSV exports so it can be demonstrated without API access. The production version would replace CSV intake with live platform and CRM connectors.

## AI Design

Signal Desk uses a two-layer approach:

1. The Python analysis engine performs the math: normalization, CPL/Q-CPL calculations, action ranking, message scoring, and detection rules.
2. The OpenAI analyst layer interprets those grounded signals into a daily action memo and ad copy idea pack when `OPENAI_API_KEY` is configured.

This keeps the tool AI-enhanced rather than AI-fragile. If OpenAI is not configured, over quota, or unavailable, the operator still gets useful recommendations.

## Architecture

```text
signal-desk/
  backend/
    main.py          FastAPI routes and app shell
    analysis.py      Normalization, triage rules, message intelligence, brief generation
    ai.py            Optional OpenAI analyst layer with fallback mode
    schemas.py       Pydantic API contracts
    sample_data.py   Demo account loader
    sample-data.csv  Realistic contest demo fixture
  frontend/
    index.html       Operator dashboard
    styles.css       Responsive interface styling
    app.js           Thin API client and UI rendering
```

The backend exposes tool-shaped functions now, which makes the next MCP layer straightforward:

- `analyze_campaign_export`
- `detect_budget_leaks`
- `rank_media_buying_actions`
- `generate_test_brief`
- `generate_daily_buyer_memo`
- `generate_creative_variants`
- `export_action_queue`

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
cd "G:\ASSESSMENTS\PERSONAL PROJECTS\signal-desk"
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8001
```

Then open:

```text
http://127.0.0.1:8001
```

## Optional OpenAI Setup

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

With a working key, you should see `openai_configured: true`, `provider: openai`, and `model: gpt-4.1-mini`.

## CSV Format

The dashboard shows the expected CSV contract near the top of the app. You can also download a sample file from `/api/sample-csv`.

Recommended fields:

```csv
date,platform,campaign,ad_set,ad_name,spend,impressions,clicks,leads,qualified_leads,revenue,landing_page_url,creative_text
```

The parser also recognizes common variants such as `campaign_name`, `ad_group`, `amount_spent`, `conversions`, `qualified`, `url`, `headline`, and `copy`.

## Verification

```bash
python smoke_api.py
node --check frontend/app.js
```

## What I Would Build Next

1. Live API connectors for Meta, Google Ads, TikTok, and Taboola.
2. CRM/lead-quality ingestion so the system optimizes for qualified leads and revenue, not just cheap form fills.
3. Daily scheduled analysis with Slack delivery.
4. Human approval workflows for budget changes, pauses, and creative launches.
5. Landing page crawler that scores message match, speed, trust signals, and CTA friction.
6. Creative asset analysis for images and video frames.
7. MCP server support so internal AI agents can query account health and create optimization plans.
8. Closed-loop learning from accepted, ignored, and successful recommendations.
