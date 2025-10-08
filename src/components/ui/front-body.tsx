"use client";

import { Muscle } from "@/lib/workouts";

interface BodyProps {
  muscleColors: { [key in Muscle]?: string };
}

export function FrontBody({ muscleColors }: BodyProps) {
  return (
    <svg width="250" height="500" viewBox="0 0 250 500" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="125" cy="50" r="30" fill="#E0E0E0" />
      {/* Neck */}
      <rect x="115" y="80" width="20" height="20" fill={muscleColors.neck || '#D3D3D3'} />
      {/* Torso */}
      <path d="M100 100 L150 100 L160 220 L90 220 Z" fill="#D3D3D3" />
      {/* Chest */}
      <path d="M100 100 C100 150, 150 150, 150 100" fill={muscleColors.chest || '#D3D3D3'} />
      {/* Abs */}
      <rect x="105" y="155" width="40" height="60" fill={muscleColors.abs || '#D3D3D3'} />
      {/* Obliques */}
      <path d="M90 180 L100 220 L90 220 Z" fill={muscleColors.obliques || '#D3D3D3'} />
      <path d="M160 180 L150 220 L160 220 Z" fill={muscleColors.obliques || '#D3D3D3'} />
      {/* Shoulders */}
      <circle cx="90" cy="110" r="25" fill={muscleColors.side_delts || '#D3D3D3'} />
      <circle cx="160" cy="110" r="25" fill={muscleColors.side_delts || '#D3D3D3'} />
      <circle cx="100" cy="105" r="15" fill={muscleColors.front_delts || '#D3D3D3'} />
      <circle cx="150" cy="105" r="15" fill={muscleColors.front_delts || '#D3D3D3'} />
      {/* Left Arm */}
      <rect x="60" y="125" width="25" height="100" fill={muscleColors.biceps || '#D3D3D3'} />
      <rect x="55" y="225" width="20" height="80" fill={muscleColors.forearms || '#D3D3D3'} />
      {/* Right Arm */}
      <rect x="165" y="125" width="25" height="100" fill={muscleColors.biceps || '#D3D3D3'} />
      <rect x="175" y="225" width="20" height="80" fill={muscleColors.forearms || '#D3D3D3'} />
      {/* Legs */}
      <rect x="90" y="220" width="30" height="150" fill={muscleColors.quads || '#D3D3D3'} />
      <rect x="130" y="220" width="30" height="150" fill={muscleColors.quads || '#D3D3D3'} />
      {/* Tibialis */}
      <rect x="90" y="370" width="30" height="80" fill={muscleColors.tibialis || '#D3D3D3'} />
      <rect x="130" y="370" width="30" height="80" fill={muscleColors.tibialis || '#D3D3D3'} />
      {/* Feet */}
      <ellipse cx="105" cy="460" rx="20" ry="10" fill="#E0E0E0" />
      <ellipse cx="145" cy="460" rx="20" ry="10" fill="#E0E0E0" />
    </svg>
  )
}
