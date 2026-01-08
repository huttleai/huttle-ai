import React, { useId } from 'react';

export function DotPattern({ 
  width = 16, 
  height = 16, 
  x = 0, 
  y = 0, 
  cx = 0.5, 
  cy = 0.5, 
  cr = 0.5, 
  className = "",
  ...props 
}) {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          patternContentUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <circle cx={width * cx} cy={height * cy} r={cr} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
}

