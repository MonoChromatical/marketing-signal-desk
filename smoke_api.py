from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

health = client.get("/api/health")
assert health.status_code == 200
assert health.json()["status"] == "ok"
assert "openai_configured" in health.json()
assert health.json()["provider"] in {"openai", "fallback"}

sample_csv = client.get("/api/sample-csv")
assert sample_csv.status_code == 200
assert "date,platform,campaign" in sample_csv.text

sample = client.get("/api/sample-account")
assert sample.status_code == 200
analysis = sample.json()
assert len(analysis["rows"]) == 15
assert len(analysis["actions"]) >= 4
assert analysis["account"]["spend"] > 0
urgent_actions = [action for action in analysis["actions"] if action["type"] == "urgent"]
assert urgent_actions
assert sum(action["impact"] for action in urgent_actions) > 0

brief = client.post("/api/generate-brief", json={
    "action_id": analysis["actions"][0]["id"],
    "analysis": analysis,
})
assert brief.status_code == 200
assert "Experiment Plan:" in brief.json()["brief"]

memo = client.post("/api/ai/daily-memo", json=analysis)
assert memo.status_code == 200
assert memo.json()["mode"] in {"fallback", "openai"}
assert "Daily Action Memo" in memo.json()["content"] or memo.json()["mode"] == "openai"

variants = client.post("/api/ai/creative-variants", json={
    "action_id": analysis["actions"][0]["id"],
    "analysis": analysis,
})
assert variants.status_code == 200
assert variants.json()["mode"] in {"fallback", "openai"}
assert "Ad Copy Idea" in variants.json()["content"] or variants.json()["mode"] == "openai"

export = client.post("/api/export-actions", json=analysis)
assert export.status_code == 200
assert "Signal Desk Action Queue" in export.json()["markdown"]

print("API smoke test passed")
