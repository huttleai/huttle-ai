/**
 * IPhoneMockup Component
 * 
 * Displays any image inside a realistic iPhone frame with notch, status bar, and home indicator.
 * Perfect for showcasing mobile screenshots in presentations or documentation.
 * 
 * @param {string} imageSrc - Path to the image to display (e.g., '/screenshot.png')
 * @param {string} imageAlt - Alt text for accessibility
 * @param {string} size - Size variant: 'small' (300px), 'medium' (375px), 'large' (430px)
 * @param {boolean} showBackground - Whether to show the gradient background container
 */
export default function IPhoneMockup({ 
  imageSrc, 
  imageAlt = "Mobile screenshot",
  size = "medium",
  showBackground = true
}) {
  // Size variants matching real iPhone dimensions (aspect ratio 19.5:9)
  const sizes = {
    small: { width: 300, height: 650 },   // iPhone SE scale
    medium: { width: 375, height: 812 },  // iPhone 13/14 standard
    large: { width: 430, height: 932 }    // iPhone 14 Pro Max
  };

  const dimensions = sizes[size] || sizes.medium;

  const phoneContent = (
    <div className="relative">
      {/* iPhone Frame with depth shadow */}
      <div className="relative bg-black rounded-[3rem] p-3 shadow-2xl ring-1 ring-white/10">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-10">
          {/* Camera & sensors */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-900 rounded-full border border-gray-700" />
            <div className="w-1.5 h-1.5 bg-gray-900 rounded-full" />
          </div>
        </div>
        
        {/* Screen Container */}
        <div 
          className="relative bg-white rounded-[2.5rem] overflow-hidden"
          style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
        >
          {/* Status Bar */}
          <div className="absolute top-0 left-0 right-0 h-11 bg-gradient-to-b from-black/5 to-transparent backdrop-blur-sm z-20 flex items-center justify-between px-8 pt-2">
            <span className="text-black text-sm font-semibold">9:41</span>
            <div className="flex items-center gap-1.5">
              {/* Signal bars */}
              <div className="flex gap-0.5">
                {[3, 4, 5, 6].map((height) => (
                  <div 
                    key={height} 
                    className="w-0.5 bg-black rounded-sm" 
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
              {/* WiFi */}
              <svg className="w-4 h-3" viewBox="0 0 16 12" fill="none">
                <path d="M8 12C8.82843 12 9.5 11.3284 9.5 10.5C9.5 9.67157 8.82843 9 8 9C7.17157 9 6.5 9.67157 6.5 10.5C6.5 11.3284 7.17157 12 8 12Z" fill="black"/>
                <path d="M8 6C9.933 6 11.683 6.75 13 8" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 3C11.038 3 13.757 4.243 15.5 6.25" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {/* Battery */}
              <div className="flex items-center gap-0.5">
                <div className="w-6 h-3 border border-black rounded-sm overflow-hidden">
                  <div className="w-full h-full bg-black" style={{ width: '75%' }} />
                </div>
                <div className="w-0.5 h-1.5 bg-black rounded-r-sm" />
              </div>
            </div>
          </div>
          
          {/* Screenshot Image */}
          <div className="w-full h-full">
            <img 
              src={imageSrc} 
              alt={imageAlt}
              className="w-full h-full object-cover object-top"
            />
          </div>
          
          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-black/30 rounded-full" />
        </div>

        {/* Power button */}
        <div className="absolute right-0 top-24 w-1 h-14 bg-black/50 rounded-l-sm" />
        
        {/* Volume buttons */}
        <div className="absolute left-0 top-20 w-1 h-8 bg-black/50 rounded-r-sm" />
        <div className="absolute left-0 top-32 w-1 h-8 bg-black/50 rounded-r-sm" />
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-3xl rounded-full scale-150 opacity-50" />
    </div>
  );

  if (!showBackground) {
    return phoneContent;
  }

  return (
    <div className="flex items-center justify-center p-8 md:p-12 bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50 rounded-3xl">
      {phoneContent}
    </div>
  );
}

