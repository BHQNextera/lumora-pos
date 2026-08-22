# Lumora Design System

Status: V1 baseline

This document is the human-readable source of truth for Lumora UI.
Runtime values live in:

`src/theme/lumora-tokens.css`

Components should consume tokens rather than inventing local
font sizes, colors, radii or shadows.

## Font

Font stack:

`Inter, "Segoe UI", Arial, sans-serif`

## Utility / Modal Typography

| Role | Size | Weight |
|---|---:|---:|
| Modal title | 17px | 700 |
| Modal subtitle | 10px | 400 |
| Card title | 13px | 700 |
| Card metadata | 10px | 400 |
| Utility button | 10px | 650 |

## Lumora Gold

| Token | Value |
|---|---|
| Accent | `#c9942f` |
| Accent strong | `#b47d1e` |
| Accent soft | `#faf3e4` |
| Accent border | `#e5d2aa` |

Gold is an accent and primary-action cue.
Do not use large gold/beige surfaces unless the component is
explicitly a primary call to action.

## Utility Modal

- Radius: `16px`
- Border: `#dedfe1`
- Shadow: `0 24px 70px rgb(15 18 21 / 22%)`
- Header padding: `16px 18px`
- Header divider: `#eceeef`
- Close control: `34x34px`
- Close radius: `9px`
- Close background: `#f4f5f5`

## Cards

- Radius: `12px`
- Border: `#e4e5e7`
- Background: white
- Title: `13px`
- Metadata: `10px`

## Utility Buttons

- Minimum height: `34px`
- Radius: `8px`
- Font: `10px`
- Weight: `650`

Primary action uses Lumora Gold.
Secondary actions use white / neutral surfaces.

## Rules

1. Do not select visual values by eye inside individual components.
2. Use Lumora tokens whenever an existing semantic token applies.
3. New reusable visual values must be added to the token file first.
4. A component may define layout dimensions specific to its purpose,
   but shared typography, colors, controls, radii and shadows belong
   to the design system.
5. RTL and LTR must preserve the same visual hierarchy.
6. Operator usability takes priority over decorative styling.
7. Visual review remains QA; screenshots must not become the source
   of numeric design values.

## Current reference baseline

The utility/modal baseline was extracted from the approved
Held Sales visual language and the existing Lumora gold language.

Future changes to these values must be intentional Design System
changes, not isolated component tweaks.