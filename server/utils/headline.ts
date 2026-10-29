/** Remove only publisher decorations tied to the source host, never arbitrary countries. */
export function cleanHeadline(headline: string, sourceUrl: string): string {
  let host: string;
  try {
    host = new URL(sourceUrl).hostname;
  } catch {
    return headline;
  }
  const brand = host
    .split(".")
    .filter(
      (part) =>
        part.length > 2 && !["www", "com", "org", "net", "news"].includes(part),
    )
    .at(-1);
  if (!brand) return headline;
  const compact = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const publisher = (text: string) => {
    const plain = compact(text);
    if (plain === compact(host) || plain === brand) return true;
    return (
      plain.startsWith(brand) &&
      /^(?:news|newspapers|newspaper|limited|ltd|media|online|com|org)*$/.test(
        plain.slice(brand.length),
      )
    );
  };
  let result = headline.trim();
  while (true) {
    const separator = [...result.matchAll(/\s+[|–—-]\s+/g)].at(-1);
    if (
      !separator ||
      !publisher(result.slice(separator.index! + separator[0].length))
    )
      break;
    result = result.slice(0, separator.index).trim();
  }
  while (true) {
    const separator = /\s+[|–—-]\s+/.exec(result);
    if (!separator || !publisher(result.slice(0, separator.index))) break;
    result = result.slice(separator.index + separator[0].length).trim();
  }
  return result;
}
