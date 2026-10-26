/* Camera controller. Always stops tracks on close. */
(function () {
  class Camera {
    constructor({ video, onCapture, onState, onError }) {
      Object.assign(this, { video, onCapture, onState, onError });
      this.stream = null;
    }
    get supported() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
    async open() {
      if (!this.supported)
        return this.onError(
          "unavailable",
          "Camera isn't supported here. Camera access needs HTTPS or localhost — upload an image instead.",
        );
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        this.video.srcObject = this.stream;
        await this.video.play();
        this.onState(true);
      } catch (e) {
        this.close();
        if (e.name === "NotAllowedError" || e.name === "SecurityError")
          this.onError(
            "denied",
            "Camera permission was denied. Allow camera access in your browser's site settings, or upload an image instead.",
          );
        else
          this.onError(
            "unavailable",
            "No camera was found or it is in use by another app. Upload an image instead.",
          );
      }
    }
    capture() {
      const v = this.video;
      if (!v.videoWidth) return;
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0);
      c.toBlob(
        (b) => {
          if (b)
            this.onCapture(
              new File([b], "capture.jpg", { type: "image/jpeg" }),
            );
        },
        "image/jpeg",
        0.92,
      );
      this.close();
    }
    close() {
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
      this.video.srcObject = null;
      this.onState(false);
    }
  }
  window.Camera = Camera;
})();
