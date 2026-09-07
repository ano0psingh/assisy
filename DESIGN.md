---
name: "Assisy"
description: "A newsroom assignment desk for turning intentions into daily action."
colors:
  action: "#276d69"
  action-hover: "#205c59"
  action-active: "#184b49"
  action-soft: "#d6e5df"
  canvas: "#eee9dc"
  canvas-subtle: "#e6e0d2"
  surface: "#f8f4e9"
  surface-raised: "#fffdf6"
  surface-subtle: "#e9e3d5"
  surface-inset: "#dfd8c9"
  ink: "#222724"
  ink-secondary: "#505751"
  ink-muted: "#5f665f"
  rule: "#cbc3b3"
  rule-strong: "#968f81"
  danger: "#a63c35"
  danger-soft: "#f2d9d2"
  warning: "#85570f"
  warning-soft: "#f2e2b9"
  success: "#3f704f"
  success-soft: "#dbe7da"
  info: "#3e6477"
  info-soft: "#dbe5e9"
  dark-canvas: "#101714"
  dark-surface: "#1b2621"
  dark-surface-raised: "#293831"
  dark-ink: "#f4efe2"
  dark-ink-muted: "#b4ad9f"
  dark-rule: "#46574d"
  dark-action: "#93d4c7"
typography:
  display:
    fontFamily: "\"Barlow Condensed\", \"Arial Narrow\", ui-sans-serif, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "\"Barlow Condensed\", \"Arial Narrow\", ui-sans-serif, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  title:
    fontFamily: "\"Barlow Condensed\", \"Arial Narrow\", ui-sans-serif, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0.005em"
  body:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "ui-monospace, \"SFMono-Regular\", Menlo, Monaco, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.04em"
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  full: "999px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
  10: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  field:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.75rem"
    height: "2.75rem"
  assignment-card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.75rem"
  status-label:
    backgroundColor: "{colors.action-soft}"
    textColor: "{colors.action}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.2rem 0.6rem"
---

# Design System: Assisy

## Overview

**Creative North Star: "Newsroom Assignment Desk"**

Assisy is a working personal desk, not a generic dashboard. A warm raster newsprint canvas supports charcoal editorial type, opaque assignment slips, measured rules, and compact status notation. The result is practical and tactile: information is ranked like a live rundown, while controls remain familiar enough for repeated daily use.

The five hubs—Today, Tasks, Calendar, Plan, and Progress—share one shell and one semantic state vocabulary. Muted teal carries action and selection; restrained red is reserved for urgency and failure; amber marks scheduling or milestones. Dark mode is composed as night-edition newsprint: a deep green-black canvas, distinctly brighter charcoal assignment slips, warmer ink, and higher-chroma semantic marks that preserve AA contrast.

**Key Characteristics:**
- Warm, lightly textured newsprint behind opaque working surfaces.
- Condensed editorial headings paired with a neutral system-sans interface.
- Strong horizontal rules and occasional vertical dividers instead of card-grid decoration.
- Dense, tabular labels for counts, time, progress, and state.
- Teal action, red alert, amber milestone, green success, and blue-gray information roles.
- Desktop utility rails collapse into the main flow on narrow screens.

## Colors

The palette behaves like ink on paper: warm neutrals dominate, charcoal establishes hierarchy, and semantic colors are spent only where they communicate action or state.

### Primary
- **Muted Desk Teal:** The principal action, active-navigation, selection, focus, and progress color.
- **Pale Teal Wash:** The selected or emphasized background behind teal controls and scheduled work.

### Secondary
- **Restrained Alert Red:** Urgent assignments, overdue states, destructive actions, and errors.
- **Milestone Amber:** Scheduling intelligence, paused recurrence, energy bands, and milestone emphasis.

### Tertiary
- **Filed Green:** Completion, successful actions, habit evidence, and positive status.
- **Archive Blue-Gray:** Informational state and calendar categorization that should not compete with action.

### Neutral
- **Warm Newsprint:** The page canvas beneath the entire application.
- **Assignment Slip:** The brightest working surface for active assignments, rows, fields, and controls.
- **Charcoal Ink:** Primary copy, headings, and high-confidence state.
- **Editorial Rule:** Structural dividers, table grids, field strokes, and section boundaries.
- **Night Edition:** Dark mode uses a deliberate luminance ladder—green-black canvas, charcoal surface, raised assignment slip, then warm ink—rather than mechanically inverting the paper theme. A masked trace of the newsprint raster keeps the material visible without texturing working surfaces.

### Named Rules
**The Ink Before Accent Rule.** Most content is neutral; color appears when it changes the reader's decision or reports a state.

**The Restrained Alert Rule.** Red belongs to overdue, urgent, error, and destructive states—not general emphasis.

