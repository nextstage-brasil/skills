# Item card — appearance on the canvas

Normative guide for **how the Item card must appear on the canvas** of the flow editor: zones, content, visual states, handles, and footer.

For design, product, and visual validation. **Does not describe** edit forms — those live in the side panel (see [form-panel.md](form-panel.md)).

**Does not cover:**
- Editable item fields — see [form-panel.md](form-panel.md)
- Grid and positioning on the canvas — see the project's technical layout doc

**Source of truth in code:**
| File | Responsibility |
|------|----------------|
| `src/components/canvas/ItemCard.tsx` | Card visual structure |
| `src/components/canvas/NodeTypeIconFrame.tsx` | Shared type-icon frame |

**Related documents:**
- [form-panel.md](form-panel.md) — form in the side panel
- [shell-panel.md](shell-panel.md) — panel shell

---

## What it is

An **informative card** on the flow graph. It represents a catalog item and the members linked to it. The card body is **read-only** — the user glances which item is configured and who is in the group, without inline editing.

To choose or change the item, the user selects the card and edits in the panel on the right.

---

## Overview — block order

```
●─────────────────────────────────────○
│  [Icon] Item                 [🗑]   │  ← header (trash only in edit)
├─────────────────────────────────────┤
│  ITEM                               │
│  Item name                          │
│                                     │
│  MEMBERS                            │
│  [○ Ana] [○ Bruno] [○ Carla]  +2   │  ← chips or state message
├─────────────────────────────────────┤
│  [+ Subitem]      [+ Group]         │  ← edit mode only
└─────────────────────────────────────┘
  ● = input handle (left)
  ○ = decorative output handle (right)
```

---

## Dimensions and container

| Element | How it should appear |
|---------|----------------------|
| Fixed width | **320px** |
| Background | White, discreet border, light shadow |
| Inner spacing | Header, body, and footer with **16px** horizontal padding |
| Height | Variable with chip count (wrapping allowed) |

---

## Header

| Element | How it should appear |
|---------|----------------------|
| Icon | Inside the shared type-node frame |
| Type label | **Item** — semibold, dark gray, beside the icon |
| Delete | Trash icon button on the right; gray, red on hover; **edit mode only** |

---

## Body — Item section

| Element | How it should appear |
|---------|----------------------|
| Section label | **Item** — uppercase, wide tracking, light gray |
| Value | One emphasized title line |

### Title states

| Situation | Text shown |
|-----------|------------|
| No item selected | **No item set** |
| Item selected with name | Item name |
| Empty title with item already linked | **Item** (fallback) |

---

## Body — Members section

| Element | How it should appear |
|---------|----------------------|
| Section label | **Members** — uppercase, wide tracking, light gray |
| Chips | Circular avatar + name; light gray fill, discreet border |
| Overflow | After 3 visible chips, show **+N** for the remainder |
| Empty list | **No members linked** — gray italic text |

---

## Footer

| Element | How it should appear |
|---------|----------------------|
| Visibility | **Edit mode only** |
| Buttons | **+ Subitem** and **+ Group** — secondary style, side by side |
| Follow-along mode | Footer hidden |

---

## Palette and style

| Element | Appearance |
|---------|------------|
| Card background | White (`#FFFFFF`) |
| Border | Light gray, 1px |
| Shadow | Light, subtle elevation |
| Label text | Medium gray, `text-xs`, uppercase |
| Value text | Dark gray, `text-sm`, font-medium |

---

## Expected visual behavior

| User action | What changes on screen |
|-------------|------------------------|
| Select the card | Blue selection border around the container |
| Hover | Slightly stronger shadow |
| Click delete (edit) | Card removed from canvas after confirmation |
| Switch to follow-along mode | Trash and footer disappear |

---

## Quick visual checklist

- [ ] Header with icon, label, and trash (edit only)
- [ ] RO body with Item and Members sections
- [ ] Empty states "No item set" and "No members linked"
- [ ] Chip overflow with +N
- [ ] Footer with create buttons (edit only)
- [ ] Input and output handles visible
- [ ] Selection and hover states documented
