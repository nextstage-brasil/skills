# Item form — appearance in the side panel

Normative guide for **how the Item edit form must appear in the side panel**: block order, toggles, empty states, and modes.

For design, product, and visual validation. **Does not describe** the panel shell or the canvas card.

**Does not cover:**
- Fixed panel structure (width, header, scroll) — see [shell-panel.md](shell-panel.md)
- Canvas card appearance — see [card-canvas.md](card-canvas.md)

**Source of truth in code:**
| File | Responsibility |
|------|----------------|
| `src/components/panel/ItemForm.tsx` | Form fields and blocks |
| `src/components/panel/PanelHeader.tsx` | Shared panel header |

**Related documents:**
- [card-canvas.md](card-canvas.md) — canvas card
- [shell-panel.md](shell-panel.md) — panel shell

---

## What it is

Form shown in the side panel when the user selects an Item card on the canvas. Lets the user edit name, members, and item settings. Changes reflect on the card in real time.

---

## What it does not show

| Absent section | Reason |
|----------------|--------|
| Subitem create buttons | Live on the canvas card footer |
| Connection handles | Belong to the card, not the form |

---

## Overview — block order

```
┌─────────────────────────────┐
│  PANEL HEADER               │  ← type + editable name
├─────────────────────────────┤
│  Identification             │
│  [name field]               │
│                             │
│  Members                    │
│  [list / empty state]       │
│                             │
│  Settings                   │
│  [active toggle]            │
│  [visible toggle]           │
│                             │
│  ▼ Advanced details         │  ← accordion closed by default
│    [conditional fields]     │
└─────────────────────────────┘
```

---

## Panel header

| Element | How it should appear |
|---------|----------------------|
| Type | **Item** label — uppercase, light gray |
| Editable name | Inline field in the header; placeholder **Item name** |
| No name | Show placeholder until the user types |

---

## Identification block

| Element | How it should appear |
|---------|----------------------|
| Section label | **Identification** — `text-sm`, semibold |
| Name field | Full-width text input |
| Validation | Red border + message below if name empty on save |

---

## Members block

| Element | How it should appear |
|---------|----------------------|
| Section label | **Members** — `text-sm`, semibold |
| Filled list | Chips with avatar + name; remove button per chip |
| Empty state | **No members added** — gray centered text |
| Action | **+ Add member** button — secondary, below the list |

---

## Settings block

| Element | How it should appear |
|---------|----------------------|
| Active toggle | **Active** label left, switch right; default on |
| Visible toggle | **Visible on canvas** label left, switch right; default on |
| Disabled | Gray switch, no interaction; reduced label opacity |

---

## Advanced details accordion

| Element | How it should appear |
|---------|----------------------|
| Default state | Closed |
| Header | **Advanced details** with chevron; click expands/collapses |
| Content | Extra fields only visible when expanded |

---

## Modes

| State | Body shown |
|-------|------------|
| Edit | All fields interactive |
| Follow-along | Read-only fields; toggles disabled; no add-member button |

---

## Expected visual behavior

| User action | What changes on screen |
|-------------|------------------------|
| Type in name field | Canvas card title updates in real time |
| Add member | New chip appears in the list and on the card |
| Turn off Active | Canvas card shows inactive visual indicator |
| Expand accordion | Advanced fields slide down |

---

## Quick visual checklist

- [ ] Block order: Identification → Members → Settings → Accordion
- [ ] Members section shows empty-state copy when member list is empty (DOM text present)
- [ ] Each named toggle shows `aria-checked` true/false; `disabled` attribute when off-limits (inspect DOM)
- [ ] Accordion body collapsed on initial render (panel hidden in DOM or `aria-expanded=false`)
- [ ] Follow-along mode: named form fields carry `readonly` or `disabled` when mode active (inspect DOM)
