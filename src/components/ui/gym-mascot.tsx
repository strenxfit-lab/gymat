"use client";

import * as React from "react";

export function GymMascot(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 400"
      width="200"
      height="400"
      {...props}
    >
      <defs>
        <linearGradient id="skin-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#f2d6c2" }} />
          <stop offset="100%" style={{ stopColor: "#e0bca8" }} />
        </linearGradient>
        <linearGradient id="hair-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#4a3a2a" }} />
          <stop offset="100%" style={{ stopColor: "#3a2d20" }} />
        </linearGradient>
      </defs>

      {/* Main Body Structure */}
      <g id="body">
        {/* Head */}
        <circle cx="100" cy="50" r="30" fill="url(#skin-gradient)" />
        {/* Hair */}
        <path
          d="M80,35 C80,20 120,20 120,35 Q125,50 115,55 L85,55 Q75,50 80,35 Z"
          fill="url(#hair-gradient)"
        />
        {/* Ears */}
        <circle cx="70" cy="50" r="5" fill="#e0bca8" />
        <circle cx="130" cy="50" r="5" fill="#e0bca8" />
        {/* Neck */}
        <rect x="90" y="75" width="20" height="20" fill="url(#skin-gradient)" />
        {/* Torso */}
        <path d="M70,95 L130,95 L120,180 L80,180 Z" fill="url(#skin-gradient)" />
      </g>

      {/* Clothing */}
      <g id="clothing">
        {/* Tank Top */}
        <path
          d="M75,95 L125,95 L118,170 L82,170 Z"
          fill="#222222"
          stroke="#111111"
          strokeWidth="1"
        />
        <path
          d="M75,95 C70,105,70,115,80,115"
          fill="none"
          stroke="#222222"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M125,95 C130,105,130,115,120,115"
          fill="none"
          stroke="#222222"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* StrenxFit Red Stripe on Tank Top */}
        <rect x="98" y="105" width="4" height="60" fill="#FF3B30" />
        
        {/* Shorts */}
        <path
          d="M80,175 L120,175 L125,250 L75,250 Z"
          fill="#222222"
          stroke="#111111"
          strokeWidth="1"
        />
        {/* StrenxFit Red detail on shorts */}
        <rect x="75" y="245" width="50" height="5" fill="#FF3B30" />
      </g>

      {/* Limbs & Muscles */}
      <g id="limbs">
        {/* Left Arm (viewer's right) */}
        <path d="M125,105 C140,120 150,150 145,180 L135,180 C135,150 130,125 125,105 Z" fill="url(#skin-gradient)"/>
        <path d="M145,180 L155,250 L140,250 L135,180 Z" fill="url(#skin-gradient)" />
        {/* Right Arm (viewer's left) */}
        <path d="M75,105 C60,120 50,150 55,180 L65,180 C65,150 70,125 75,105 Z" fill="url(#skin-gradient)" />
        <path d="M55,180 L45,250 L60,250 L65,180 Z" fill="url(#skin-gradient)" />
        
        {/* Legs */}
        <rect x="75" y="250" width="25" height="100" fill="url(#skin-gradient)" />
        <rect x="100" y="250" width="25" height="100" fill="url(#skin-gradient)" />
        {/* Calves */}
        <path d="M75,350 C70,360 70,380 75,390 L95,390 C100,380 100,360 95,350 Z" fill="#e0bca8" />
        <path d="M100,350 C105,360 105,380 100,390 L120,390 C125,380 125,360 120,350 Z" fill="#e0bca8" />
      </g>

      {/* Shoes */}
      <g id="shoes">
        <path d="M65,390 L100,390 L95,405 L60,405 Z" fill="#222222" />
        <rect x="60" y="400" width="35" height="5" fill="#FFFFFF" />
        <path d="M105,390 L140,390 L145,405 L110,405 Z" fill="#222222" />
        <rect x="110" y="400" width="35" height="5" fill="#FFFFFF" />
        {/* Red accent on shoes */}
        <rect x="90" y="392" width="10" height="8" fill="#FF3B30" />
        <rect x="105" y="392" width="10" height="8" fill="#FF3B30" />
      </g>
    </svg>
  );
}
