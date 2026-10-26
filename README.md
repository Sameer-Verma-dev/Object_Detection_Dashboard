# VisionAI — Teachable Machine image classifier (Flask + Jinja2)

Flask serves the pages and config; **all inference runs in the browser** with TensorFlow.js and the official `@teachablemachine/image` library. No images ever leave the device.

## Setup
```bash
cd vision-ai
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py                     # http://127.0.0.1:5000
```
Optional env vars: `MODEL_URL`, `MAX_UPLOAD_MB` (default 8), `HIGH_CONFIDENCE` (0.80), `LOW_CONFIDENCE` (0.50), `PORT`.
The page loads TF.js, the TM library and Lucide from jsDelivr, so you need internet access.

## Get a model URL
1. Train an **Image Project** at https://teachablemachine.withgoogle.com.
2. **Export Model → Tensorflow.js → Upload (shareable link)** → *Upload my model*.
3. Copy the link (`https://teachablemachine.withgoogle.com/models/<id>/`), open **Settings** in VisionAI, paste it, and select **Load model**.

URL handling: a trailing `model.json`/`metadata.json` is stripped and a trailing `/` added; the app then fetches `<url>model.json` and `<url>metadata.json`. Self-hosted models need both files plus `weights.bin`, served over HTTP(S) with `Access-Control-Allow-Origin` set.
Only Teachable Machine **image** models are supported. Pose/audio models and other formats are not compatible.

## Test with unseen images
Use photos that were not in your training set: new angles, lighting, backgrounds, and at least one object from *outside* your classes. A good model should show low confidence on the last one. Confidence is not accuracy.

## Troubleshooting
- **"Network or CORS" error:** check the connection; for self-hosted models enable CORS and serve both JSON files.
- **"No model found":** the share link may be unpublished or mistyped; re-upload from Teachable Machine.
- **"Not a compatible model":** the URL isn't an image model export.
- **Camera denied/unavailable:** allow camera in site settings. Cameras need `localhost` or HTTPS (opening via a LAN IP over HTTP will fail). Use Upload instead.
- **Libraries failed to load:** a firewall is blocking cdn.jsdelivr.net.

## Architecture
- `app.py` — serves the dashboard, `/api/config`, and `/api/validate-model-url` (server-side URL normalization/validation).
- `static/js/model-manager.js` — `ModelManager` (state, load/predict locks, error classification) over runtime **adapters**. It returns `{predictions[], topPrediction, inferenceTimeMs}`; time is measured with `performance.now()`.
- To add another runtime, write an adapter with `load / predict / dispose` and register it in `ADAPTERS`.
- `image-upload.js` (validation, object-URL cleanup), `camera.js` (stream/track cleanup), `dashboard.js` (UI wiring).
- Recent analysis keeps small thumbnails in memory only; they vanish on reload.

## Verification status
See the project hand-off notes for what was and wasn't tested in the build environment.
