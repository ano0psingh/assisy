# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Assisy is primarily for individuals who want to build consistent productivity and personal-growth habits. They use it to turn intentions into concrete plans, follow through day by day, and see progress accumulate over time.

## Product Purpose

Assisy is an all-in-one personal planner that brings tasks, projects, goals, habits, calendar planning, progress review, and useful AI guidance into one system. Success means users can organize their commitments, act on the right work, and sustain routines without stitching together several disconnected tools.

## Positioning

Assisy's primary position is a unified planner: tasks, projects, goals, habits, and calendar time share one operating system instead of living in separate apps. Gamified progression and AI guidance support that system, but are not the headline promise.

## Operating Context

- Daily planning begins on Today, where users can plan the day, review focus items, check in, and request a morning briefing.
- Tasks can be captured quickly, clarified, scheduled, repeated, reminded, and placed on the calendar.
- Goals, projects, and habits connect longer-term intent to daily action.
- Progress, achievements, and weekly reviews help users reflect and adjust.
- The app is designed as a mobile-friendly PWA while remaining usable on desktop.

## Capabilities and Constraints

- The app works locally and offline without requiring an account. Signing in optionally adds cloud synchronization.
- Local storage remains a first-class data source; authenticated cloud sync must not make offline use fragile.
- Global skill XP and per-goal tree XP are separate progression systems and must remain distinct.
- General tasks and project tasks are separate data models; cross-cutting experiences must account for both.
- AI credentials and privileged AI calls stay server-side.
- The primary navigation model is Today, Tasks, Calendar, Plan, and Progress.
- Assisy is currently a personal, single-user experience. Collaboration is an open product decision, not a promised capability.

## Brand Commitments

- Product name: Assisy.
- Tagline: “Level Up Your Life.”
- Existing app icons live at `app/public/icon-192.svg` and `app/public/icon-512.svg`.

## Evidence on Hand

- A working application is deployed at `https://app-seven-lilac-81.vercel.app`.
- Product behavior and claims can be demonstrated from the shipped application, onboarding, tests, and source code under `app/`.
- There are no confirmed testimonials, customer logos, usage metrics, pricing claims, case studies, press quotes, or formal accessibility certification. Future work must not fabricate them.

## Product Principles

1. Unify planning across time horizons instead of creating another isolated list.
2. Make daily action quick while preserving the context of projects, goals, and habits.
3. Keep core planning dependable offline; cloud and AI features enhance rather than gate it.
4. Turn progress into visible feedback without letting gamification obscure the work.
5. Prefer tactical, actionable guidance over generic productivity encouragement.
