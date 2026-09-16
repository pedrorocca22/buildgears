import React from 'react'
import { useGearStore } from '../store/useGearStore'
import type { GearType } from '../cad/types'

export const LeftSidebar: React.FC = () => {
  const currentType = useGearStore((s) => s.params.gearType)
  const setGearType = useGearStore((s) => s.setGearType)

  const catalogItems: { id: GearType; label: string }[] = [
    { id: 'spur', label: 'Cilíndrico Recto' },
    { id: 'helical', label: 'Helicoidal' },
    { id: 'herringbone', label: 'Doble Hélice' },
    { id: 'internal', label: 'Corona Interior' },
    { id: 'rack', label: 'Cremallera' },
    { id: 'bevel', label: 'Cónico Recto' },
  ]

  return (
    <aside className="w-56 bg-[#fbfcfd] border-r border-slate-200 flex flex-col h-full select-none shrink-0 overflow-y-auto">
      {/* Cabecera informativa estilo SKÅDIS */}
      <div className="p-3 border-b border-slate-200 bg-white">
        <h2 className="text-xs font-bold text-slate-800 tracking-tight">Pieza en creación</h2>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
          Personaliza un único diseño reutilizable. El ensamblaje se conserva aparte.
        </p>
      </div>

      {/* Sección: NUEVO DESDE CATÁLOGO */}
      <div className="p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Nuevo desde catálogo
        </div>
        <div className="space-y-1.5">
          {catalogItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setGearType(item.id)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                currentType === item.id
                  ? 'bg-orange-50 border-orange-300 text-orange-600 font-semibold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sección: MI BIBLIOTECA */}
      <div className="p-3 pt-1 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Mi biblioteca
        </div>

        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-4 text-center">
          <p className="text-[11px] font-semibold text-slate-600">Sin proyectos precargados</p>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
            Tus diseños guardados se sincronizarán aquí.
          </p>
        </div>
      </div>
    </aside>
  )
}
