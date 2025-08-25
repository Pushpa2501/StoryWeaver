"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2, Mic, MicOff, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import Image from "next/image";

const defaultPrompt = "Once upon a time, in a land of towering crystal mountains...";

const formSchema = z.object({
  prompt: z
    .string()
    .max(500, "Prompt cannot exceed 500 characters.")
    .optional(),
  maxLength: z.number().min(50).max(500),
  temperature: z.number().min(0).max(1),
  language: z.string(),
});

export type StoryFormValues = z.infer<typeof formSchema>;

interface StoryFormProps {
  onGenerate: (values: StoryFormValues, imageDataUri?: string | null) => void;
  isLoading: boolean;
}

export function StoryForm({ onGenerate, isLoading }: StoryFormProps) {
  const form = useForm<StoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: defaultPrompt,
      maxLength: 250,
      temperature: 0.8,
      language: "English",
    },
  });

  const [isListening, setIsListening] = useState(false);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] =
    useState(false);
  const recognitionRef = useRef<any>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechRecognitionSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const currentPrompt = form.getValues("prompt");

        if (
          currentPrompt ===
          "Once upon a time, in a land of towering crystal mountains..."
        ) {
          form.setValue("prompt", transcript);
        } else {
          form.setValue(
            "prompt",
            currentPrompt ? `${currentPrompt} ${transcript}` : transcript
          );
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          console.error("Speech recognition error:", event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [form]);

  const handleMicClick = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  };

  const onSubmit = (values: StoryFormValues) => {
    if (!imagePreview && (!values.prompt || values.prompt.trim().length < 10)) {
      form.setError("prompt", {
        type: "manual",
        message: "A prompt of at least 10 characters is required if no image is uploaded.",
      });
      return;
    }
    onGenerate(values, imagePreview);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        form.setValue("prompt", "");
        form.clearErrors("prompt");
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };
  
  const handleRemoveImage = () => {
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    form.setValue("prompt", defaultPrompt);
    form.clearErrors("prompt");
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Craft Your Story</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Story Prompt</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Textarea
                        placeholder="Enter the beginning of your story or use the mic..."
                        className="resize-none pr-12"
                        rows={5}
                        {...field}
                        disabled={isLoading || !!imagePreview}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute bottom-2 right-2 h-8 w-8"
                      onClick={handleMicClick}
                      disabled={isLoading || !isSpeechRecognitionSupported || !!imagePreview}
                      title={
                        isListening ? "Stop recording" : "Start recording"
                      }
                    >
                      {isListening ? (
                        <MicOff className="h-4 w-4 text-destructive" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {isListening ? "Stop recording" : "Start recording"}
                      </span>
                    </Button>
                  </div>
                  <FormDescription>
                    {imagePreview
                      ? "The story will be generated based on your image."
                      : "This is the starting point for the AI. You can also use your voice."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Optional Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={imageInputRef}
                  disabled={isLoading}
                  className="file:text-foreground cursor-pointer"
                />
              </FormControl>
              {imagePreview && (
                <div className="mt-4 relative w-full h-48">
                  <Image
                    src={imagePreview}
                    alt="Image preview"
                    fill
                    className="rounded-md border object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={handleRemoveImage}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <FormDescription>
                {imagePreview
                  ? "Remove the image to write a prompt instead."
                  : "You can upload an image to inspire the story."}
              </FormDescription>
            </FormItem>

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Japanese">Japanese</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectGroup>
                        <SelectLabel>Indian Languages</SelectLabel>
                        <SelectItem value="Assamese">Assamese</SelectItem>
                        <SelectItem value="Bengali">Bengali</SelectItem>
                        <SelectItem value="Gujarati">Gujarati</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                        <SelectItem value="Kannada">Kannada</SelectItem>
                        <SelectItem value="Malayalam">Malayalam</SelectItem>
                        <SelectItem value="Marathi">Marathi</SelectItem>
                        <SelectItem value="Odia">Odia</SelectItem>
                        <SelectItem value="Punjabi">Punjabi</SelectItem>
                        <SelectItem value="Tamil">Tamil</SelectItem>
                        <SelectItem value="Telugu">Telugu</SelectItem>
                        <SelectItem value="Urdu">Urdu</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The language for the generated story.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Length: {field.value} words</FormLabel>
                  <FormControl>
                    <Slider
                      min={50}
                      max={500}
                      step={10}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Controls the maximum length of the generated story.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Randomness (Temperature): {field.value.toFixed(1)}
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Lower values are more predictable, higher values are more
                    creative.
                  </FormDescription>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Weaving your tale...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Story
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
