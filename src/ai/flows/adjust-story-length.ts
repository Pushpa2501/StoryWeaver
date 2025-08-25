'use server';

/**
 * @fileOverview Implements a Genkit flow to adjust the length of a story.
 *
 * - adjustStoryLength - A function that handles the story length adjustment process.
 * - AdjustStoryLengthInput - The input type for the adjustStoryLength function.
 * - AdjustStoryLengthOutput - The return type for the adjustStoryLength function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustStoryLengthInputSchema = z.object({
  story: z.string().describe('The story to adjust.'),
  maxLength: z
    .number()
    .describe('The maximum length of the story in words.')
    .default(100),
});
export type AdjustStoryLengthInput = z.infer<typeof AdjustStoryLengthInputSchema>;

const AdjustStoryLengthOutputSchema = z.object({
  adjustedStory: z.string().describe('The adjusted story.'),
});
export type AdjustStoryLengthOutput = z.infer<typeof AdjustStoryLengthOutputSchema>;

export async function adjustStoryLength(input: AdjustStoryLengthInput): Promise<AdjustStoryLengthOutput> {
  return adjustStoryLengthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustStoryLengthPrompt',
  input: {schema: AdjustStoryLengthInputSchema},
  output: {schema: AdjustStoryLengthOutputSchema},
  prompt: `Adjust the following story to be no more than {{maxLength}} words long.  Make sure that you do not cut off the story abruptly, and that it makes sense. Ensure proper sentence structure. 

Story: {{{story}}}`,
});

const adjustStoryLengthFlow = ai.defineFlow(
  {
    name: 'adjustStoryLengthFlow',
    inputSchema: AdjustStoryLengthInputSchema,
    outputSchema: AdjustStoryLengthOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
