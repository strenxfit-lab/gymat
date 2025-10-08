
export type Muscle = 
    | 'chest' 
    | 'abs' 
    | 'obliques'
    | 'quads'
    | 'tibialis'
    | 'biceps'
    | 'forearms'
    | 'front_delts'
    | 'side_delts'
    | 'rear_delts'
    | 'traps'
    | 'neck'
    | 'calves'
    | 'glutes'
    | 'hamstrings'
    | 'lower_back'
    | 'lats'
    | 'teres_major';

export interface Workout {
    id: string;
    name: string;
    muscles: Muscle[];
}

export const workouts: Workout[] = [
    { id: 'push_day', name: 'Push Day', muscles: ['chest', 'front_delts', 'side_delts', 'triceps'] },
    { id: 'pull_day', name: 'Pull Day', muscles: ['lats', 'traps', 'rear_delts', 'biceps', 'forearms', 'teres_major'] },
    { id: 'leg_day', name: 'Leg Day', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'lower_back'] },
    { id: 'full_body_a', name: 'Full Body A', muscles: ['chest', 'lats', 'quads', 'front_delts', 'biceps'] },
    { id: 'full_body_b', name: 'Full Body B', muscles: ['hamstrings', 'glutes', 'triceps', 'calves', 'abs'] },
    { id: 'upper_body', name: 'Upper Body', muscles: ['chest', 'lats', 'traps', 'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps'] },
    { id: 'lower_body', name: 'Lower Body', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'lower_back', 'abs'] },
    { id: 'abs_core', name: 'Abs & Core', muscles: ['abs', 'obliques', 'lower_back'] },
    { id: 'arm_day', name: 'Arm Day', muscles: ['biceps', 'triceps', 'forearms'] },
];
