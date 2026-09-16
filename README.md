# BuildGears (buildgears.com)

> **Parametric 3D Gear CAD Studio & Kinematic Simulator**  
> Direct in-browser engineering tool for designing, simulating, and exporting production-ready mechanical gears.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![Three.js](https://img.shields.io/badge/Three.js-0.186-black.svg)
![OpenCASCADE](https://img.shields.io/badge/OpenCASCADE-Replicad%20WASM-orange.svg)
![Manifold3D](https://img.shields.io/badge/Manifold--3D-CSG%20Fast%20WASM-purple.svg)

---

## ⚙️ Features

- **Kinematic Types Supported**:
  - **Spur Gears** (*Cilíndrico Recto*): Full involute curve generation with root transition fillets.
  - **Helical Gears** (*Helicoidal*): True helical tooth extrusion with customizable helix angle and hand (Right / Left).
  - **Herringbone / Double Helical** (*Espiga / Doble Hélice*): Bi-directional chevron profile eliminating axial thrust forces.
  - **Rack & Pinion** (*Piñón & Cremallera*): Prismatic rack with mounting hole patterns (DIN 912) and kinematically coupled conjugate pinion.
  - **Internal Gears** (*Corona Interior*): Annular ring gears with involute internal teeth.
  - **Bevel Gears** (*Cónico Recto*): Conical pitch surface transmission.

- **Dual-Engine Architecture**:
  - **Manifold-3D WASM (Interactive Viewport)**: Hyper-fast CSG boolean operations running at 60 FPS in Three.js for real-time slider updates.
  - **OpenCASCADE / Replicad WASM (Web Worker)**: Analytical B-Rep CAD geometry calculation exporting exact curved surfaces to **STEP** (ISO 10303 AP214) and high-resolution **STL**.

- **Mechanical Standards & Engineering Precision**:
  - **Shaft Bores**: Starting from 1 mm up to 60+ mm (micro and precision instruments supported). Default solid macizo core.
  - **DIN 6885-1 Keyways**: Automatic standardized dimensions ($b$, $h$, $t_1$, $t_2$) or full manual parameterization.
  - **DIN 912 / ISO 4762 Mounting Holes**: Counterbored metric screw patterns for racks (M3, M4, M5, M6, M8, M10).
  - **Tooth Profile Norms**: ISO 53 Standard, Stub (short teeth for high loads), High Contact Ratio (HCR), and Cycloidal.
  - **Real-Time Kinematic Simulation**: Meshing pair animation with pitch line contact point, backlash, and RPM speed regulation.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/pedrorocca22/gear-studio.git
cd gear-studio

# Install dependencies
npm install

# Start local development server
npm run dev
```

The application will be available at `http://localhost:3000/`.

### Production Build

```bash
# Build optimized production bundle
npm run build

# Preview build locally
npm run preview
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Zustand, Tailwind CSS
- **3D Graphics**: Three.js, Lucide Icons, Canvas Confetti
- **CAD Engines**:
  - `manifold-3d`: WebAssembly CSG engine for real-time visualization.
  - `replicad` / `replicad-opencascadejs`: WebAssembly OpenCASCADE B-Rep solid modeler.
- **Build Tool**: Vite, Rolldown / esbuild, Oxlint

---

## 📄 License

MIT © [Pedro Rocca](https://github.com/pedrorocca22)
