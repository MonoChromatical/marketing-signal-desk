from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CampaignRow(BaseModel):
    date: str = ""
    platform: str = "Unknown"
    campaign: str = "Untitled Campaign"
    ad_set: str = "Default"
    ad_name: str = "Untitled Ad"
    spend: float = 0
    impressions: float = 0
    clicks: float = 0
    leads: float = 0
    qualified_leads: float = 0
    revenue: float = 0
    landing_page_url: str = ""
    creative_text: str = ""


class NormalizedRow(BaseModel):
    id: str
    date: str
    platform: str
    campaign: str
    ad_set: str
    ad_name: str
    spend: float
    impressions: float
    clicks: float
    leads: float
    qualified_leads: float
    revenue: float
    landing_page_url: str
    creative_text: str
    cpl: float
    qcpl: float
    ctr: float
    cvr: float
    qualified_rate: float


class GroupSummary(BaseModel):
    key: str
    platform: str = "Unknown"
    campaign: str = ""
    ad_name: str = ""
    creative_text: str = ""
    landing_page_url: str = ""
    spend: float = 0
    impressions: float = 0
    clicks: float = 0
    leads: float = 0
    qualified_leads: float = 0
    revenue: float = 0
    cpl: float = 0
    qcpl: float = 0
    ctr: float = 0
    cvr: float = 0
    qualified_rate: float = 0


class Action(BaseModel):
    id: str
    type: str
    title: str
    subject: str
    summary: str
    next_step: str
    impact: float
    confidence: str
    group: GroupSummary


class AngleSummary(GroupSummary):
    angle: str
    score: float


class AccountAnalysis(BaseModel):
    rows: list[NormalizedRow]
    account: GroupSummary
    campaigns: list[GroupSummary]
    actions: list[Action]
    angles: list[AngleSummary]


class AnalyzeRequest(BaseModel):
    rows: list[dict[str, Any] | CampaignRow] = Field(default_factory=list)


class BriefRequest(BaseModel):
    action_id: str
    analysis: AccountAnalysis


class BriefResponse(BaseModel):
    brief: str


class AiSettings(BaseModel):
    api_key: str = ""
    model: str = ""


class AiMemoRequest(AiSettings):
    analysis: AccountAnalysis


class AiActionRequest(AiSettings):
    action_id: str
    analysis: AccountAnalysis


class AiResponse(BaseModel):
    mode: str
    content: str


class ExportResponse(BaseModel):
    markdown: str
