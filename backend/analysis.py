from __future__ import annotations

import csv
import io
import re
from collections import defaultdict
from typing import Any, Callable, Iterable

from .schemas import Action, AngleSummary, GroupSummary, NormalizedRow


def parse_csv_text(text: str) -> list[dict[str, Any]]:
    return list(csv.DictReader(io.StringIO(text)))


def analyze_rows(raw_rows: Iterable[dict[str, Any]]) -> dict[str, Any]:
    rows = normalize_rows(raw_rows)
    campaigns = group_by(rows, lambda row: f"{row.platform} :: {row.campaign} :: {row.ad_name}")
    account = summarize_group("account", rows)
    actions = detect_actions(campaigns, account)
    angles = analyze_angles(rows)
    return {
        "rows": rows,
        "account": account,
        "campaigns": sorted(campaigns, key=lambda item: item.spend, reverse=True),
        "actions": sorted(actions, key=lambda item: item.impact, reverse=True),
        "angles": angles,
    }


def normalize_rows(raw_rows: Iterable[dict[str, Any]]) -> list[NormalizedRow]:
    normalized_rows: list[NormalizedRow] = []
    for index, raw_row in enumerate(raw_rows):
        row = {to_key(key): value for key, value in dict(raw_row).items()}
        spend = parse_number(first(row, "spend", "cost", "amount_spent"))
        impressions = parse_number(first(row, "impressions", "impr"))
        clicks = parse_number(first(row, "clicks", "link_clicks"))
        leads = parse_number(first(row, "leads", "conversions", "results"))
        qualified = parse_number(first(row, "qualified_leads", "qualified", "sales_qualified_leads", "sqls"))
        normalized_rows.append(
            NormalizedRow(
                id=f"row-{index}",
                date=str(row.get("date", "")),
                platform=str(first(row, "platform", "source") or "Unknown"),
                campaign=str(first(row, "campaign", "campaign_name") or "Untitled Campaign"),
                ad_set=str(first(row, "ad_set", "adset", "ad_group", "ad_group_name") or "Default"),
                ad_name=str(first(row, "ad_name", "ad", "creative") or "Untitled Ad"),
                spend=spend,
                impressions=impressions,
                clicks=clicks,
                leads=leads,
                qualified_leads=qualified,
                revenue=parse_number(first(row, "revenue", "sales", "value")),
                landing_page_url=str(first(row, "landing_page_url", "landing_page", "url") or ""),
                creative_text=str(first(row, "creative_text", "body", "copy", "headline") or ""),
                cpl=spend / leads if leads else spend,
                qcpl=spend / qualified if qualified else spend,
                ctr=clicks / impressions if impressions else 0,
                cvr=leads / clicks if clicks else 0,
                qualified_rate=qualified / leads if leads else 0,
            )
        )
    return normalized_rows


def detect_actions(campaigns: list[GroupSummary], account: GroupSummary) -> list[Action]:
    actions: list[Action] = []
    avg_qcpl = account.qcpl or 0
    avg_cpl = account.cpl or 0

    for group in campaigns:
        if group.spend > 450 and group.qualified_leads <= 12 and avg_qcpl and group.qcpl > avg_qcpl * 1.8:
            impact = min(group.spend, max(0, group.spend - avg_qcpl * max(group.qualified_leads, 1)))
            actions.append(make_action(
                "urgent",
                f"Stop budget leak in {group.campaign}",
                group.campaign,
                f"{group.ad_name} has spent ${group.spend:,.0f} at ${group.qcpl:,.0f} qualified CPL, far above the account average of ${avg_qcpl:,.0f}.",
                "Pause or cap this ad, then inspect lead quality and tracking before adding more spend.",
                impact,
                group,
            ))

        if group.qualified_leads >= 25 and avg_qcpl and group.qcpl < avg_qcpl * 0.75 and group.qualified_rate >= 0.45:
            beat = max(0, 1 - group.qcpl / avg_qcpl)
            actions.append(make_action(
                "scale",
                f"Scale {group.ad_name}",
                group.campaign,
                f"{group.ad_name} is producing qualified leads at ${group.qcpl:,.0f}, beating the account average by {beat:.0%}.",
                "Increase budget in controlled steps and clone the winning message into fresh ad copy ideas.",
                max(250, avg_qcpl * group.qualified_leads - group.spend),
                group,
            ))

        if group.clicks > 900 and group.cvr < 0.055:
            actions.append(make_action(
                "landing-page",
                f"Audit landing page match for {group.ad_name}",
                group.landing_page_url or group.campaign,
                f"{group.ad_name} is earning clicks, but only {group.cvr:.1%} of clicks become leads.",
                "Match the landing page headline to the ad promise and simplify the above-fold conversion path.",
                group.clicks * 0.02 * avg_cpl,
                group,
            ))

        if group.impressions > 140000 and group.ctr < 0.014:
            actions.append(make_action(
                "creative",
                f"Refresh fatigued creative in {group.campaign}",
                group.ad_name,
                f"{group.ad_name} has high delivery but weak CTR at {group.ctr:.1%}.",
                "Generate new hooks using the account's best-performing angle and relaunch against the same audience.",
                group.spend * 0.18,
                group,
            ))
    return actions


def make_action(action_type: str, title: str, subject: str, summary: str, next_step: str, impact: float, group: GroupSummary) -> Action:
    action_id = re.sub(r"\W+", "-", f"{action_type}-{title}-{round(group.spend)}").strip("-").lower()
    confidence = "High" if action_type in {"urgent", "scale"} else "Medium"
    return Action(
        id=action_id,
        type=action_type,
        title=title,
        subject=subject,
        summary=summary,
        next_step=next_step,
        impact=impact,
        confidence=confidence,
        group=group,
    )


