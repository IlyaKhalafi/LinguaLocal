export type MediaFile = {
  file: string;
  bytes: number;
  kind: "audio" | "video" | "pdf" | "captions";
};