**The Opaque Paper Rule.** Working surfaces are opaque paper or charcoal panels; transparency is limited to modal backdrops, not ordinary cards.

## Typography

**Display Font:** Barlow Condensed (with Arial Narrow and system-sans fallback)
**Body Font:** System sans (with Segoe UI, Helvetica, and Arial fallbacks)
**Label/Mono Font:** System monospace (with SFMono, Menlo, Monaco, and Consolas fallbacks)

**Character:** Condensed, weighty headings bring an editorial desk voice without reducing body readability. The system sans carries controls and prose; monospace is reserved for operational facts.

### Hierarchy
- **Display:** Bold condensed type for primary page titles and featured assignment headlines; mobile steps down to a compact 1.375rem scale.
- **Headline:** Bold condensed type for major sections such as the active assignment and rundown.
- **Title:** Bold condensed type for local section and panel titles.
- **Body:** Regular system sans for content, explanation, and form input; compact supporting copy typically uses the smaller body steps.
- **Label:** Semibold monospace, often uppercase with tabular numerals, for counts, percentages, time, queue position, and status.

### Named Rules
**The Headline and Copy Rule.** Barlow Condensed speaks for hierarchy; system sans explains and operates.

**The Operational Numeral Rule.** Counts, percentages, dates, time, and queue positions use tabular numerals; compact status strings may use monospace.

## Layout

The shared shell uses a sticky 3.5rem masthead and a centered content column capped at 72rem. Page gutters are 1rem on phones and 1.5rem from the medium breakpoint. Main content keeps 5–8 spacing steps between major sections, with editorial rules creating stronger grouping than rounded containers.

Today is the reference topology: a single dominant rundown with a 15rem day-tools rail at the large breakpoint. Calendar uses a similar main-plus-utility arrangement with a 20rem unscheduled rail. Plan and Progress place page tabs directly beneath a ruled header, then render one active panel.

At widths below 48rem, the desktop primary navigation disappears and the five hubs become a fixed bottom bar. Today’s utility rail returns to normal document flow; Calendar defaults to a single-day schedule on narrow screens and exposes horizontal scrolling for the full week. The bottom bar, masthead, and floating capture action account for safe-area insets. Coarse-pointer controls and fields have a 44px minimum target.

**The Rundown Before Rail Rule.** Primary work owns the wider column; utilities may support it from a narrow rail but never compete for equal visual weight.

**The Five-Hub Rule.** Today, Tasks, Calendar, Plan, and Progress remain the stable primary destinations across desktop and mobile.

## Elevation & Depth

Depth is a hybrid of paper layering and sparse structural shadow. Rules and tonal surfaces do most of the work. Soft shadow marks ordinary assignment slips, medium shadow appears during hover, swipe, or floating capture, and elevated shadow is reserved for menus, drawers, and dialogs. The repeating newsprint raster is a material on the canvas, never a foreground texture over text.

### Shadow Vocabulary
- **Paper Lift:** `0 1px 2px rgb(42 40 35 / 0.08), 0 5px 14px rgb(42 40 35 / 0.04)` for ordinary cards and primary controls.
- **Active Lift:** `0 2px 5px rgb(42 40 35 / 0.1), 0 12px 28px rgb(42 40 35 / 0.08)` for hovered cards, swiped rows, and the mobile capture action.
- **Overlay Lift:** `0 4px 10px rgb(20 22 20 / 0.15), 0 24px 56px rgb(20 22 20 / 0.16)` for menus, drawers, and modal panels.

### Named Rules
**The Rules Carry Structure Rule.** Prefer borders, dividers, and tonal steps before adding shadow.

**The Texture Stays Behind Rule.** `app/public/newsprint-texture.png` repeats only on the canvas. It is the shipping raster derived from the authored `app/public/newsprint-texture.svg`, whose turbulence filter uses seed 23; embedded Impeccable metadata in the PNG preserves provenance.

## Shapes

The form language is compact and only gently softened. A 4px corner suits status labels and editorial tabs; 8px is the normal control and field radius; 12–16px is reserved for larger contained surfaces and menus. Circular geometry belongs to count badges, calendar dates, toggles, check indicators, and the floating capture action.

Featured assignments intentionally sharpen into ruled slips with strong top and bottom edges. Calendar grids and rundown rows favor square joins so their repeated structure reads like a schedule or ledger.

**The Slip Over Bubble Rule.** Core work appears as ruled rows and assignment slips; large pill-shaped containers do not organize page content.

## Components

### Buttons
- **Shape:** Gently curved controls use the standard 8px radius and a 2.5rem minimum height; coarse pointers raise this to 44px.
- **Primary:** Muted teal with light action ink, a darker teal stroke, and a subtle paper shadow.
- **Hover / Focus:** Hover darkens and lifts by 1px; active presses down and removes shadow. Keyboard focus uses a 2px teal outline with a 3px offset.
- **Secondary / Ghost / Danger:** Secondary uses raised paper with a strong rule; ghost rests transparent; danger rests red-on-pale-red and fills restrained red on hover.