def analyze_angles(rows: list[NormalizedRow]) -> list[AngleSummary]:
    rows_by_angle: dict[str, list[NormalizedRow]] = defaultdict(list)
    for row in rows:
        rows_by_angle[detect_angle(row.creative_text)].append(row)

    angles: list[AngleSummary] = []
    for angle, angle_rows in rows_by_angle.items():
        summary = summarize_group(angle, angle_rows)
        score = (1 / summary.qcpl) * summary.qualified_rate * 1000 if summary.qualified_leads else 0
        angles.append(AngleSummary(**summary.model_dump(), angle=angle, score=score))
    return sorted(angles, key=lambda item: item.score, reverse=True)


def group_by(rows: list[NormalizedRow], make_key: Callable[[NormalizedRow], str]) -> list[GroupSummary]:
    groups: dict[str, list[NormalizedRow]] = defaultdict(list)
    for row in rows:
        groups[make_key(row)].append(row)
    return [summarize_group(key, group_rows) for key, group_rows in groups.items()]


def summarize_group(key: str, rows: list[NormalizedRow]) -> GroupSummary:
    spend = sum(row.spend for row in rows)
    impressions = sum(row.impressions for row in rows)
    clicks = sum(row.clicks for row in rows)
    leads = sum(row.leads for row in rows)
    qualified = sum(row.qualified_leads for row in rows)
    revenue = sum(row.revenue for row in rows)
    first_row = rows[0] if rows else None
    return GroupSummary(
        key=key,
        platform=first_row.platform if first_row else "Unknown",
        campaign=first_row.campaign if first_row else key,
        ad_name=first_row.ad_name if first_row else key,
        creative_text=first_row.creative_text if first_row else "",
        landing_page_url=first_row.landing_page_url if first_row else "",
        spend=spend,
        impressions=impressions,
        clicks=clicks,
        leads=leads,
        qualified_leads=qualified,
        revenue=revenue,
        cpl=spend / leads if leads else spend,
        qcpl=spend / qualified if qualified else spend,
        ctr=clicks / impressions if impressions else 0,
        cvr=leads / clicks if clicks else 0,
        qualified_rate=qualified / leads if leads else 0,
    )


def generate_brief(action: Action, analysis: dict[str, Any]) -> str:
    account = analysis["account"]
    angles = analysis.get("angles", [])
    best_angle = field(angles[0], "angle") if angles else "best-performing offer message"
    group = action.group
    success_qcpl = (field(account, "qcpl") or field(group, "qcpl")) * 0.85
    kill_spend = max(150, field(group, "qcpl") * 1.25)
    return "\n".join([
        f"Experiment Plan: {action.title}",
        "",
        f"Hypothesis: {action.next_step}",
        "",
        f"Evidence: {action.summary}",
        "",
        "Launch Plan:",
        f"- Platform: {field(group, 'platform')}",
        f"- Campaign: {field(group, 'campaign')}",
        f"- Current ad: {field(group, 'ad_name')}",
        f"- Ad copy direction: Use the {best_angle} message and create 5 fresh hooks.",
        f"- Landing page: {field(group, 'landing_page_url') or 'Use the current destination, then test a message-matched page.'}",
        "",
        "Success Rule:",
        f"- Keep if qualified CPL stays below ${success_qcpl:,.0f} after 15 qualified leads.",
        "",
        "Kill Rule:",
        f"- Pause if spend reaches ${kill_spend:,.0f} without a qualified lead signal.",
        "",
        "What to measure:",
        "- CTR, lead conversion rate, qualified lead rate, qualified CPL, and downstream revenue when available.",
    ])


def export_actions_markdown(analysis: dict[str, Any]) -> str:
    actions = analysis.get("actions", [])
    rows = analysis.get("rows", [])
    chunks = ["# Signal Desk Action Queue", "", f"Generated from {len(rows)} normalized performance rows.", ""]
    for index, action in enumerate(actions, start=1):
        chunks.extend([
            f"## {index}. {field(action, 'title')}",
            f"- Type: {label_for_type(field(action, 'type'))}",
            f"- Estimated impact: ${field(action, 'impact'):,.0f}",
            f"- Confidence: {field(action, 'confidence')}",
            f"- Reason: {field(action, 'summary')}",
            f"- Next step: {field(action, 'next_step')}",
            "",
        ])
    return "\n".join(chunks)


def detect_angle(text: str) -> str:
    copy = text.lower()
    matches = [
        ("Savings", ["save", "savings", "lower", "cheap", "slash", "rate", "bill"]),
        ("Urgency", ["today", "fast", "expire", "now", "same-day", "60 seconds"]),
        ("Quiz", ["quiz", "check", "compare", "see if", "qualifies"]),
        ("Authority", ["licensed", "trusted", "guide", "provider", "expert"]),
        ("Problem/Symptom", ["stress", "minimum payment", "surprised", "need", "balance"]),
    ]
    for label, words in matches:
        if any(word in copy for word in words):
            return label
    return "General Benefit"


def first(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return value
    return ""


def parse_number(value: Any) -> float:
    if isinstance(value, int | float):
        return float(value)
    cleaned = re.sub(r"[$,%\s,]", "", str(value or ""))
    try:
        return float(cleaned)
    except ValueError:
        return 0


def to_key(value: str) -> str:
    return re.sub(r"[\s-]+", "_", str(value).strip().lower())


def label_for_type(action_type: str) -> str:
    return {
        "urgent": "Urgent",
        "scale": "Scale",
        "creative": "Creative",
        "landing-page": "Landing Page",
    }.get(action_type, "Action")


def field(item: Any, key: str) -> Any:
    if isinstance(item, dict):
        return item.get(key)
    return getattr(item, key)
