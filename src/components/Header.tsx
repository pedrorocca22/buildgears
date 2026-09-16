import React from 'react'
import { useGearStore } from '../store/useGearStore'

const gearLabelMap: Record<string, string> = {
  spur: 'Spur Gear',
  helical: 'Helical Gear',
  herringbone: 'Herringbone',
  internal: 'Internal Ring Gear',
  rack: 'Rack & Pinion',
  bevel: 'Straight Bevel',
}

export const Header: React.FC = () => {
  const activeTopTab = useGearStore((s) => s.activeTopTab)
  const setActiveTopTab = useGearStore((s) => s.setActiveTopTab)
  const params = useGearStore((s) => s.params)

  return (
    <header className="h-13 bg-white border-b border-slate-200 px-5 flex items-center justify-between select-none z-20 shrink-0">
      {/* Logo & Mode Switcher */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5 select-none">
          <span className="bg-[#ff5500] text-white font-black text-xs sm:text-sm tracking-wide px-2.5 py-1 rounded-lg uppercase shadow-2xs leading-none">
            BUILD
          </span>
          <span className="font-black text-xs sm:text-sm tracking-wide text-[#0b1329] uppercase leading-none">
            GEARS
          </span>
        </div>

        {/* Navigation Tabs (Design / Assembly) */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTopTab('design')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTopTab === 'design'
                ? 'bg-white text-orange-600 font-semibold shadow-xs border border-orange-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Design
          </button>
          <button
            onClick={() => setActiveTopTab('assembly')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTopTab === 'assembly'
                ? 'bg-white text-orange-600 font-semibold shadow-xs border border-orange-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assembly
          </button>
        </div>
      </div>

      {/* Active gear indicator & Support button */}
      <div className="flex items-center gap-2.5 text-xs">
        <span className="text-slate-400 hidden md:inline">Active gear:</span>
        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-semibold">
          {gearLabelMap[params.gearType] || 'Gear'}
        </span>

        {/* Buy Me a Coffee Button */}
        <a
          href="https://buymeacoffee.com/rocca022t"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffdd00] hover:bg-[#ffea33] text-slate-950 font-extrabold text-xs rounded-xl border border-amber-300 shadow-2xs hover:shadow-xs transition-all active:scale-95 shrink-0"
          title="Support BuildGears on Buy Me a Coffee"
        >
          <svg className="w-3.5 h-3.5 shrink-0 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133C18.007 1.94 17.585 1.5 17.094 1.5H3.906c-.491 0-.913.44-.996.924-.067.377-.127.755-.192 1.133-.035.206-.079.429-.231.572-.15.143-.373.172-.57.241-.613.216-.882.781-1.001 1.379l-.132.666C.247 9.112 1.554 11.5 4.3 11.5h.063c.52 3.12 3.14 5.5 6.387 5.5h2.5c3.247 0 5.867-2.38 6.387-5.5h.063c2.746 0 4.053-2.388 3.516-5.085zM18.8 9.5h-.735c.09-.64.135-1.305.135-2 0-.695-.045-1.36-.135-2h.735c1.1 0 1.62.9 1.4 2-.22 1.1-.74 2-1.4 2zM3.2 9.5c-.66 0-1.18-.9-.96-2 .22-1.1.74-2 1.84-2h.735c-.09.64-.135 1.305-.135 2 0 .695.045 1.36.135 2H3.2z" />
          </svg>
          <span className="hidden sm:inline">Buy me a coffee</span>
          <span className="sm:hidden">Coffee</span>
        </a>
      </div>
    </header>
  )
}
