/* Handles file picking, drag/drop, validation, and object-URL lifecycle. */
(function () {
  const TYPES = ["image/jpeg", "image/png", "image/webp"];
  class ImageUpload {
    constructor({ dropzone, input, maxMb, onChange, onError }) {
      Object.assign(this, {
        dropzone,
        input,
        maxBytes: maxMb * 1024 * 1024,
        maxMb,
        onChange,
        onError,
      });
      this.url = null;
      this.file = null;
      dropzone.addEventListener("click", () => input.click());
      dropzone.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          input.click();
        }
      });
      input.addEventListener("change", () => {
        if (input.files[0]) this.setFile(input.files[0]);
        input.value = "";
      });
      ["dragenter", "dragover"].forEach((ev) =>
        dropzone.addEventListener(ev, (e) => {
          e.preventDefault();
          dropzone.classList.add("is-over");
        }),
      );
      ["dragleave", "drop"].forEach((ev) =>
        dropzone.addEventListener(ev, (e) => {
          e.preventDefault();
          dropzone.classList.remove("is-over");
        }),
      );
      dropzone.addEventListener("drop", (e) => {
        const f = e.dataTransfer.files[0];
        if (f) this.setFile(f);
      });
    }
    browse() {
      this.input.click();
    }
    setFile(file) {
      if (!TYPES.includes(file.type))
        return this.onError(
          "Unsupported file type. Use a JPG, PNG or WEBP image.",
        );
      if (file.size > this.maxBytes)
        return this.onError(
          `That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${this.maxMb} MB — choose a smaller image.`,
        );
      this.clear(true);
      this.file = file;
      this.url = URL.createObjectURL(file);
      this.onChange(this.url, file);
    }
    clear(silent) {
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = null;
      this.file = null;
      if (!silent) this.onChange(null, null);
    }
  }
  window.ImageUpload = ImageUpload;
})();
