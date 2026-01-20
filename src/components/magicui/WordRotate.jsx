import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * WordRotate - Cycles through an array of words with smooth animations
 * Perfect for hero sections to showcase multiple value propositions
 */
export function WordRotate({ 
  words, 
  duration = 2500, 
  className = "",
  framerProps = {
    initial: { opacity: 0, y: 20, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -20, filter: "blur(8px)" },
    transition: { duration: 0.4, ease: "easeOut" },
  }
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, duration);
    return () => clearInterval(interval);
  }, [words.length, duration]);

  return (
    <span className={`inline-block overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[currentIndex]}
          className="inline-block"
          {...framerProps}
        >
          {words[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default WordRotate;




