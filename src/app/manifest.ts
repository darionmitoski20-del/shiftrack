import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShiftTracks",
    short_name: "ShiftTracks",
    description: "Work hours, approvals and chat for construction crews",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f3ef",
    theme_color: "#17191c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
