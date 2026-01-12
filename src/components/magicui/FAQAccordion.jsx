import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

/**
 * FAQAccordion - Animated accordion for FAQs
 * Smooth expand/collapse with elegant transitions
 */
export function FAQAccordion({ 
  items, 
  className = "",
  allowMultiple = false,
}) {
  const [openItems, setOpenItems] = useState([]);

  const toggleItem = (index) => {
    if (allowMultiple) {
      setOpenItems((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      );
    } else {
      setOpenItems((prev) =>
        prev.includes(index) ? [] : [index]
      );
    }
  };

  return (
    <div className={`space-y-2 md:space-y-3 ${className}`}>
      {items.map((item, index) => (
        <FAQItem
          key={index}
          question={item.question}
          answer={item.answer}
          isOpen={openItems.includes(index)}
          onToggle={() => toggleItem(index)}
          index={index}
        />
      ))}
    </div>
  );
}

function FAQItem({ question, answer, isOpen, onToggle, index }) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl md:rounded-2xl border transition-all duration-300
        ${isOpen 
          ? 'border-[#01bad2]/30 bg-gradient-to-br from-[#01bad2]/5 to-[#2B8FC7]/5 shadow-md' 
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
        }
      `}
    >
      {/* Animated gradient border on open */}
      {isOpen && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: 'linear-gradient(135deg, rgba(1,186,210,0.1) 0%, rgba(43,143,199,0.1) 100%)',
          }}
        />
      )}
      
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 md:p-5 text-left relative z-10"
      >
        <span className={`font-semibold text-sm md:text-base transition-colors pr-4 ${isOpen ? 'text-[#01bad2]' : 'text-slate-900'}`}>
          {question}
        </span>
        <motion.div
          className={`
            flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg transition-colors flex-shrink-0
            ${isOpen 
              ? 'bg-[#01bad2] text-white' 
              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
            }
          `}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {isOpen ? <Minus size={14} className="md:w-4 md:h-4" /> : <Plus size={14} className="md:w-4 md:h-4" />}
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto", 
              opacity: 1,
              transition: {
                height: { duration: 0.3, ease: "easeOut" },
                opacity: { duration: 0.2, delay: 0.1 }
              }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: { duration: 0.3, ease: "easeIn" },
                opacity: { duration: 0.2 }
              }
            }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-5 pb-4 md:pb-5 relative z-10">
              <motion.div
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-slate-600 leading-relaxed text-sm md:text-base"
              >
                {answer}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * FAQSection - Complete FAQ section with header
 */
export function FAQSection({ 
  title = "Frequently Asked Questions",
  subtitle = "Everything you need to know",
  items,
  className = "",
}) {
  return (
    <section className={`py-20 md:py-32 ${className}`}>
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-12 md:mb-16">
          <span 
            className="inline-block px-4 py-1.5 rounded-full bg-[#01bad2]/10 text-[#01bad2] text-xs font-bold uppercase tracking-widest mb-4 border border-[#01bad2]/20"
          >
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tighter mb-4">
            {title}
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>
        
        <FAQAccordion items={items} />
      </div>
    </section>
  );
}

export default FAQAccordion;


