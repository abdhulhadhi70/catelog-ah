/**
 * Image URL handling.
 *
 * Google Drive share links are not images; they open Drive's viewer. We turn
 * them into Google's image CDN URL, which serves the file directly and can
 * resize it:  https://lh3.googleusercontent.com/d/<ID>=w800
 *
 * Supported Drive formats:
 *   https://drive.google.com/file/d/<ID>/view?usp=sharing
 *   https://drive.google.com/open?id=<ID>
 *   https://drive.google.com/uc?id=<ID>&export=view
 *   https://drive.usercontent.google.com/download?id=<ID>
 *
 * Any other https:// URL (Cloudinary, ImgBB, ...) is used as-is, and a path
 * starting with "/" is treated as an image hosted on this site.
 */

const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com", "drive.usercontent.google.com"]);
const ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

/** Return the Drive file ID in a link, or null if it is not a Drive link. */
export function driveFileId(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!DRIVE_HOSTS.has(u.hostname)) return null;
  const fromPath = u.pathname.match(/\/(?:file\/)?d\/([^/]+)/);
  const id = fromPath ? fromPath[1] : u.searchParams.get("id");
  return id && ID_PATTERN.test(id) ? id : null;
}

/**
 * Convert one image cell value into { src, thumb }.
 * Returns { error } instead when the value cannot be used.
 */
export function toImage(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;

  if (value.startsWith("/") && !value.startsWith("//")) {
    return { src: value, thumb: value };
  }

  let u;
  try {
    u = new URL(value);
  } catch {
    return { error: `"${shorten(value)}" is not a link` };
  }

  if (DRIVE_HOSTS.has(u.hostname)) {
    if (u.pathname.includes("/folders/")) {
      return { error: "this is a Drive folder link; use the link of a single photo" };
    }
    const id = driveFileId(value);
    if (!id) return { error: `couldn't find the file ID in Drive link "${shorten(value)}"` };
    const base = `https://lh3.googleusercontent.com/d/${id}`;
    return { src: `${base}=w800`, thumb: `${base}=w400` };
  }

  if (u.protocol !== "https:") {
    return { error: `image link must start with https:// ("${shorten(value)}")` };
  }
  return { src: value, thumb: value };
}

/** Split an images cell: links separated by commas, spaces or new lines. */
export function splitImageCell(cell) {
  return String(cell || "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function shorten(s) {
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}
