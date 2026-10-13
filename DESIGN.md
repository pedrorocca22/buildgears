---
version: alpha
name: BuildGears
description: A compact CAD workbench with orange controls and a central mechanical viewport.
colors:
  primary: '#f97316'
  background: '#f8fafc'
  surface: '#ffffff'
  text: '#0f172a'
  border: '#e2e8f0'
typography:
  sans:
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
  mono:
    fontFamily: 'ui-monospace, monospace'
rounded:
  control: '0.5rem'
  panel: '0.75rem'
spacing:
  catalog-width: '15rem'
components:
  catalog:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.panel}'
  parameters:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
  viewport:
    backgroundColor: '{colors.background}'
---

# BuildGears Design

## Overview
The existing product is a desktop CAD workbench for designing and exporting gears. Preserve its compact engineering controls, light surfaces and orange selection accents. The current interface uses English labels; no additional locale or market is implied by the user language. README.md documents the product scope.
Runtime CSS and Tailwind utilities are the source of truth. This document records their existing values rather than generating an independent theme. Palette and typography map to src/index.css and Tailwind slate/orange utilities; catalog geometry and states map to LeftSidebar.tsx.

## Colors
White panels and slate borders frame the viewport. Orange identifies selected types and parameter actions. Gear 2 uses blue to distinguish the mating component. The active catalog button uses orange-50, orange-300 and orange-600 utilities.

## Typography
Use the existing operating-system font stack and compact 10–12px labels. Numeric controls use the existing monospace utilities. New labels must fit the catalog width and wrap explanatory copy.

## Layout
LeftSidebar owns the 15rem scrolling catalog; RightSidebar owns parameter groups; Viewport3D owns the central canvas and camera controls. This is a desktop workbench, not a marketing page. Adding a type extends these owners and preserves their panel structure.

## Elevation & Depth
Use existing borders and subtle panel shadows. Reserve overlays for the existing export workflow.

## Shapes
Reuse rounded-lg controls and rounded-xl panels. Avoid adding a competing shape vocabulary for one gear family.

## Components
Select/Listbox ownership is native: BacklashPanel uses the browser select for its existing adjustment choices. src/index.css owns the global standards-based scrollbar theme with WebKit fallbacks and system colors in forced-colors mode.

Catalog entries are native buttons with selected, hover and keyboard focus states. Gear parameters use existing native sliders and buttons. Zustand owns per-type sessions, selection and conjugation; switching catalog types restores each saved session.
Internal Ring is a single catalog entry with a native tooth-type select (Spur, Helical, Herringbone) in RightSidebar. Changing teeth preserves the current ring and pinion dimensions, selection and pair visibility. The catalog restores the last internal variant.
Internal helical and herringbone variants expose the existing angle, hand and ring-diameter controls. Its mate is an external herringbone pinion placed inside the ring. Both share angle, hand and face width while keeping independent teeth, bores and hubs.
The viewport and export service must use the same complete configurations. STEP errors and progress continue through the existing ExportModal state.
Icons use the installed Lucide family. Existing camera and motor controls retain their semantics.

## Do's and Don'ts
- Extend the catalog, parameter panel and geometry builders together for every new gear type.
- Keep ring identity independent of the selected editor gear.
- Preserve the current workbench identity; do not redesign unrelated controls for a new type.
