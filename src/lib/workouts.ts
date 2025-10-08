
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
    | 'traps'
    | 'neck'
    | 'calves'
    | 'glutes'
    | 'hamstrings'
    | 'lower_back'
    | 'lats'
    | 'teres_major'
    | 'rear_delts'
    | 'triceps';

export interface Workout {
    id: string;
    name: string;
    muscles: Muscle[];
}

export const workouts: Workout[] = [
    { id: 'push_day', name: 'Push Day', muscles: ['chest', 'front_delts', 'side_delts', 'triceps'] },
    { id: 'pull_day', name: 'Pull Day', muscles: ['back', 'traps', 'rear_delts', 'biceps', 'forearms'] },
    { id: 'leg_day', name: 'Leg Day', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'lower_back'] },
    { id: 'full_body_a', name: 'Full Body A', muscles: ['chest', 'back', 'quads', 'shoulders', 'biceps'] },
    { id: 'full_body_b', name: 'Full Body B', muscles: ['hamstrings', 'glutes', 'triceps', 'calves', 'abs'] },
    { id: 'upper_body', name: 'Upper Body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'traps'] },
    { id: 'lower_body', name: 'Lower Body', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'lower_back', 'abs'] },
    { id: 'abs_core', name: 'Abs & Core', muscles: ['abs', 'obliques', 'lower_back'] },
    { id: 'arm_day', name: 'Arm Day', muscles: ['biceps', 'triceps', 'forearms'] },
];
