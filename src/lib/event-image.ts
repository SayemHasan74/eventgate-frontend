// Use the existing image CDN directly. Unknown or signed image URLs retain
// their original URL; they must not be sent through an unrestricted proxy.
export function eventImageSources(src: string) {
  try {
    const url = new URL(src);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "images.unsplash.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.searchParams.has("s") ||
      url.searchParams.has("h")
    )
      return {};
    const srcSet = [320, 480, 640, 960, 1280, 1600]
      .map((width) => {
        const candidate = new URL(url);
        candidate.searchParams.set("w", String(width));
        // Width descriptors already account for pixel density in the browser.
        candidate.searchParams.delete("dpr");
        return `${candidate.href} ${width}w`;
      })
      .join(", ");
    return { srcSet };
  } catch {
    return {};
  }
}
