# Overlay stacking

All Radix-based modals (`Dialog`, `Sheet`, `AlertDialog`, `Drawer`) use the **`z-overlay`** plane (CSS `--z-overlay: 50`). Nested modals share the same z-index; **later portals win** via DOM order on `document.body`.

Floating UI portaled above modals (`Popover`, `Select`, `DropdownMenu`, `ContextMenu`, `HoverCard`, `Menubar` submenus) use **`z-popover`** (`60`).

| Token | Utility | Use |
|-------|---------|-----|
| `--z-overlay` | `z-overlay` | Modal backdrops and content |
| `--z-popover` | `z-popover` | Menus, popovers, comboboxes inside modals |
| `--z-toast` | `z-toast` | Toasts (Sonner root) |
| `--z-fullscreen` | `z-fullscreen` | Lesson deliver / present shells above normal UI |

**Do not** assign ad-hoc `z-[100]` on `DrawerContent` or `DialogContent` — it breaks stacking against `AlertDialog` and other overlays.

Custom fixed layers above modals but below fullscreen: use inline `style={{ zIndex: 60 }}` or extend tokens in `globals.css` with a documented name.
