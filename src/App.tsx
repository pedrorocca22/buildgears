import React from 'react'
import { Header } from './components/Header'
import { LeftSidebar } from './components/LeftSidebar'
import { RightSidebar } from './components/RightSidebar'
import { Viewport3D } from './components/Viewport3D'
import { DimensionInspector } from './components/DimensionInspector'
import { ExportModal } from './components/ExportModal'

export const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8fafc]">
      {/* Barra superior estilo SKÅDIS STUDIO */}
      <Header />

      {/* Estructura central en 3 columnas */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Columna Izquierda: Catálogo de Engranajes */}
        <LeftSidebar />

        {/* Columna Central: Visor 3D con colores planos y cotas */}
        <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#f6f8fb]">
          <div className="flex-1 relative overflow-hidden">
            <Viewport3D />
          </div>

          {/* Tabla inferior de dimensiones calculadas (ISO 53 / DIN 867) */}
          <DimensionInspector />
        </main>

        {/* Columna Derecha: Inspector paramétrico con controles naranja y botones STL/3MF/STEP */}
        <RightSidebar />
      </div>

      {/* Modal de progreso de exportación STEP */}
      <ExportModal />
    </div>
  )
}

export default App
