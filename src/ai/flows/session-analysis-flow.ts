
'use server';
/**
 * @fileOverview An AI flow for analyzing gym session data to provide performance insights.
 *
 * - analyzeSessions - A function that takes session data and returns an analysis.
 * - SessionAnalysisInput - The input type for the analyzeSessions function.
 * - SessionAnalysisOutput - The return type for the analyzeSessions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const SessionDataSchema = z.object({
    className: z.string().describe("The name of the class, e.g., 'Morning Yoga'."),
    trainerName: z.string().describe("The name of the trainer who conducted the class."),
    timeOfDay: z.string().describe("The time the class started, in HH:MM format."),
    dayOfWeek: z.string().describe("The day of the week the class was held, e.g., 'Monday'."),
    memberCount: z.number().describe("The number of members who attended the class."),
});
export type SessionData = z.infer<typeof SessionDataSchema>;

const SessionAnalysisInputSchema = z.object({
  sessions: z.array(SessionDataSchema),
});
export type SessionAnalysisInput = z.infer<typeof SessionAnalysisInputSchema>;

export const SessionAnalysisOutputSchema = z.object({
  topTrainer: z.object({
    name: z.string().describe("The name of the top-performing trainer."),
    analysis: z.string().describe("A brief, one-sentence analysis of why this trainer is performing well, based on the data provided (e.g., high average attendance)."),
  }),
  popularClass: z.object({
    name: z.string().describe("The name of the most popular class."),
    analysis: z.string().describe("A brief, one-sentence analysis of why this class is popular (e.g., consistently high attendance)."),
  }),
  peakTimes: z.object({
    analysis: z.string().describe("A brief, one-sentence analysis of the most popular days and times for classes based on attendance."),
  }),
});
export type SessionAnalysis = z.infer<typeof SessionAnalysisOutputSchema>;

export async function analyzeSessions(input: SessionAnalysisInput): Promise<SessionAnalysis> {
  return sessionAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sessionAnalysisPrompt',
  input: { schema: SessionAnalysisInputSchema },
  output: { schema: SessionAnalysisOutputSchema },
  prompt: `You are a gym management consultant. Analyze the following session data and provide insights.

Your task is to identify the top-performing trainer, the most popular class, and the optimal session timings based on member attendance.

Provide a concise, one-sentence analysis for each category.

Here is the session data:
{{#each sessions}}
- Class: {{className}}, Trainer: {{trainerName}}, Time: {{dayOfWeek}} at {{timeOfDay}}, Attendance: {{memberCount}}
{{/each}}
`,
});

const sessionAnalysisFlow = ai.defineFlow(
  {
    name: 'sessionAnalysisFlow',
    inputSchema: SessionAnalysisInputSchema,
    outputSchema: SessionAnalysisOutputSchema,
  },
  async (input) => {
    // Return mock data if there are no sessions to avoid calling the model with empty data.
    if (input.sessions.length === 0) {
        return {
            topTrainer: { name: "N/A", analysis: "Not enough data to determine the top trainer." },
            popularClass: { name: "N/A", analysis: "Not enough data to determine the most popular class." },
            peakTimes: { analysis: "Not enough data to determine peak times." },
        };
    }

    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid analysis.");
    }
    return output;
  }
);