### Chips
- **Style:** Compact status labels use monospace, tabular numerals, uppercase lettering, a 4px radius, a semantic soft fill, and a matching 1px border.
- **State:** Teal reports selection, green completion, amber warning, red danger, blue-gray information, and neutral paper ordinary metadata.

### Cards / Containers
- **Corner Style:** 8–16px for reusable surfaces; signature assignment slips and rundown rows may remain square.
- **Background:** Opaque surface paper over the newsprint canvas, with subtle and inset papers for nested hierarchy.
- **Shadow Strategy:** Paper Lift at rest; Active Lift only when the surface is interactive.
- **Border:** A 1px editorial rule is standard; featured work may use 2px charcoal top and bottom rules.
- **Internal Padding:** 1rem is the reusable surface default; dense rows use 0.75rem.

### Inputs / Fields
- **Style:** Raised paper, charcoal text, a strong 1px rule, an 8px radius, and at least 2.75rem height.
- **Focus:** The stroke changes to focus teal and gains a translucent 3px focus ring.
- **Error / Disabled:** Errors use alert red plus a pale red ring; disabled fields use the disabled paper and ink tokens and preserve their label.

### Navigation
- **Desktop:** A sticky masthead centers five text-and-icon destinations. The active hub uses charcoal text and a 2px teal lower rule; hover uses subtle paper.
- **Mobile:** A fixed five-item bottom bar uses compact labels and 19px line icons. Active state combines a teal top rule with a pale teal field; Tasks may show a red count badge.
- **Page tabs:** Related views scroll horizontally when needed. Selection uses raised paper, charcoal text, and a teal lower rule.

### Assignment Row
The canonical working unit is an opaque raised-paper row separated by editorial rules. Its title is dominant, metadata wraps below in muted ink, and urgency is the exception that earns red. Completion, edit, schedule, and overflow actions preserve the assignment's identity as it moves between Inbox, Calendar, Today, and Progress.

### Calendar Block
Timed work appears as a pale teal block inside a ruled half-hour grid. Conflicts switch to pale red with a red stroke and explicit “Conflict” copy. Blocks support direct editing, drag scheduling on capable pointers, and resize handles; mobile offers tap-first creation.

### Overlays and Feedback
Drawers and dialogs use the darkest overlay and Overlay Lift. On mobile, sheets rise from the bottom and may drag down to dismiss; desktop dialogs center or become right-side utility drawers. Loading uses labeled skeletons or busy states, errors use announced copy, and focus returns to the trigger after temporary capture surfaces close.

### Dialog Forms
Task, project, planning, and onboarding flows share the same opaque raised-panel shell, ruled header and footer, teal icon well, and semantic controls. Field groups use the standard label, strong rule, and 44px control target; selected choices use teal unless the choice carries a real status such as danger, warning, or success. Long forms may expand to a split writing-and-details workspace. Short guided dialogs omit expansion and close controls when their footer already provides an explicit exit.

### Reading Desk
Feed is a utility desk rather than a sixth primary hub. Its header uses the same editorial rule and operational count treatment as Tasks, filters use page-tab semantics, and articles form a ruled rundown instead of floating cards. Subscription management remains a narrow utility rail on desktop and becomes an opaque full-screen sheet on mobile.

Motion is brief and functional: 140ms for control state, 190ms for standard transitions, and the `cubic-bezier(0.16, 1, 0.3, 1)` ease for spatial movement. Entry animations use 200–350ms fades, slides, or scale. Reduced-motion preference collapses animations and transitions to effectively immediate feedback.

## Do's and Don'ts

### Do:
- **Do** rank information with headlines, rules, and one dominant working column.
- **Do** use semantic CSS roles so light and dark themes preserve the same meaning.
- **Do** keep working surfaces opaque and let newsprint texture remain behind them.
- **Do** reserve monospace and tabular numerals for operational facts.
- **Do** preserve 44px targets on coarse pointers, visible focus, semantic tabs, labeled icons, and reduced-motion behavior.
- **Do** use authored Lucide line icons with accessible names; inline SVG equivalents are appropriate in framework-free previews.

### Don't:
- **Don't** spend red or amber as decoration; each must communicate urgency, failure, scheduling, or milestone state.
- **Don't** turn the five primary hubs into an undifferentiated grid of dashboard cards.
- **Don't** place texture, transparency, or glow between the reader and operational text.
- **Don't** introduce large pill containers or excessive rounding into rundown rows, calendar grids, and assignment slips.
- **Don't** mix legacy violet glass, generic stone surfaces, or achievement gradients into new core workflow components.
