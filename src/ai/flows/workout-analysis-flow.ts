
'use server';
/**
 * @fileOverview An AI flow for analyzing a user's workout history to provide personalized feedback.
 *
 * - analyzeWorkoutHistory - A function that takes workout history and returns an analysis.
 * - WorkoutHistory - The input type for the analyzeWorkoutHistory function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const WorkoutHistorySchema = z.object({
    workoutName: z.string().describe("The name of the workout session."),
    musclesTrained: z.array(z.string()).describe("A list of the primary muscle groups trained in the session."),
    date: z.string().describe("The date the workout was completed, in YYYY-MM-DD format."),
});
export type WorkoutHistory = z.infer<typeof WorkoutHistorySchema>;

const WorkoutAnalysisInputSchema = z.object({
  history: z.array(WorkoutHistorySchema),
});
export type WorkoutAnalysisInput = z.infer<typeof WorkoutAnalysisInputSchema>;


export async function analyzeWorkoutHistory(input: WorkoutAnalysisInput): Promise<string> {
  return workoutAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'workoutAnalysisPrompt',
  input: { schema: WorkoutAnalysisInputSchema },
  prompt: `You are an expert personal trainer. Analyze the following workout history and provide one or two concise, actionable suggestions for the user's next session. Focus on muscle group balance and recovery time.

Your analysis should be encouraging and straightforward. Do not just list the data; provide a concrete recommendation.

Examples:
- "You've trained upper body 3 times this week — focus on legs tomorrow."
- "You haven’t trained back in 4 days — try adding a Pull Day workout soon to keep things balanced."
- "Great consistency with your push days! Maybe try a full-body session next to mix things up."

Workout History:
{{#each history}}
- {{date}}: {{workoutName}} (Trained: {{#each musclesTrained}}{{.}}{{#unless @last}}, {{/unless}}{{/each}})
{{/each}}

Provide your analysis as a single string.`,
});

const workoutAnalysisFlow = ai.defineFlow(
  {
    name: 'workoutAnalysisFlow',
    inputSchema: WorkoutAnalysisInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    if (input.history.length < 3) {
        return "Complete a few more workouts to get your first analysis!";
    }

    const { text } = await prompt(input);
    return text;
  }
);
