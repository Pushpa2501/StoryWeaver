'use server';
/**
 * @fileOverview A story image generation AI agent.
 *
 * - generateStoryImage - A function that handles the story image generation process.
 * - GenerateStoryImageInput - The input type for the generateStoryImage function.
 * - GenerateStoryImageOutput - The return type for the generateStoryImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStoryImageInputSchema = z.object({
  story: z.string().describe('The story to generate an image for.'),
});
export type GenerateStoryImageInput = z.infer<
  typeof GenerateStoryImageInputSchema
>;

const GenerateStoryImageOutputSchema = z.object({
  imageDataUri: z.string().describe('The generated image as a data URI.'),
});
export type GenerateStoryImageOutput = z.infer<
  typeof GenerateStoryImageOutputSchema
>;

export async function generateStoryImage(
  input: GenerateStoryImageInput
): Promise<GenerateStoryImageOutput> {
  return generateStoryImageFlow(input);
}

const imagePromptGenerator = ai.definePrompt({
  name: 'imagePromptGenerator',
  input: {schema: z.object({story: z.string()})},
  prompt: `You are an expert at creating prompts for an image generation AI. Based on the following story, create a short, descriptive prompt (no more than 30 words) for a whimsical, storybook style illustration. The prompt should capture the main visual elements and mood of the story.

Story: {{{story}}}`,
  model: 'googleai/gemini-1.5-flash',
});

const generateStoryImageFlow = ai.defineFlow(
  {
    name: 'generateStoryImageFlow',
    inputSchema: GenerateStoryImageInputSchema,
    outputSchema: GenerateStoryImageOutputSchema,
  },
  async input => {
    // Step 1: Generate a concise image prompt from the story.
    const imagePromptResponse = await imagePromptGenerator({story: input.story});
    const imagePrompt = imagePromptResponse.text;

    // Step 2: Generate the image using the concise prompt.
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: imagePrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
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

    if (!media) {
      throw new Error('Image generation failed.');
    }

    return {
      imageDataUri: media.url,
    };
  }
);
