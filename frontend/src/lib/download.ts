/** Creates an object URL for in-app previews. Must be revoked by the caller. */
export function createObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/** Safe revoke — no-ops for null/undefined values. */
export function revokeObjectURL(url: string | null | undefined): void {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore: URL may already be revoked */
  }
}

/** Triggers a browser download for a blob, cleaning up its object URL. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke shortly after the download starts so the browser can stream it.
  window.setTimeout(() => revokeObjectURL(url), 1000);
}

/** Triggers a browser download for a plain-text payload. */
export function downloadText(
  text: string,
  filename: string,
  mimeType = "text/plain;charset=utf-8",
): void {
  downloadBlob(new Blob([text], { type: mimeType }), filename);
}

/** Copies text to the clipboard; falls back to a hidden textarea when needed. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
