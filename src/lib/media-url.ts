export function mediaUrl(file: string) {
  return `/api/media/${file.split("/").map(encodeURIComponent).join("/")}`;
}
