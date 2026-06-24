import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import StarterKit from "@tiptap/starter-kit";

/**
 * Single source of truth for the news rich-text schema.
 * Used by the editor (client), the server-side HTML renderer, and the
 * Steam-ingest bbcode→JSON converter so all three agree on which nodes/marks
 * (incl. images and YouTube embeds) are preserved.
 *
 * Youtube parses `div[data-youtube-video] iframe` on the way in (the shape
 * legacy articles store embeds as) and renders a responsive iframe on the way out.
 */
export const NEWS_TIPTAP_EXTENSIONS = [
  StarterKit,
  Image,
  Youtube.configure({ controls: true, nocookie: false }),
];
