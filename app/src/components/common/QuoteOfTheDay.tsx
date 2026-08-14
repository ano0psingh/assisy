import { useState, useEffect } from 'react';
import { X, Sparkles, Quote } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getQuoteOfTheDay } from '../../data/quotes';

export function QuoteOfTheDay() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isVisible, setIsVisible] = useState(true);
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);

  useEffect(() => {
    // Always show quote on page load
    setQuote(getQuoteOfTheDay());
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible || !quote) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-md ${isDark ? 'bg-black/70' : 'bg-slate-900/30'}`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-lg animate-slide-up ${
          isDark 
            ? 'bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border border-white/10' 
            : 'bg-white'
        } rounded-3xl shadow-2xl overflow-hidden`}
      >
        {/* Decorative gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-violet-500/20' : 'bg-violet-500/10'}`} />
          <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-pink-500/20' : 'bg-pink-500/10'}`} />
        </div>

        {/* Close button */}
        <button
          aria-label="Dismiss quote"
          onClick={handleClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 ${
            isDark 
              ? 'text-gray-400 hover:text-white hover:bg-white/10' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="relative p-8 pt-10">
          {/* Header */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Sparkles className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              Quote of the Day
            </span>
            <Sparkles className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          </div>

          {/* Quote */}
          <div className="relative">
            <Quote className={`absolute -top-2 -left-2 w-8 h-8 ${isDark ? 'text-violet-500/30' : 'text-violet-300'}`} />
            <p className={`text-xl md:text-2xl font-medium leading-relaxed text-center px-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {quote.text}
            </p>
          </div>

          {/* Author */}
          <p className={`text-center mt-6 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
            — {quote.author}
          </p>

          {/* Action button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleClose}
              className="btn-primary px-8 py-3 rounded-xl text-white font-medium flex items-center space-x-2"
            >
              <span>Let's Get Started!</span>
              <Sparkles size={16} />
            </button>
          </div>

          {/* Footer text */}
          <p className={`text-center text-xs mt-6 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
            New quote every day • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
