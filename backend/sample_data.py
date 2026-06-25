from __future__ import annotations

import csv
from pathlib import Path
from typing import Any


def load_sample_rows() -> list[dict[str, Any]]:
    sample_path = Path(__file__).with_name("sample-data.csv")
    with sample_path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))
