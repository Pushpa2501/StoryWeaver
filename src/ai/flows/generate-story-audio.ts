'use server';
/**
 * @fileOverview A text-to-speech AI agent.
 *
 * - generateStoryAudio - A function that handles converting a story to audio.
 * - GenerateStoryAudioInput - The input type for the generateStoryAudio function.
 * - GenerateStoryAudioOutput - The return type for the generateStoryAudio function.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';
import wav from 'wav';

const GenerateStoryAudioInputSchema = z.object({
  story: z.string().describe('The story to convert to audio.'),
});
export type GenerateStoryAudioInput = z.infer<
  typeof GenerateStoryAudioInputSchema
>;

const GenerateStoryAudioOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a data URI.'),
});
export type GenerateStoryAudioOutput = z.infer<
  typeof GenerateStoryAudioOutputSchema
>;

export async function generateStoryAudio(
  input: GenerateStoryAudioInput
): Promise<GenerateStoryAudioOutput> {
  return generateStoryAudioFlow(input);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const generateStoryAudioFlow = ai.defineFlow(
  {
    name: 'generateStoryAudioFlow',
    inputSchema: GenerateStoryAudioInputSchema,
    outputSchema: GenerateStoryAudioOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: input.story,
    });
    if (!media) {
      throw new Error('no media returned');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);

    return {
      audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);
