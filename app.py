"""VisionAI - Flask shell for an in-browser Teachable Machine classifier."""
import os
import re
from urllib.parse import urlparse

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Optional defaults via environment variables (no secrets involved).
CONFIG = {
    "defaultModelUrl": os.environ.get("MODEL_URL", ""),
    "maxUploadMb": float(os.environ.get("MAX_UPLOAD_MB", "8")),
    "highThreshold": float(os.environ.get("HIGH_CONFIDENCE", "0.80")),
    "lowThreshold": float(os.environ.get("LOW_CONFIDENCE", "0.50")),
}

TM_PATTERN = re.compile(r"^/models/[A-Za-z0-9_\-]+/?$")


def normalize_model_url(raw: str):
    """Return (url, error). Accepts a Teachable Machine share URL or a hosted model folder."""
    raw = (raw or "").strip()
    if not raw:
        return None, "Enter a model URL."
    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None, "The URL must start with https:// (or http:// for local hosting)."
    path = re.sub(r"/(model|metadata)\.json$", "/", parsed.path)
    if not path.endswith("/"):
        path += "/"
    if parsed.netloc == "teachablemachine.withgoogle.com" and not TM_PATTERN.match(path):
        return None, "Use the shareable link from Teachable Machine: https://teachablemachine.withgoogle.com/models/<id>/"
    return f"{parsed.scheme}://{parsed.netloc}{path}", None


@app.get("/")
def dashboard():
    return render_template("dashboard.html", config=CONFIG)


@app.get("/api/config")
def get_config():
    return jsonify(CONFIG)


@app.post("/api/validate-model-url")
def validate_model_url():
    data = request.get_json(silent=True) or {}
    url, error = normalize_model_url(data.get("url"))
    if error:
        return jsonify({"ok": False, "error": error}), 400
    return jsonify({"ok": True, "url": url})


@app.errorhandler(404)
def not_found(_):
    return jsonify({"ok": False, "error": "Not found"}), 404


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=int(os.environ.get("PORT", "5000")))
