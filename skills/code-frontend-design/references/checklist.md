# UI delivery checklist

## Structure

- [ ] Semantic landmarks (`main`, `nav`, `header` where appropriate)
- [ ] Heading order logical (no skipped levels for styling)
- [ ] Interactive elements are buttons/links — not div click targets

## Visual

- [ ] Spacing aligns to project tokens or consistent scale
- [ ] Color contrast meets WCAG AA for text
- [ ] States: default, hover, focus, disabled, error
- [ ] Responsive: no horizontal scroll at 320px unless intentional

## Motion

- [ ] `prefers-reduced-motion` respected
- [ ] Animations under 300ms for feedback; no blocking loaders without context

## Integration

- [ ] Matches existing component library patterns when present
- [ ] No new global CSS unless justified
- [ ] Assets optimized (SVG for icons where possible)
