---
version: 1
slug: "app-src-app-tsx"
primary_target: "app/src/App.tsx"
related_targets: ["app/src/index.css","app/src/components/layout/Layout.tsx","app/src/components/layout/Header.tsx","app/src/components/layout/BottomNav.tsx","app/src/pages/Dashboard.tsx","app/src/pages/Tasks.tsx","app/src/pages/Calendar.tsx","app/src/pages/Plan.tsx","app/src/pages/Progress.tsx"]
---

# Assisy whole-app redesign

Mode: Operate. Audience: individuals moving captured intentions through planning into completed daily work. Scope: the five primary hubs and shared shell. Preserve offline-first behavior, domain models, and accessibility.

## Direction contract

THESIS: A live personal rundown turns capture, planning, execution, and review into one legible desk; refuse the generic card-dashboard grid.

OWN-WORLD: Warm newsprint canvas, charcoal ink, editorial rules, muted teal actions, restrained red alerts, amber milestones, assignment slips, and tabular status labels.

STORY: Leads enter Inbox, assignments earn a time or day slot, Today runs the active edition, and Progress keeps the record.

FIRST VIEWPORT: A compact masthead and action desk lead into Today’s single-column rundown; the active assignment commands the center, Inbox and Calendar sit in a narrow utility rail, and capture stays within thumb reach.

FORM: Newsroom Assignment Desk, ranked 1; seed e8bc5e4c. Signature interaction: items retain identity as they move through rundown states.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
