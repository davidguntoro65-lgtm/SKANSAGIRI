export function getTodayNewsDate() {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function splitNewsParagraphs(content: string) {
  return content
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
