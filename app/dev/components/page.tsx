import type { Metadata } from "next";
import { Gallery } from "./gallery";

export const metadata: Metadata = { title: "Component gallery" };

/** FE-02: every shared component, light and dark side by side. Dev-only page with inline sample props. */
export default function ComponentGalleryPage() {
  return <Gallery />;
}
