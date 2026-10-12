import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinguaLocal",
    short_name: "LinguaLocal",
    description: "A learning hub on your school network",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f9f7",
    theme_color: "#214d39",
    icons: [
      {
        src: "/icons/app-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
