
"use client";

import { Muscle } from "@/lib/workouts";

interface BodyProps {
  muscleColors: { [key in Muscle]?: string };
}

export function BackBody({ muscleColors }: BodyProps) {
  return (
    <svg width="250" height="500" viewBox="0 0 250 500" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="125" cy="50" r="30" fill="#E0E0E0" />
      {/* Neck */}
      <rect x="115" y="80" width="20" height="20" fill={muscleColors.neck || '#D3D3D3'} />
      {/* Back */}
      <path d="M100 100 L150 100 L160 220 L90 220 Z" fill={muscleColors.back || '#D3D3D3'} />
      {/* Traps */}
      <path d="M110 90 L140 90 L125 120 Z" fill={muscleColors.traps || '#D3D3D3'} />
      {/* Lats */}
      <path d="M100 140 C80 180, 80 220, 90 220 L100 220 Z" fill={muscleColors.lats || '#D3D3D3'} />
      <path d="M150 140 C170 180, 170 220, 160 220 L150 220 Z" fill={muscleColors.lats || '#D3D3D3'} />
      {/* Teres Major/Rear Delts */}
      <circle cx="100" cy="120" r="20" fill={muscleColors.teres_major || '#D3D3D3'} />
      <circle cx="150" cy="120" r="20" fill={muscleColors.teres_major || '#D3D3D3'} />
       <circle cx="105" cy="110" r="15" fill={muscleColors.rear_delts || '#D3D3D3'} />
      <circle cx="145" cy="110" r="15" fill={muscleColors.rear_delts || '#D3D3D3'} />
      {/* Left Arm */}
      <rect x="60" y="125" width="25" height="100" fill={muscleColors.triceps || '#D3D3D3'} />
      <rect x="55" y="225" width="20" height="80" fill={muscleColors.forearms || '#D3D3D3'} />
      {/* Right Arm */}
      <rect x="165" y="125" width="25" height="100" fill={muscleColors.triceps || '#D3D3D3'} />
      <rect x="175" y="225" width="20" height="80" fill={muscleColors.forearms || '#D3D3D3'} />
      {/* Lower Back/Glutes */}
      <path d="M100 220 L150 220 L140 260 L110 260 Z" fill={muscleColors.lower_back || '#D3D3D3'} />
      <path d="M90 220 L160 220 L160 280 Q125 300 90 280 Z" fill={muscleColors.glutes || '#D3D3D3'} />
      {/* Legs */}
      <rect x="90" y="280" width="30" height="120" fill={muscleColors.hamstrings || '#D3D3D3'} />
      <rect x="130" y="280" width="30" height="120" fill={muscleColors.hamstrings || '#D3D3D3'} />
      <rect x="90" y="400" width="30" height="60" fill={muscleColors.calves || '#D3D3D3'} />
      <rect x="130" y="400" width="30" height="60" fill={muscleColors.calves || '#D3D3D3'} />
      {/* Feet */}
      <ellipse cx="105" cy="470" rx="20" ry="10" fill="#E0E0E0" />
      <ellipse cx="145" cy="470" rx="20" ry="10" fill="#E0E0E0" />
    </svg>
  )
}
