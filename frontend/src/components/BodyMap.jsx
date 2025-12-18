import React, { useState } from 'react';

const BodyMap = ({ onPartSelect, selectedPart, darkMode }) => {
  const [hoveredPart, setHoveredPart] = useState(null);

  const handlePartClick = (part) => {
    onPartSelect(part === selectedPart ? null : part);
  };

  const getPathStyle = (part) => {
    const isSelected = selectedPart === part;
    const isHovered = hoveredPart === part;
    
    let fill = darkMode ? '#334155' : '#e2e8f0'; // Varsayılan renk
    
    if (isSelected) {
      fill = '#3b82f6'; // Mavi-500
    } else if (isHovered) {
      fill = darkMode ? '#475569' : '#cbd5e1'; // Üzerine gelindiğindeki renk
    }

    return {
      fill,
      stroke: darkMode ? '#94a3b8' : '#64748b',
      strokeWidth: '1.5',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      filter: isSelected || isHovered ? 'drop-shadow(0px 0px 4px rgba(59, 130, 246, 0.5))' : 'none'
    };
  };

  return (
    <div className="relative w-full max-w-[300px] mx-auto h-[500px] flex items-center justify-center select-none">
      <svg viewBox="0 0 300 600" className="w-full h-full drop-shadow-xl">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Baş & Boyun */}
        <path
          d="M150,30 C130,30 115,45 115,75 C115,100 130,115 150,115 C170,115 185,100 185,75 C185,45 170,30 150,30 Z M135,115 L165,115 L165,135 L135,135 Z"
          style={getPathStyle('head')}
          onMouseEnter={() => setHoveredPart('head')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handlePartClick('head')}
        />

        {/* Göğüs */}
        <path
          d="M115,135 L185,135 L195,220 L105,220 Z"
          style={getPathStyle('chest')}
          onMouseEnter={() => setHoveredPart('chest')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handlePartClick('chest')}
        />

        {/* Karın */}
        <path
          d="M105,220 L195,220 L190,290 L110,290 Z"
          style={getPathStyle('abdomen')}
          onMouseEnter={() => setHoveredPart('abdomen')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handlePartClick('abdomen')}
        />

        {/* Pelvis */}
        <path
          d="M110,290 L190,290 L180,330 L120,330 Z"
          style={getPathStyle('pelvis')}
          onMouseEnter={() => setHoveredPart('pelvis')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handlePartClick('pelvis')}
        />

        {/* Sol Kol (Üst & Alt) */}
        <path
          d="M115,135 L80,150 L70,250 L90,250 L100,160 L115,150 Z"
          style={getPathStyle('limbs')}
          onMouseEnter={() => setHoveredPart('limbs')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handlePartClick('limbs')}
        />

        {/* Sağ Kol (Üst & Alt) */}
        <path
          d="M185,135 L220,150 L230,250 L210,250 L200,160 L185,150 Z"
          style={getPathStyle('limbs')}
          onMouseEnter={() => setHoveredPart('limbs')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handlePartClick('limbs')}
        />

        {/* Sol Bacak (Uyluk & Baldır) */}
        <path
          d="M120,330 L148,330 L145,550 L125,550 Z"
          style={getPathStyle('limbs')}
          onMouseEnter={() => setHoveredPart('limbs')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handlePartClick('limbs')}
        />

        {/* Sağ Bacak (Uyluk & Baldır) */}
        <path
          d="M152,330 L180,330 L175,550 L155,550 Z"
          style={getPathStyle('limbs')}
          onMouseEnter={() => setHoveredPart('limbs')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handlePartClick('limbs')}
        />
      </svg>

      {/* Etiketler/İpuçları */}
      {hoveredPart && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-10 border border-slate-700">
          {hoveredPart === 'head' && 'Baş, Yüz ve Boyun'}
          {hoveredPart === 'chest' && 'Göğüs ve Solunum'}
          {hoveredPart === 'abdomen' && 'Karın ve Mide'}
          {hoveredPart === 'pelvis' && 'Pelvis ve Boşaltım'}
          {hoveredPart === 'limbs' && 'Kollar, Bacaklar ve Sırt'}
        </div>
      )}
      
      {/* Yüzen Düğmeler Grubu - Dikey Ortalanmış */}
      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 flex flex-col gap-4">
        {/* Cilt Düğmesi */}
        <button
          onClick={() => handlePartClick('skin')}
          className={`p-2.5 rounded-xl shadow-lg transition-all duration-300 border ${
            selectedPart === 'skin' 
              ? 'bg-blue-500 text-white border-blue-600 scale-110' 
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
          title="Cilt ve Deri Belirtileri"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </button>

        {/* Genel Düğmesi */}
        <button
          onClick={() => handlePartClick('general')}
          className={`p-2.5 rounded-xl shadow-lg transition-all duration-300 border ${
            selectedPart === 'general' 
              ? 'bg-blue-500 text-white border-blue-600 scale-110' 
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
          title="Genel Belirtiler"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BodyMap;
