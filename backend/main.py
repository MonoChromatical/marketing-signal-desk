from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .ai import ai_available, ai_status, creative_variants, daily_memo
from .analysis import analyze_rows, export_actions_markdown, generate_brief, parse_csv_text
from .sample_data import load_sample_rows
from .schemas import (
    AccountAnalysis,
    AiActionRequest,
    AiMemoRequest,
    AiResponse,
    AnalyzeRequest,
    BriefRequest,
    BriefResponse,
    ExportResponse,
)

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"

app = FastAPI(
    title="Signal Desk API",
    description="AI-first media buying command center for campaign triage, action ranking, and experiment plan generation.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str | bool]:
    status = ai_status()
    return {"status": "ok", "service": "signal-desk", "openai_configured": ai_available(), **status}


@app.get("/api/sample-account", response_model=AccountAnalysis)
def sample_account() -> dict:
    return analyze_rows(load_sample_rows())


@app.get("/api/sample-csv")
def sample_csv() -> FileResponse:
    sample_path = Path(__file__).with_name("sample-data.csv")
    return FileResponse(sample_path, media_type="text/csv", filename="signal-desk-sample-data.csv")


@app.post("/api/analyze", response_model=AccountAnalysis)
def analyze(request: AnalyzeRequest) -> dict:
    # Keep ingestion API-first so future ad platform connectors can call this same route.
    return analyze_rows([dict(row) for row in request.rows])


@app.post("/api/analyze-csv", response_model=AccountAnalysis)
async def analyze_csv(file: UploadFile = File(...)) -> dict:
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a CSV export.")
    content = await file.read()
    text = content.decode("utf-8-sig")
    return analyze_rows(parse_csv_text(text))


@app.post("/api/generate-brief", response_model=BriefResponse)
def brief(request: BriefRequest) -> BriefResponse:
    action = find_action(request.action_id, request.analysis)
    return BriefResponse(brief=generate_brief(action, request.analysis.model_dump()))


@app.post("/api/ai/daily-memo", response_model=AiResponse)
def ai_daily_memo(request: dict[str, Any]) -> AiResponse:
    # The deterministic analysis grounds the LLM so it interprets metrics instead of inventing them.
    # User-supplied keys are request-scoped and are not stored by the server.
    if "analysis" in request:
        memo_request = AiMemoRequest.model_validate(request)
        return AiResponse(**daily_memo(memo_request.analysis, memo_request.api_key, memo_request.model))
    analysis = AccountAnalysis.model_validate(request)
    return AiResponse(**daily_memo(analysis))


@app.post("/api/ai/creative-variants", response_model=AiResponse)
def ai_creative_variants(request: AiActionRequest) -> AiResponse:
    action = find_action(request.action_id, request.analysis)
    return AiResponse(**creative_variants(action, request.analysis, request.api_key, request.model))


@app.post("/api/export-actions", response_model=ExportResponse)
def export_actions(analysis: AccountAnalysis) -> ExportResponse:
    return ExportResponse(markdown=export_actions_markdown(analysis.model_dump()))


@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND / "index.html")


def find_action(action_id: str, analysis: AccountAnalysis):
    action = next((item for item in analysis.actions if item.id == action_id), None)
    if action is None:
        raise HTTPException(status_code=404, detail="Action not found.")
    return action


app.mount("/static", StaticFiles(directory=FRONTEND), name="static")

