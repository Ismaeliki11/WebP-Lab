import React from "react";

export function Logo({ className = "w-8 h-8", ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <defs>
                <filter id="beam-dark" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#146fd6" floodOpacity="0.8" />
                </filter>
                <linearGradient id="grad-dark" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
                </linearGradient>

                <filter id="beam-light" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#0a1118" floodOpacity="0.3" />
                </filter>
                <linearGradient id="grad-light" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0a1118" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#0a1118" stopOpacity="0.9" />
                </linearGradient>
            </defs>

            <style>
                {`
          .webp-logo-beam { outline: none; fill: url(#grad-light); filter: url(#beam-light); }
          .webp-logo-prism { fill: #0a1118; stroke: none; }

          @media (prefers-color-scheme: dark) {
            .webp-logo-beam { fill: url(#grad-dark); filter: url(#beam-dark); }
            .webp-logo-prism { fill: #111a24; stroke: rgba(255,255,255,0.3); stroke-width: 1.5px; }
          }
        `}
            </style>

            <polygon points="0,48 26,48 19,62 0,62" className="webp-logo-beam" />
            <polygon points="40,20 70,80 10,80" className="webp-logo-prism" />
            <polygon points="40,20 100,5 100,35 50,40" fill="#146fd6" />
            <polygon points="50,40 100,35 100,65 60,60" fill="#118ab2" />
            <polygon points="60,60 100,65 100,95 70,80" fill="#0fa48f" />
        </svg>
    );
}
