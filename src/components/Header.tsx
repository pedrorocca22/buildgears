import React from 'react'
import { useGearStore } from '../store/useGearStore'
import { Cog } from 'lucide-react'

const gearLabelMap: Record<string, string> = {
  spur: 'Cilíndrico Recto',
  helical: 'Helicoidal',
  herringbone: 'Doble Hélice',
  internal: 'Corona Interior',
  rack: 'Piñón & Cremallera',
  bevel: 'Cónico Recto',
}

export const Header: React.FC = () => {
  const activeTopTab = useGearStore((s) => s.activeTopTab)
  const setActiveTopTab = useGearStore((s) => s.setActiveTopTab)
  const params = useGearStore((s) => s.params)

  return (
    <header className="h-13 bg-white border-b border-slate-200 px-5 flex items-center justify-between select-none z-20 shrink-0">
      {/* Logo y Switcher de Modo (Crear / Ensamblar) */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Cog className="w-5 h-5 animate-[spin_16s_linear_infinite]" />
          </div>
          <span className="font-black text-sm tracking-tight text-slate-900 uppercase">
            BUILDGEARS
          </span>
        </div>

        {/* Píldoras de Navegación (Crear / Ensamblar) */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTopTab('design')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTopTab === 'design'
                ? 'bg-white text-orange-600 font-semibold shadow-xs border border-orange-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Crear
          </button>
          <button
            onClick={() => setActiveTopTab('assembly')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTopTab === 'assembly'
                ? 'bg-white text-orange-600 font-semibold shadow-xs border border-orange-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ensamblar
          </button>
        </div>
      </div>

      {/* Indicador del engranaje activo seleccionado desde el menú lateral */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 hidden sm:inline">Diseño actual:</span>
        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-semibold">
          {gearLabelMap[params.gearType] || 'Engranaje'}
        </span>
      </div>
    </header>
  )
}
