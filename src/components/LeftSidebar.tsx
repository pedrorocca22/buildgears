import React from 'react'
import { useGearStore } from '../store/useGearStore'
import type { GearType } from '../cad/types'

export const LeftSidebar: React.FC = () => {
  const currentType = useGearStore((s) => s.params.gearType)
  const setGearType = useGearStore((s) => s.setGearType)

  const catalogItems: { id: GearType; label: string; desc: string }[] = [
    { id: 'spur', label: 'Spur Gear', desc: 'Straight teeth parallel to shaft axis' },
    { id: 'helical', label: 'Helical Gear', desc: 'Gradual contact, smooth & quiet' },
    { id: 'herringbone', label: 'Herringbone', desc: 'Double helical, zero axial thrust' },
    { id: 'internal', label: 'Internal Ring', desc: 'Annular internal teeth for epicyclic gears' },
    { id: 'rack', label: 'Rack & Pinion', desc: 'Linear to rotary kinematic conversion' },
    { id: 'bevel', label: 'Straight Bevel', desc: 'Intersecting shaft angular transmission' },
  ]

  return (
    <aside className="w-60 bg-[#fbfcfd] border-r border-slate-200 flex flex-col h-full select-none shrink-0 overflow-y-auto">
      {/* Catalog Header */}
      <div className="p-3.5 border-b border-slate-200 bg-white">
        <h2 className="text-xs font-bold text-slate-800 tracking-tight">Gear Catalog</h2>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
          Select a mechanical gear type to configure.
        </p>
      </div>

      {/* Catalog Gear List */}
      <div className="p-3 flex-1 space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Gear Types
        </div>
        {catalogItems.map((item) => {
          const isActive = currentType === item.id
          return (
            <button
              key={item.id}
              onClick={() => setGearType(item.id)}
              className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-0.5 ${
                isActive
                  ? 'bg-orange-50 border-orange-300 text-orange-950 font-bold shadow-2xs'
                  : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs ${isActive ? 'font-extrabold text-orange-600' : 'font-semibold'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                {item.desc}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

