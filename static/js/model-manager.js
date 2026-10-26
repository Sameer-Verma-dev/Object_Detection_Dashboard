/* Model adapter layer. UI talks only to ModelManager; adapters wrap a runtime.
 * An adapter implements: load(baseUrl, onProgress) -> info, predict(imageEl) -> [{className, probability}], dispose().
 * To support another runtime, add an adapter and register it in ADAPTERS. */
(function () {
  class TeachableMachineAdapter {
    async load(baseUrl, onProgress) {
      if (!window.tmImage)
        throw new AppError(
          "runtime",
          "The Teachable Machine library did not load. Check your internet connection and reload.",
        );
      onProgress && onProgress("Fetching model files…");
      this.model = await window.tmImage.load(
        baseUrl + "model.json",
        baseUrl + "metadata.json",
      );
      const labels = this.model.getClassLabels();
      if (!labels || !labels.length)
        throw new AppError(
          "incompatible",
          "The model loaded but has no class labels.",
        );
      let input = null;
      try {
        const s = this.model.model.inputs[0].shape;
        if (s && s.length >= 3) input = `${s[1]} × ${s[2]} px`;
      } catch (e) {}
      return {
        classNames: labels,
        inputSize: input,
        type: "Google Teachable Machine image model",
      };
    }
    async predict(el) {
      const raw = await this.model.predict(el);
      return raw.map((p) => ({
        className: p.className,
        probability: p.probability,
      }));
    }
    dispose() {
      try {
        this.model && this.model.dispose && this.model.dispose();
      } catch (e) {}
      this.model = null;
    }
  }
  const ADAPTERS = { teachable: TeachableMachineAdapter };

  class AppError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }

  function classifyLoadError(err) {
    if (err instanceof AppError) return err;
    const msg = String((err && err.message) || err);
    if (/Failed to fetch|NetworkError|Load failed|CORS/i.test(msg))
      return new AppError(
        "network",
        "Could not reach the model. Check your connection, and make sure the host allows cross-origin (CORS) requests.",
      );
    if (/404|not found/i.test(msg))
      return new AppError(
        "not_found",
        "No model found at that URL. Re-copy the shareable link from Teachable Machine.",
      );
    return new AppError(
      "incompatible",
      "That URL did not return a compatible Teachable Machine image model. (" +
        msg.slice(0, 120) +
        ")",
    );
  }

  class ModelManager extends EventTarget {
    constructor(config) {
      super();
      this.config = config;
      this.state = "none"; // none | loading | ready | error
      this.adapter = null;
      this.info = null;
      this.url = null;
      this.busy = false;
      this.loadPromise = null;
    }
    _set(state) {
      this.state = state;
      this.dispatchEvent(new CustomEvent("state", { detail: state }));
    }
    async load(baseUrl, type = "teachable") {
      if (this.state === "loading") return this.loadPromise; // no duplicate loads
      if (this.busy)
        throw new AppError("busy", "Wait for the current analysis to finish.");
      this.loadPromise = this._load(baseUrl, type).finally(() => {
        this.loadPromise = null;
      });
      return this.loadPromise;
    }
    async _load(baseUrl, type) {
      const prev = this.adapter;
      this._set("loading");
      const next = new ADAPTERS[type]();
      try {
        const info = await next.load(baseUrl, (m) =>
          this.dispatchEvent(new CustomEvent("progress", { detail: m })),
        );
        prev && prev.dispose();
        this.adapter = next;
        this.info = info;
        this.url = baseUrl;
        this._set("ready");
        return info;
      } catch (e) {
        next.dispose();
        if (!prev) {
          this.adapter = null;
          this.info = null;
          this.url = null;
        }
        this._set(prev ? "ready" : "error");
        throw classifyLoadError(e);
      }
    }
    async predict(el) {
      if (this.state !== "ready")
        throw new AppError("no_model", "Load a model before analyzing.");
      if (this.busy)
        throw new AppError("busy", "An analysis is already running.");
      this.busy = true;
      try {
        const t0 = performance.now();
        const preds = await this.adapter.predict(el);
        const inferenceTimeMs = Math.round(performance.now() - t0);
        preds.sort((a, b) => b.probability - a.probability);
        if (!preds.length) throw new Error("empty output");
        return { predictions: preds, topPrediction: preds[0], inferenceTimeMs };
      } catch (e) {
        throw e instanceof AppError
          ? e
          : new AppError(
              "predict",
              "The model could not classify this image. Try another image.",
            );
      } finally {
        this.busy = false;
      }
    }
    confidenceLevel(p) {
      return p >= this.config.highThreshold
        ? "high"
        : p >= this.config.lowThreshold
          ? "moderate"
          : "low";
    }
  }
  window.ModelManager = ModelManager;
  window.AppError = AppError;
})();
