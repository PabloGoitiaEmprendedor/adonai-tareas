---
name: Adonai Tasks
description: "Task management desktop app with Notioneers-inspired aesthetic — clean, minimal, and lime-accented."
colors:
  primary: "#C3F53C"
  primary-container: "#E8F5D6"
  on-primary: "#405143"
  secondary: "#F5F5F0"
  secondary-container: "#EBEBE3"
  on-secondary: "#405143"
  tertiary: "#F5F0D9"
  tertiary-container: "#E8E0C8"
  on-tertiary: "#405143"
  surface: "#FFFFFF"
  surface-dim: "#F5F5F0"
  surface-container-lowest: "#FFFFFF"
  surface-container-low: "#F8F9FA"
  surface-container: "#F5F5F0"
  surface-container-high: "#EBEBE3"
  surface-container-highest: "#E3E3DB"
  on-surface: "#405143"
  on-surface-variant: "#6B7280"
  outline: "#CCCCCC"
  outline-variant: "#E5E5E5"
  error: "#EF4444"
  error-container: "#FEE2E2"
  on-error: "#FFFFFF"
  background: "#F8F9FA"
  foreground: "#405143"
  notion-lime: "#C3F53C"
  notion-forest: "#405143"
  notion-cream: "#F5F0D9"
  notion-mint: "#E9F7EF"
typography:
  h1:
    fontFamily: Fraunces
    fontSize: 2.5rem
    fontWeight: 900
  h2:
    fontFamily: Fraunces
    fontSize: 2rem
    fontWeight: 900
  h3:
    fontFamily: Fraunces
    fontSize: 1.5rem
    fontWeight: 900
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 700
    letterSpacing: 0.2em
    textTransform: uppercase
  button:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 700
rounded:
  sm: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 2.5rem
spacing:
  xs: 0.5rem
  sm: 0.75rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.notion-lime}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.lg}"
    padding: 12px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
  sidebar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "0px"
---

## Overview

Clean, minimal task management app inspired by Notioneers aesthetics and Google Material Design surface system. The UI uses a warm off-white background (#F8F9FA), pure white cards, and a vibrant lime green (#C3F53C) as the primary accent. Typography combines Fraunces (serif, bold) for headlines with Inter (sans-serif) for body text. The design feels premium, calm, and productivity-focused.

## Colors

The palette is built around Google Material's surface system with a Notioneers-inspired lime accent.

- **Background (#F8F9FA):** Google off-white foundation. Softer than pure white, easy on the eyes.
- **Surface (#FFFFFF):** Pure white for cards, dialogs, sidebar. Creates clear elevation.
- **Primary (#C3F53C):** Vibrant lime green — the sole interaction driver. Used for CTAs, active states, rings.
- **Foreground (#405143):** Deep forest green for text. Softer than pure black, maintains readability.
- **On-surface-variant (#6B7280):** Muted gray for secondary text, labels, metadata.
- **Surface containers:** Graduated neutrals (low → highest) for layered depth without shadows.
- **Error (#EF4444):** Standard red for destructive actions.

Notion-inspired palette tokens:
- **Lime (#C3F53C):** Primary accent, matches `primary`.
- **Forest (#405143):** Deep green text color, matches `foreground`.
- **Cream (#F5F0D9):** Warm tertiary surface.
- **Mint (#E9F7EF):** Fresh success/positive state.

## Typography

Two-font system with strong personality contrast.

- **Headlines:** Fraunces (serif), weight 900. Gives editorial, premium feel. Used for h1-h6.
- **Body/UI:** Inter (sans-serif), weights 300–800. Clean, legible, modern.
- **Labels:** Inter, 0.75rem, bold, uppercase, 0.2em letter-spacing. Used for section headers.

## Layout

- **Sidebar:** 280px fixed left panel on desktop. Glass effect with backdrop blur.
- **Main content:** Max-width 7xl (1400px), centered with lg:px-4 padding.
- **Mobile:** Bottom navigation bar. Sheet-based sidebar from left.
- **Cards:** Large rounded corners (2.5rem / 40px) for a soft, modern feel.
- **Desktop app bar:** 8px draggable title bar at top.

## Elevation & Depth

Uses surface color graduation instead of heavy shadows.

- **Base:** Background (#F8F9FA)
- **Cards:** Surface (#FFFFFF) with subtle border (outline-variant)
- **Sidebar/Sheets:** Surface (#FFFFFF) with glass-sheet utility (backdrop blur + border + shadow)
- **Dialogs:** Surface with rounded-3xl corners and elevated shadow

## Shapes

- **Buttons:** rounded-xl (1.5rem / 24px)
- **Cards:** rounded-2xl to rounded-3xl (2rem–2.5rem / 32px–40px)
- **Avatar containers:** rounded-2xl
- **Dialogs/Sheets:** rounded-3xl
- **Base radius:** 2rem (32px) — everything is generously rounded

## Components

### Button
- **Primary:** Lime background (#C3F53C), forest text (#405143), bold Inter, 24px vertical padding, rounded-xl.
- **Ghost:** Transparent background, on-surface-variant text, hover:bg-surface-container.
- **Destructive:** Error red text, hover:bg-error/10.

### Card
- White background, rounded-2xl/3xl, border-outline-variant/20, subtle shadow.
- Used for task items, settings panels, goal cards.

### Sidebar
- 280px wide, fixed left on desktop. White background, border-right.
- Profile header with avatar circle + email.
- Navigation items with ghost buttons, active state: bg-primary/20.
- Collapse toggle with Menu icon.

### Bottom Navigation
- Mobile-only. Fixed bottom, 4-5 items. Icons with labels.
- Active item highlighted with primary color.

### Dialog/Sheet
- Glass effect with backdrop blur, rounded-3xl.
- Header with icon in colored circle, centered title, description.
- Footer actions stacked on mobile, row on desktop.
