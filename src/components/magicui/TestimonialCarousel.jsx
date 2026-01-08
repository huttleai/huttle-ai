import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';

/**
 * TestimonialCarousel - Animated testimonial slider with auto-play
 * Shows customer reviews with smooth transitions and ratings
 */
export function TestimonialCarousel({
  testimonials,
  autoPlay = true,
  autoPlayInterval = 5000,
  className = "",
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, testimonials.length]);

  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
      filter: "blur(4px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
    },
    exit: (direction) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
      filter: "blur(4px)",
    }),
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className={`relative ${className}`}>
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 md:p-12 min-h-[320px]">
        {/* Background decoration */}
        <div className="absolute top-8 right-8 text-slate-100">
          <Quote size={120} strokeWidth={1} />
        </div>
        
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.3 },
              filter: { duration: 0.3 },
            }}
            className="relative z-10"
          >
            {/* Stars */}
            <div className="flex gap-1 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  className={i < currentTestimonial.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200"}
                />
              ))}
            </div>
            
            {/* Quote */}
            <blockquote className="text-xl md:text-2xl font-medium text-slate-700 leading-relaxed mb-8 max-w-3xl">
              "{currentTestimonial.quote}"
            </blockquote>
            
            {/* Author */}
            <div className="flex items-center gap-4">
              {currentTestimonial.avatar ? (
                <img 
                  src={currentTestimonial.avatar} 
                  alt={currentTestimonial.author}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-lg"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2B8FC7] to-[#01bad2] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {currentTestimonial.author.charAt(0)}
                </div>
              )}
              <div>
                <div className="font-bold text-slate-900">{currentTestimonial.author}</div>
                <div className="text-slate-500 text-sm">{currentTestimonial.role}</div>
                {currentTestimonial.company && (
                  <div className="text-[#01bad2] text-sm font-medium">{currentTestimonial.company}</div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        {/* Dots */}
        <div className="flex gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'w-8 bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]' 
                  : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
        
        {/* Arrows */}
        <div className="flex gap-2">
          <motion.button
            onClick={goToPrevious}
            className="p-3 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-[#01bad2] hover:text-[#01bad2] transition-colors shadow-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={20} />
          </motion.button>
          <motion.button
            onClick={goToNext}
            className="p-3 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-[#01bad2] hover:text-[#01bad2] transition-colors shadow-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/**
 * TestimonialGrid - Static grid of testimonials
 */
export function TestimonialGrid({ testimonials, className = "" }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {testimonials.map((testimonial, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-[#01bad2]/30 hover:shadow-lg transition-all"
        >
          <div className="flex gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                className={i < testimonial.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200"}
              />
            ))}
          </div>
          <p className="text-slate-600 mb-4 line-clamp-4">"{testimonial.quote}"</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2B8FC7] to-[#01bad2] flex items-center justify-center text-white font-bold text-sm">
              {testimonial.author.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">{testimonial.author}</div>
              <div className="text-slate-500 text-xs">{testimonial.role}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default TestimonialCarousel;

