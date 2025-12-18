import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import BodyMap from './BodyMap';
import { bodyPartMapping, bodyPartLabels } from '../utils/symptomMapping';

const SymptomForm = ({ onSubmit, onClear, isLoading, darkMode, isCompact, symptomsList, currentSymptoms }) => {
  const [allOptions, setAllOptions] = useState([]); // Tüm semptomlar
  const [filteredOptions, setFilteredOptions] = useState([]); // Filtrelenmiş semptomlar
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState(null);
  const [showBodyMap, setShowBodyMap] = useState(false); // Vücut haritası görünürlüğü
  const [error, setError] = useState(null);

  useEffect(() => {
    if (symptomsList && symptomsList.length > 0) {
      setAllOptions(symptomsList);
      setFilteredOptions(symptomsList);
    }
  }, [symptomsList]);

  // Dışarıdan gelen semptomları (Geçmişten yüklenen) forma yansıt
  useEffect(() => {
    if (currentSymptoms && allOptions.length > 0) {
        const selected = allOptions.filter(option => currentSymptoms.includes(option.value));
        setSelectedOptions(selected);
    }
  }, [currentSymptoms, allOptions]);

  // Vücut bölümü seçildiğinde filtreleme yap
  useEffect(() => {
    if (!selectedBodyPart) {
      setFilteredOptions(allOptions);
      return;
    }

    const relevantSymptoms = bodyPartMapping[selectedBodyPart] || [];
    
    // Seçilen bölgeye ait semptomları filtrele
    // Not: Backend'den gelen value'lar ile mapping'deki key'ler eşleşmeli
    const filtered = allOptions.filter(option => 
      relevantSymptoms.includes(option.value)
    );

    setFilteredOptions(filtered);
  }, [selectedBodyPart, allOptions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedOptions.length === 0) return;
    
    const symptoms = selectedOptions.map(option => option.value);
    onSubmit(symptoms);
  };

  const handleClear = () => {
    setSelectedOptions([]);
    setSelectedBodyPart(null);
    if (onClear) {
      onClear();
    }
  };

  // Tailwind ve Koyu Mod ile eşleşmesi için react-select özel stilleri
  const customStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: darkMode ? '#1e293b' : 'white',
      borderColor: state.isFocused ? '#3b82f6' : (darkMode ? '#334155' : '#e2e8f0'),
      boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
      padding: '4px',
      borderRadius: '0.5rem',
      '&:hover': {
        borderColor: '#3b82f6'
      }
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: darkMode ? '#1e293b' : 'white',
      border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: darkMode ? '#1e3a8a' : '#eff6ff',
      borderRadius: '0.375rem',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: darkMode ? '#bfdbfe' : '#1e40af',
      fontWeight: '500',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: darkMode ? '#bfdbfe' : '#1e40af',
      ':hover': {
        backgroundColor: darkMode ? '#1e40af' : '#dbeafe',
        color: darkMode ? '#ffffff' : '#1e3a8a',
      },
    }),
    input: (base) => ({
      ...base,
      color: darkMode ? '#f1f5f9' : '#0f172a',
    }),
    singleValue: (base) => ({
      ...base,
      color: darkMode ? '#f1f5f9' : '#0f172a',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused 
        ? (darkMode ? '#334155' : '#eff6ff') 
        : 'transparent',
      color: darkMode ? '#f1f5f9' : '#0f172a',
      padding: '10px 12px',
      cursor: 'pointer',
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: '400px',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };

  return (
    <div className="flex flex-col gap-6 transition-all duration-500">
      
      <div className="flex flex-col gap-6 items-start transition-all duration-500 w-full">
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-fit transition-all duration-700 ease-in-out">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2.5 rounded-lg text-xs mb-2">
              {error}
            </div>
          )}
          
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                Şikayetleriniz:
                {selectedBodyPart && (
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-full">
                    {bodyPartLabels[selectedBodyPart]}
                  </span>
                )}
              </label>
              {(selectedOptions.length > 0 || selectedBodyPart) && (
                <button 
                  type="button" 
                  onClick={handleClear}
                  className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Temizle
                </button>
              )}
            </div>
            
            <Select
              isMulti
              name="symptoms"
              options={filteredOptions}
              styles={customStyles}
              className="basic-multi-select text-sm"
              classNamePrefix="select"
              placeholder={selectedBodyPart ? `${bodyPartLabels[selectedBodyPart]} semptomları...` : "Semptom arayın..."}
              noOptionsMessage={() => "Bulunamadı"}
              onChange={setSelectedOptions}
              value={selectedOptions}
              isDisabled={isLoading}
              menuPortalTarget={document.body}
              menuPosition={'fixed'}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || selectedOptions.length === 0}
            className={`w-full py-2.5 px-4 rounded-lg text-white text-sm font-semibold shadow-md transition-all duration-200 flex items-center justify-center gap-2
              ${isLoading || selectedOptions.length === 0 
                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-200 hover:-translate-y-0.5'}`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analiz...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Tahmin Et
              </>
            )}
          </button>

          {/* Toggle Butonu (Formun Altında) */}
          <div className="flex justify-center pt-2 border-t border-slate-100 dark:border-slate-700">
            <button 
              type="button"
              onClick={() => setShowBodyMap(!showBodyMap)}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform duration-300 ${showBodyMap ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
              {showBodyMap ? 'Vücut Haritasını Gizle' : 'Bölgesel Arama (Vücut Haritası)'}
            </button>
          </div>
        </form>

        {/* Vücut Haritası (Animasyonlu) */}
        <div className={`
          transition-all duration-700 ease-in-out overflow-hidden w-full
          ${showBodyMap 
            ? 'max-h-[1000px] opacity-100'
            : 'max-h-0 opacity-0'
          }
        `}>
          <div className={`bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 w-full border border-slate-100 dark:border-slate-700 relative ${isCompact ? 'flex flex-col items-center justify-center gap-4' : ''}`}>
            
            {/* Başlık Yazısı */}
            <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wide">
              Bölge Seçerek Filtreleyin
            </p>

            <div className={`${isCompact ? 'scale-75 origin-center' : 'scale-90 origin-top'}`}>
              <BodyMap 
                onPartSelect={setSelectedBodyPart} 
                selectedPart={selectedBodyPart}
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SymptomForm;
