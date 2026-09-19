<div align="center">

# ⚙️ BuildGears

### Parametric 3D Gear CAD Studio & Kinematic Simulator

**Direct in-browser engineering tool for designing, simulating, and exporting production-ready mechanical gears.**

[![Live Web App](https://img.shields.io/badge/🌐_Use_Web_App-buildgears.com-00C7B7?style=for-the-badge&logo=googlechrome&logoColor=white)](https://buildgears.com)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-rocca022t-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/rocca022t)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.186-black.svg)](https://threejs.org/)
[![OpenCASCADE](https://img.shields.io/badge/OpenCASCADE-Replicad%20WASM-orange.svg)](https://replicad.dev/)
[![Manifold3D](https://img.shields.io/badge/Manifold--3D-CSG%20Fast%20WASM-purple.svg)](https://github.com/elalish/manifold)

<br />

> 🚀 **No installation required!** Access the fully functional studio directly in your browser:  
> **[https://buildgears.com](https://buildgears.com)** — *100% free, no download limits.*

</div>

---

## 📖 Overview

**BuildGears** is an open-source, browser-based CAD environment designed for engineers, makers, and 3D printing enthusiasts. It solves the challenge of generating mathematically exact involute gear profiles without requiring heavy, expensive desktop CAD suites.

### Key Capabilities:
- **Dual-Engine Architecture**:
  - **Manifold-3D WASM (Viewport)**: High-speed CSG boolean operations running at 60 FPS in Three.js for instantaneous parameter updates.
  - **OpenCASCADE / Replicad WASM (Worker)**: Analytical B-Rep solid modeler producing ISO 10303 AP214 **STEP** files with true curved geometry and high-resolution **STL** meshes.
- **Export Formats**: **STEP** (CAD solid), **STL** (3D printing), and **DXF** (2D CNC laser/waterjet cutting).
- **Standards-Compliant**: Standard DIN 6885-1 keyways, DIN 912 metric mounting holes, and customizable backlash & tooth profiles.

---

## ⚙️ Supported Gear Types

| Gear Type | Description | Key Parameters |
| :--- | :--- | :--- |
| **Spur Gears** (*Cilíndrico Recto*) | Pure involute teeth with root transition fillets and profile shift ($x$). | Module ($m$), Teeth ($z$), Pressure Angle ($\alpha$), Face Width ($b$) |
| **Helical Gears** (*Helicoidal*) | Smooth helical tooth extrusion with customizable helix angle ($\beta$) and hand. | Helix Angle ($\beta$), Hand (Left/Right), Normal Module ($m_n$) |
| **Herringbone** (*Doble Hélice*) | Bi-directional chevron profile eliminating axial thrust forces. | Helix Angle ($\beta$), Central Groove Width |
| **Rack & Pinion** (*Piñón y Cremallera*) | Prismatic rack with DIN 912 mounting holes & kinematically coupled pinion. | Rack Length, Mounting Hole Count & Diameter, Module |
| **Internal Gears** (*Corona Interior*) | Annular ring gears with internal involute teeth for planetary sets. | Ring Outer Diameter, Rim Thickness, Teeth ($z$) |
| **Bevel Gears** (*Cónico Recto*) | Conical pitch surface transmission for intersecting shafts (e.g. 90°). | Pitch Cone Angle, Cone Distance, Module ($m$) |

---

## 📐 Engineering Standards & Precision

- **Shaft Bores & Hubs**: Bores from 1 mm up to 60+ mm, solid hubs, or custom bore clearances.
- **DIN 6885-1 Keyways**: Automatic standard dimensions ($b$, $h$, $t_1$, $t_2$) based on shaft diameter or full manual override.
- **DIN 912 / ISO 4762 Mounting Holes**: Counterbored metric screw patterns for racks (M3, M4, M5, M6, M8, M10).
- **Tooth Profile Norms**: ISO 53 Standard, Stub (short teeth for high load), High Contact Ratio (HCR), and Cycloidal.
- **Kinematic Simulation**: Real-time meshing animation with contact point pitch line tracking, backlash clearance, and RPM regulation.

---

## 📂 Project Architecture

For developers looking to inspect, modify, or extend the codebase:

```text
gear-studio/
├── public/                  # Static assets (robots.txt, sitemap.xml, verification)
├── src/
│   ├── cad/                 # CAD Geometry & Mathematical Algorithms
│   │   ├── gearMath.ts          # Involute curve math, pitch circles, tooth profiles
│   │   ├── manifoldEngine.ts    # Real-time CSG 3D mesh generator (Manifold WASM)
│   │   ├── replicadWorker.ts    # OpenCASCADE worker for B-Rep STEP/STL export
│   │   ├── replicadClient.ts    # Web Worker RPC interface
│   │   ├── exportService.ts     # Packaging & download handlers (STL, STEP, DXF)
│   │   ├── dimensionRenderer.ts # 3D dimension lines & annotations in Three.js
│   │   ├── din6885.ts           # DIN 6885-1 standard keyway lookup tables
│   │   ├── din912.ts            # DIN 912 standard screw counterbore tables
│   │   └── types.ts             # Gear parameters & geometry interfaces
│   │
│   ├── components/          # React UI Components
│   │   ├── Viewport3D.tsx       # Three.js canvas, lighting, camera & animation loop
│   │   ├── LeftSidebar.tsx      # Gear type selector and primary navigation
│   │   ├── RightSidebar.tsx     # Parameter controls (module, teeth, bore, keyway)
│   │   ├── DimensionInspector.tsx# Technical drawing & dimensional inspection overlay
│   │   ├── BacklashPanel.tsx    # Kinematic meshing & backlash adjustment
│   │   ├── ExportModal.tsx      # Export dialog with resolution settings & progress
│   │   └── Header.tsx           # Top navigation bar
│   │
│   ├── store/
│   │   └── useGearStore.ts      # Global state management (Zustand)
│   │
│   ├── App.tsx              # Main layout structure
│   └── main.tsx             # Application entrypoint
├── index.html               # App HTML template with SEO & social tags
├── vercel.json              # Vercel deployment configuration & routing
└── vite.config.ts           # Vite build configuration (Rolldown / WebAssembly)
```

---

## 🛠️ Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `pnpm`

### 1. Clone the repository
```bash
git clone https://github.com/pedrorocca22/gear-studio.git
cd gear-studio
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or the port indicated in your terminal) in your browser.

### 4. Build for production
```bash
npm run build
npm run preview
```

---

## 🤝 Contributing & Extending

Contributions are welcome! If you want to contribute:

1. **Adding a New Gear Type**:
   - Define the parameter interface in `src/cad/types.ts`.
   - Implement the 2D profile and 3D extrusion in `src/cad/gearMath.ts` and `src/cad/manifoldEngine.ts`.
   - Implement the corresponding OpenCASCADE B-Rep solid in `src/cad/replicadWorker.ts`.
   - Add parameter controls to `src/components/RightSidebar.tsx`.
2. **Report Issues**: Open an issue on GitHub describing any bugs or feature requests.

---

## ☕ Support the Project

If BuildGears saved you time on a mechanical project or 3D print, consider supporting its development:

<div align="center">

<a href="https://buymeacoffee.com/rocca022t" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200" />
</a>

*Your support helps cover hosting costs and continued development of new gear standards!*

</div>

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

Developed with ❤️ by [Pedro Rocca](https://github.com/pedrorocca22).
