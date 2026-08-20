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
        className={`absolute inset-0 backdrop-blur-md bg-slate-900/30 dark:bg-black/70`}
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
          <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl bg-violet-500/10 dark:bg-violet-500/20`} />
          <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl bg-pink-500/10 dark:bg-pink-500/20`} />
        </div>

        {/* Close button */}
        <button
          aria-label="Dismiss quote"
          onClick={handleClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 ${
            'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'
          }`}
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="relative p-8 pt-8">
          {/* Header */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Sparkles className={`w-5 h-5 text-amber-500 dark:text-amber-400`} />
            <span className={`text-sm font-medium text-amber-600 dark:text-amber-400`}>
              Quote of the Day
            </span>
            <Sparkles className={`w-5 h-5 text-amber-500 dark:text-amber-400`} />
          </div>

          {/* Quote */}
          <div className="relative">
            <Quote className={`absolute -top-2 -left-2 w-8 h-8 text-violet-300 dark:text-violet-500/30`} />
            <p className={`text-xl md:text-2xl font-medium leading-relaxed text-center px-6 text-slate-800 dark:text-white`}>
              {quote.text}
            </p>
          </div>

          {/* Author */}
          <p className={`text-center mt-6 text-violet-600 dark:text-violet-400`}>
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
          <p className={`text-center text-xs mt-6 text-slate-400 dark:text-gray-400`}>
            New quote every day • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
