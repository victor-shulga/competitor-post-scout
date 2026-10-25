"""The rank stage on six synthetic YouTube videos of one channel: the breakout wins, the sponsored piece is left out.

Run: python3 -m unittest discover tests
"""
import json
import os
import shutil
import sys
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
TMP = Path(tempfile.mkdtemp())
(TMP / "runs").mkdir()
(TMP / "brain.json").write_text(json.dumps({"identity": {}, "icp": {}, "competitors": []}), encoding="utf-8")
(TMP / "local.json").write_text(json.dumps({"brain": str(TMP / "brain.json"), "runs": str(TMP / "runs")}), encoding="utf-8")
os.environ["CH_LOCAL"] = str(TMP / "local.json")   # before the import: hunt.py reads its paths at import time
sys.path.insert(0, str(APP / "engine"))
import hunt  # noqa: E402


def video(i, views):
    return {"id": "v%d" % i, "platform": "youtube", "handle": "@rival", "competitor": "Rival", "format": "long",
            "kind": "video", "views": views, "likes": views // 20, "comments": 0, "shares": None, "age_days": 10,
            "duration_s": 600, "published": "2026-10-01", "title": "video %d" % i, "url": "https://example.com/%d" % i,
            "description": ""}


def verdict(i, sponsored=0.0):
    return {"_id": "v%d" % i, "topic_lane": "method", "topic_lane_conf": 0.9, "topic_lane_probs": {"off_niche": 0.0},
            "icp_fit": 2.0, "icp_fit_conf": 0.9, "hook_type": "other", "proof": 2.0, "replicable": 0.8,
            "sponsored": sponsored, "newsjack": 0.0, "_sure": True}


class RankTest(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(TMP, ignore_errors=True)

    def test_breakout_wins_and_sponsored_is_left_out(self):
        run = TMP / "runs" / "t1"
        run.mkdir()
        views = [1000, 1000, 1000, 1000, 1200, 8000]
        hunt.write_json(run / "items.json", [video(i, v) for i, v in enumerate(views)])
        hunt.write_json(run / "competitors.json", [{"name": "Rival", "platform": "youtube", "handle": "@rival"}])
        hunt.write_json(run / "meta.json", {"own": True})            # own run: no markdown report written
        shutil.copyfile(APP / "jev" / "competitor-hunt.json", run / "preset.json")
        rows = [verdict(i, sponsored=0.95 if i == 0 else 0.0) for i in range(len(views))]
        (run / "verdicts.jsonl").write_text("\n".join(json.dumps(r) for r in rows), encoding="utf-8")

        hunt.cmd_rank(Namespace(run=str(run)))
        result = hunt.read_json(run / "result.json")

        ranked = [p["id"] for p in result["pieces"]]
        self.assertEqual(ranked[0], "v5")                           # 8x the channel median
        self.assertEqual(result["pieces"][0]["breakout"], 8.0)
        self.assertNotIn("v0", ranked)                              # Jev says sponsored -> out of the ranking
        self.assertEqual([p["id"] for p in result["paid"]], ["v0"])


if __name__ == "__main__":
    unittest.main()
