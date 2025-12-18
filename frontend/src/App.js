import React, { useState, useEffect } from 'react';
import SymptomForm from './components/SymptomForm';
import ResultCard from './components/ResultCard';

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [symptomsList, setSymptomsList] = useState([]); // Semptom listesi (Label/Value)

  // Temayı, geçmişi ve semptomları yükle
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const savedHistory = localStorage.getItem('predictionHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // Semptomları getir
    const fetchSymptoms = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/symptoms');
        if (!response.ok) throw new Error('Sunucuya bağlanılamadı');
        const data = await response.json();
        setSymptomsList(data.symptoms);
      } catch (error) {
        console.error("Semptomlar yüklenirken hata:", error);
      }
    };

    fetchSymptoms();
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const addToHistory = (newResult) => {
    const newHistoryItem = {
      id: Date.now(),
      date: new Date().toLocaleDateString('tr-TR'),
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      ...newResult
    };
    
    const updatedHistory = [newHistoryItem, ...history].slice(0, 10); // Son 10 tanesini tut
    setHistory(updatedHistory);
    localStorage.setItem('predictionHistory', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('predictionHistory');
  };

  const loadHistoryItem = (item) => {
    setResult(item);
    setIsHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrediction = async (selectedSymptoms) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symptoms: selectedSymptoms }),
      });

      if (!response.ok) {
        throw new Error('Tahmin alınırken bir hata oluştu.');
      }

      const data = await response.json();
      const finalResult = { ...data, symptoms: selectedSymptoms };
      setResult(finalResult);
      addToHistory(finalResult);
      
      // Mobil için sonuca kaydır
      setTimeout(() => {
        const resultElement = document.getElementById('result-section');
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearResult = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Gezinti Çubuğu - Sticky & Blur */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-2 rounded-xl shadow-lg shadow-red-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300">
              MediMind AI
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 relative group"
                title="Geçmiş Aramalar"
            >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {history.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
            </button>

            <button 
                onClick={toggleTheme}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 group"
                title={darkMode ? "Aydınlık Mod" : "Karanlık Mod"}
            >
                {darkMode ? (
                    <svg className="w-5 h-5 text-yellow-400 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5 group-hover:-rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                )}
            </button>
          </div>
        </div>
      </nav>

      {/* Geçmiş Kenar Çubuğu */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-80 bg-white dark:bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Geçmiş Aramalar</h3>
                <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            {history.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                    <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p>Henüz geçmiş kayıt yok.</p>
                </div>
            ) : (
                <>
                    <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                        {history.map((item) => (
                            <div 
                                key={item.id} 
                                onClick={() => loadHistoryItem(item)}
                                className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-medium text-slate-400 dark:text-slate-400">{item.date} • {item.time}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.confidence > 0.5 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                        %{Math.round(item.confidence * 100)}
                                    </span>
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.disease}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                    {item.symptoms.map(s => s.split('_').join(' ')).join(', ')}
                                </p>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={clearHistory}
                        className="mt-4 w-full py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        Geçmişi Temizle
                    </button>
                </>
            )}
        </div>
      </div>

      {/* Kenar çubuğu için kaplama */}
      {isHistoryOpen && (
        <div onClick={() => setIsHistoryOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"></div>
      )}

      <main className="flex-grow container mx-auto px-4 py-8 relative min-h-[calc(100vh-150px)] flex flex-col items-center justify-start">
        
        <div className={`
            transition-all duration-700 ease-in-out flex flex-col lg:flex-row gap-8 items-start justify-center w-full
            ${result ? 'max-w-[1600px]' : 'max-w-3xl'}
        `}>
            
            {/* Symptom Form Container */}
            <div className={`
                transition-all duration-700 w-full flex-shrink-0
                ${result ? 'lg:w-[400px]' : 'w-full'}
            `}>
                <div className="text-center mb-6">
                  <h1 className={`font-bold text-slate-900 dark:text-white mb-2 transition-all duration-500 ${result ? 'text-xl' : 'text-2xl md:text-3xl'}`}>
                    Semptom Analizi
                  </h1>
                  <p className={`text-slate-500 dark:text-slate-400 mx-auto transition-all duration-500 ${result ? 'text-xs max-w-xs' : 'text-sm max-w-md'}`}>
                    Yapay zeka destekli sağlık asistanınız ile belirtilerinizi analiz edin.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-slate-800 dark:text-white transition-colors">Belirtilerinizi Seçin</h2>
                    </div>
                    
                    <SymptomForm 
                        onSubmit={handlePrediction} 
                        onClear={handleClearResult} 
                        isLoading={loading} 
                        darkMode={darkMode} 
                        isCompact={!!result}
                        symptomsList={symptomsList}
                        currentSymptoms={result ? result.symptoms : null}
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in text-sm shadow-sm">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>{error}</p>
                  </div>
                )}
            </div>

            {/* Result Card Container */}
            <div id="result-section" className={`
                transition-all duration-700 w-full
                ${result 
                    ? 'lg:flex-1 opacity-100 translate-y-0' 
                    : 'lg:w-0 opacity-0 translate-y-10 overflow-hidden absolute lg:relative h-0 lg:h-auto pointer-events-none'}
            `}>
                {result && (
                  <div className="mt-0">
                    <ResultCard result={result} darkMode={darkMode} symptomsList={symptomsList} />
                  </div>
                )}
            </div>
        </div>

      </main>
      
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-10 mt-auto transition-colors">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 opacity-80">
                <div className="bg-red-100 dark:bg-red-900/30 p-1.5 rounded-lg">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">MediMind AI</span>
            </div>
            
            <div className="text-center md:text-right">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">
                    © 2025 MediMind AI. Tüm hakları saklıdır.
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-xs max-w-md">
                    Bu uygulama sadece bilgilendirme amaçlıdır. Tıbbi tavsiye yerine geçmez.
                </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
