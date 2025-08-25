'use server';
/**
 * @fileOverview A story continuation AI agent.
 *
 * - generateStoryContinuation - A function that handles the story continuation generation process.
 * - GenerateStoryContinuationInput - The input type for the generateStoryContinuation function.
 * - GenerateStoryContinuationOutput - The return type for the generateStoryContinuation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStoryContinuationInputSchema = z.object({
  prompt: z.string().optional().describe('The beginning of the story.'),
  maxLength: z.number().describe('The maximum length of the story.').default(100),
  temperature: z.number().describe('The randomness of the story generation, between 0.0 and 1.0.').default(0.8),
  language: z.string().describe('The language for the story.').default('English'),
  photoDataUri: z.string().optional().describe(
    "An optional photo to inspire the story, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
  ),
});
export type GenerateStoryContinuationInput = z.infer<typeof GenerateStoryContinuationInputSchema>;

const GenerateStoryContinuationOutputSchema = z.object({
  story: z.string().describe('The generated story continuation.'),
});
export type GenerateStoryContinuationOutput = z.infer<typeof GenerateStoryContinuationOutputSchema>;

export async function generateStoryContinuation(input: GenerateStoryContinuationInput): Promise<GenerateStoryContinuationOutput> {
  return generateStoryContinuationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStoryContinuationPrompt',
  input: {schema: GenerateStoryContinuationInputSchema},
  output: {schema: GenerateStoryContinuationOutputSchema},
  prompt: `You are a creative story writer. Your task is to write a story in {{language}}, with a maximum length of {{maxLength}} words. Be creative and ensure that each story you generate is unique, even if the starting prompt is the same. Use simple and clear language that is easy for a new language learner to understand.

{{#if photoDataUri}}
Your primary inspiration for the story MUST come from the provided image. Analyze it carefully.
Specifically, focus on the people present. Describe their apparent emotions based on their facial expressions and body language.
What is the relationship between them? What might have just happened, or what is about to happen?
The core of the story must revolve around the people in the image.
{{#if prompt}}
The user's text prompt should serve as a secondary theme or a starting sentence, but it is less important than the image.
User's Prompt: {{{prompt}}}
{{/if}}
Photo: {{media url=photoDataUri}}
{{else}}
Continue the following story based on the prompt given by the user: {{{prompt}}}
{{/if}}`,
});

const generateStoryContinuationFlow = ai.defineFlow(
  {
    name: 'generateStoryContinuationFlow',
    inputSchema: GenerateStoryContinuationInputSchema,
    outputSchema: GenerateStoryContinuationOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input, {
      temperature: input.temperature,
    });
    return output!;
  }
);
