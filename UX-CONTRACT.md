# BuildGears UI contract

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | src/components/BacklashPanel.tsx | DESIGN.md; premium-ui.json native ownership | browser-native adjustment select | keyboard and browser popup |
| Form | src/components/RightSidebar.tsx | src/store/useGearStore.ts; src/cad/types.ts | gear, internal ring, rack and pinion | conjugatePair.test.ts; internalHerringbone.test.ts; browser |
| Scrollbar | src/index.css | DESIGN.md | standards-based theme, WebKit fallback, system forced colors | premium-audit.json; computed browser style |

## Gear type and editing flow
README.md defines the gear CAD workbench scope. LeftSidebar is the catalog owner. Selecting a type restores its stored configuration, selected gear and pair visibility. Enabling Gear 2 adds the appropriate conjugate mate without changing Gear 1 identity. Local edits are reversible and require no confirmation.
Internal Herringbone uses an inward-facing double-helical ring and an external double-helical pinion inside it. Their module, pressure angle, helix angle, hand and face width stay synchronized; teeth, bore, chamfer and hub remain separately configurable. Teeth limits keep the pinion smaller than the ring. Both rotate in the same direction. In this family the supported tooth forms are involute ISO, Stub and Deep HCR; the unrelated cycloidal form is not offered.

## Export flow
ExportModal owns format selection, pending progress, successful download and recoverable error messages. Assembly exports always use Gear 1 and Gear 2 configurations regardless of which part is selected. Single-part exports use the selected part. Geometry and worker errors pass through exportStatus so the user can retry.

## Scope and controls
This is a single-screen desktop CAD application with native buttons and sliders. No CRUD table, date picker, remote search or account lifecycle is involved in adding a gear family. Preserve existing sibling controls and light-theme English labels. Native controls must remain keyboard-operable; catalog buttons expose selected state and visible keyboard focus.
