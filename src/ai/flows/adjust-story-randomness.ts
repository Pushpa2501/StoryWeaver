'use server';
/**
 * @fileOverview Adjusts the randomness of story generation based on user input.
 *
 * - adjustStoryRandomness - A function that adjusts the randomness of the story generation process.
 * - AdjustStoryRandomnessInput - The input type for the adjustStoryRandomness function.
 * - AdjustStoryRandomnessOutput - The return type for the adjustStoryRandomness function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustStoryRandomnessInputSchema = z.object({
  prompt: z.string().describe('The beginning of the story.'),
  temperature: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'The randomness of the story generation (0.0 for predictable, 1.0 for maximum randomness).'
    ),
  maxLength: z
    .number()
    .min(50)
    .max(500)
    .describe('The maximum length of the generated story.'),
});
export type AdjustStoryRandomnessInput = z.infer<
  typeof AdjustStoryRandomnessInputSchema
>;

const AdjustStoryRandomnessOutputSchema = z.object({
  story: z.string().describe('The generated story.'),
});
export type AdjustStoryRandomnessOutput = z.infer<
  typeof AdjustStoryRandomnessOutputSchema
>;

export async function adjustStoryRandomness(
  input: AdjustStoryRandomnessInput
): Promise<AdjustStoryRandomnessOutput> {
  return adjustStoryRandomnessFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustStoryRandomnessPrompt',
  input: {schema: AdjustStoryRandomnessInputSchema},
  output: {schema: AdjustStoryRandomnessOutputSchema},
  prompt: `Continue the following story. The story should have a maximum length of {{maxLength}} words. Be creative.

Story Start: {{{prompt}}}`,
  config: {
    // Configure safety settings to allow for a wider range of creative expression
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const adjustStoryRandomnessFlow = ai.defineFlow(
  {
    name: 'adjustStoryRandomnessFlow',
    inputSchema: AdjustStoryRandomnessInputSchema,
    outputSchema: AdjustStoryRandomnessOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, {
      temperature: input.temperature,
    });
    return {
      story: output!.story,
    };
  }
);
