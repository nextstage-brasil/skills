# Side panel — shell appearance

Visual guide for **how the side panel must look and behave** on screen — **shell only** (fixed structure), without detailing fields that change by selected card type.

For design, product, and visual validation. **Does not describe** forms per selection type.

**Does not cover:**
- Fields and blocks per card type — see form docs (e.g. [form-panel.md](form-panel.md))
- Canvas card appearance — see card docs (e.g. [card-canvas.md](card-canvas.md))
- Grid calculation and positioning — see the project's technical layout doc

**Source of truth in code:**
| File | Responsibility |
|------|----------------|
| `src/components/panel/DetailPanel.tsx` | Panel container and structure |
| `src/components/panel/PanelHeader.tsx` | Fixed panel header |

**Related documents:**
- [form-panel.md](form-panel.md) — content by selection type
- [card-canvas.md](card-canvas.md) — canvas cards

---

## What it is

The column to the **right of the canvas** where the user views and edits details of the selected card. It **does not float** over the map: it splits horizontal space with the canvas as two side-by-side areas.

The panel **only appears** when a card is selected. With no selection, the canvas takes the full available width.

---

## On-screen overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Page header (title, global actions)                             │
├────────────────────────────────────────────┬─────────────────────┤
│                                            │                     │
│                                            │  ┌───────────────┐  │
│         Canvas (card map)                  │  │  Header       │  │
│                                            │  ├───────────────┤  │
│                                            │  │               │  │
│                                            │  │  Content      │  │
│                                            │  │  (scrollable) │  │
│                                            │  │               │  │
│                                            │  └───────────────┘  │
│                                            │   Side panel        │
└────────────────────────────────────────────┴─────────────────────┘
```

---

## Proportions and position

| Aspect | How it should appear |
|--------|----------------------|
| Position | Fixed column to the **right** of the canvas |
| Width | **480px** — enough for forms without crushing the map |
| Height | Same height as the canvas area (below the page header) |
| Background | White |
| Separation from canvas | Discreet vertical light-gray line |

The panel **does not shrink** when the canvas needs space: the 480px width is preserved.

---

## Two-part structure

```
┌─────────────────────────────┐
│  HEADER                     │  ← always visible at top
├─────────────────────────────┤
│                             │
│  CONTENT                    │  ← scrolls when content is long
│                             │
└─────────────────────────────┘
```

| Part | How it should appear |
|------|----------------------|
| Header | Fixed at top; does not scroll with content |
| Content | Scrollable area; **24px** inner padding |
| Fixed footer | **None** — no Save/Cancel bar in the shell |

---

## Panel header

| Element | How it should appear |
|---------|----------------------|
| Height | Compact (~56px) |
| Background | White, discreet bottom border |
| Content | Card type + editable name (owned by child form) |
| No selection | Entire panel hidden — header never appears alone |

---

## Content area

| Element | How it should appear |
|---------|----------------------|
| Scroll | Vertical when the form exceeds visible height |
| Padding | **24px** on all sides |
| Background | White, continuous with the header |
| Transition | On card change, content swaps with no slide animation |

---

## Visibility states

| Situation | Appearance |
|-----------|------------|
| No card selected | Panel hidden; canvas full width |
| Card selected | Panel visible on the right with header + content |
| Resize window | Panel stays 480px; canvas absorbs the rest |

---

## Palette and style

| Element | Appearance |
|---------|------------|
| Background | White (`#FFFFFF`) |
| Side border | Light gray, 1px on the left |
| Header | Light gray bottom border |
| Scrollbar | Discreet, light gray, thin |

---

## Expected visual behavior

| User action | What changes on screen |
|-------------|------------------------|
| Select a card | Panel appears on the right with the matching form |
| Deselect (click empty canvas) | Panel disappears; canvas expands |
| Switch selection between cards | Header and content update; scroll returns to top |
| Long content | Scrollbar appears in the content area |

---

## Quick visual checklist

- [ ] Fixed 480px column to the right of the canvas
- [ ] Visible only when a card is selected
- [ ] Fixed header + scrollable content
- [ ] No fixed action footer
- [ ] Discreet visual separation from the canvas
- [ ] Visibility states documented
- [ ] Cross-links to form and card docs
