"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  generateStoryContinuation,
  type GenerateStoryContinuationInput,
} from "@/ai/flows/generate-story";
import { generateStoryImage } from "@/ai/flows/generate-story-image";
import { generateStoryAudio } from "@/ai/flows/generate-story-audio";
import { useToast } from "@/hooks/use-toast";
import { StoryForm, type StoryFormValues } from "@/components/story-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Share2,
  Download,
  MessageCircle,
  Mail,
  Copy,
  MoreHorizontal,
  Ghost,
  History,
  Trash2,
  Pencil,
  Save,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
  </svg>
);

export default function Home() {
  const [story, setStory] = useState("");
  const [storiesHistory, setStoriesHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [storyAudioDataUri, setStoryAudioDataUri] = useState<string | null>(
    null
  );
  const { toast } = useToast();

  useEffect(() => {
    if (navigator.share) {
      setCanShare(true);
    }
  }, []);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("storyHistory");
      if (savedHistory) {
        setStoriesHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load story history from localStorage", error);
      localStorage.removeItem("storyHistory");
    }
  }, []);

  useEffect(() => {
    try {
      if (storiesHistory.length > 0) {
        localStorage.setItem("storyHistory", JSON.stringify(storiesHistory));
      } else {
        localStorage.removeItem("storyHistory");
      }
    } catch (error) {
      console.error("Failed to save story history to localStorage", error);
    }
  }, [storiesHistory]);

  const handleGenerateStory = async (
    values: StoryFormValues,
    imageDataUri?: string | null
  ) => {
    setIsLoading(true);
    setStory("");
    setGeneratedImage(null);
    setIsEditing(false);
    setStoryAudioDataUri(null);

    try {
      const input: GenerateStoryContinuationInput = {
        prompt: values.prompt,
        maxLength: values.maxLength,
        temperature: values.temperature,
        language: values.language,
        photoDataUri: imageDataUri || undefined,
      };
      const result = await generateStoryContinuation(input);

      if (result && result.story) {
        setStory(result.story);
        setStoriesHistory((prev) => [result.story, ...prev].slice(0, 20));

        setIsImageLoading(true);
        try {
          const imageResult = await generateStoryImage({ story: result.story });
          if (imageResult && imageResult.imageDataUri) {
            setGeneratedImage(imageResult.imageDataUri);
          }
        } catch (imageError) {
          console.error("Image generation failed:", imageError);
          toast({
            variant: "destructive",
            title: "Image Generation Failed",
            description:
              "The story was created, but the image could not be generated.",
          });
        } finally {
          setIsImageLoading(false);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to generate story. Please try again.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "An unexpected error occurred",
        description:
          "Something went wrong while generating the story. Please check the console and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareVia = async (
    platform:
      | "whatsapp"
      | "email"
      | "copy"
      | "native"
      | "instagram"
      | "snapchat"
  ) => {
    if (!story) return;

    const shareTitle = "A story from Story Weaver";
    const encodedStory = encodeURIComponent(story);

    const copyToClipboard = async (platformName: string) => {
      try {
        await navigator.clipboard.writeText(story);
        toast({
          title: "Story Copied",
          description: `The story has been copied. You can now paste it in ${platformName}.`,
        });
      } catch (err) {
        console.error(
          `Failed to copy story to clipboard for ${platformName}:`,
          err
        );
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Could not copy the story to your clipboard.",
        });
      }
    };

    if (platform === "whatsapp") {
      window.open(`whatsapp://send?text=${encodedStory}`, "_blank");
    } else if (platform === "email") {
      const encodedTitle = encodeURIComponent(shareTitle);
      window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedStory}`;
    } else if (platform === "copy") {
      await copyToClipboard("your clipboard");
    } else if (platform === "instagram") {
      await copyToClipboard("Instagram");
    } else if (platform === "snapchat") {
      await copyToClipboard("Snapchat");
    } else if (platform === "native" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: story,
        });
      } catch (error) {
        if (
          !(
            error instanceof DOMException &&
            (error.name === "AbortError" || error.name === "NotAllowedError")
          )
        ) {
          console.error("Error sharing story:", error);
          toast({
            variant: "destructive",
            title: "Share Failed",
            description: "There was an error trying to share the story.",
          });
        }
      }
    }
  };

  const handleDownloadStory = () => {
    if (!story) return;

    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      let y = 15;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("A story from Story Weaver", margin, y);
      y += 10;

      if (generatedImage) {
        try {
          const imgProps = doc.getImageProperties(generatedImage);
          const imgWidth = pageWidth - margin * 2;
          const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

          if (y + imgHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.addImage(generatedImage, "PNG", margin, y, imgWidth, imgHeight);
          y += imgHeight + 10;
        } catch (imgError) {
          console.error("Error adding image to PDF:", imgError);
          toast({
            variant: "destructive",
            title: "PDF Image Error",
            description: "Could not add the generated image to the PDF.",
          });
        }
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(story, pageWidth - margin * 2);

      for (let i = 0; i < splitText.length; i++) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(splitText[i], margin, y);
        y += 7;
      }

      doc.save("story-weaver.pdf");
      toast({
        title: "Download Started",
        description: "Your story is being downloaded as a PDF.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "There was an error trying to download the story.",
      });
    }
  };

  const handleSelectStoryFromHistory = (selectedStory: string) => {
    setStory(selectedStory);
    setGeneratedImage(null);
    setIsEditing(false);
    setStoryAudioDataUri(null);
  };

  const handleClearHistory = () => {
    setStoriesHistory([]);
    toast({
      title: "History Cleared",
      description: "Your story history has been cleared.",
    });
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      toast({
        title: "Story Saved",
        description: "Your changes are available for sharing or downloading.",
      });
    }
    setIsEditing((prev) => !prev);
  };

  const handleListen = async () => {
    if (!story) return;

    setIsAudioLoading(true);
    setStoryAudioDataUri(null);
    try {
      const result = await generateStoryAudio({ story });
      if (result && result.audioDataUri) {
        setStoryAudioDataUri(result.audioDataUri);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to generate audio. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error generating audio:", error);
      toast({
        variant: "destructive",
        title: "Audio Generation Failed",
        description: "Something went wrong while generating the audio.",
      });
    } finally {
      setIsAudioLoading(false);
    }
  };

  return (
    <main className="container mx-auto min-h-screen p-4 md:p-8 lg:p-12 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center text-center w-full max-w-4xl">
        <div className="flex items-center gap-4 mb-4">
          <BookOpen className="w-12 h-12 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
            Story Weaver
          </h1>
        </div>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
          Unleash your imagination. Provide a starting prompt and let our AI
          co-author continue your tale with creativity and flair.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
        <div className="w-full">
          <StoryForm
            onGenerate={handleGenerateStory}
            isLoading={isLoading || isImageLoading}
          />
        </div>
        <div className="w-full flex flex-col gap-8">
          <Card className="h-full min-h-[480px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Your Generated Story</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!story || isLoading || isImageLoading}
                  onClick={handleToggleEdit}
                  aria-label={isEditing ? "Save story" : "Edit story"}
                >
                  {isEditing ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={
                    !story ||
                    isLoading ||
                    isImageLoading ||
                    isEditing ||
                    isAudioLoading
                  }
                  onClick={handleListen}
                  aria-label="Listen to story"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={
                        !story || isLoading || isImageLoading || isEditing
                      }
                      aria-label="Share story"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => handleShareVia("whatsapp")}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      <span>WhatsApp</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareVia("email")}>
                      <Mail className="mr-2 h-4 w-4" />
                      <span>Email</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleShareVia("instagram")}
                    >
                      <InstagramIcon className="mr-2 h-4 w-4" />
                      <span>Instagram</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleShareVia("snapchat")}
                    >
                      <Ghost className="mr-2 h-4 w-4" />
                      <span>Snapchat</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareVia("copy")}>
                      <Copy className="mr-2 h-4 w-4" />
                      <span>Copy Text</span>
                    </DropdownMenuItem>
                    {canShare && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleShareVia("native")}
                        >
                          <MoreHorizontal className="mr-2 h-4 w-4" />
                          <span>More...</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={
                    !story || isLoading || isImageLoading || isEditing
                  }
                  onClick={handleDownloadStory}
                  aria-label="Download story as PDF"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4">
              {isImageLoading && (
                <div className="w-full aspect-video bg-muted rounded-md animate-pulse"></div>
              )}
              {generatedImage && !isImageLoading && !isLoading && (
                <div className="w-full aspect-video relative rounded-md overflow-hidden border">
                  <Image
                    src={generatedImage}
                    alt="Generated story illustration"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              {isAudioLoading && (
                <div className="flex items-center justify-center p-4 rounded-md bg-muted">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary"
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
                  <p className="text-muted-foreground">Generating audio...</p>
                </div>
              )}
              {storyAudioDataUri && !isAudioLoading && (
                <div className="mt-2">
                  <audio controls className="w-full h-10">
                    <source src={storyAudioDataUri} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              <div className="flex-grow flex flex-col min-h-0">
                {isLoading ? (
                  <div className="space-y-4 animate-pulse pt-2 flex-grow">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-4/5"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                ) : isEditing ? (
                  <Textarea
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    className="flex-grow w-full rounded-md border border-input bg-transparent p-2 text-base leading-relaxed resize-none focus-visible:ring-1 focus-visible:ring-ring"
                    autoFocus
                  />
                ) : (
                  <div className="transition-opacity duration-1000 animate-in fade-in-0 flex-grow min-h-0">
                    {story ? (
                      <ScrollArea className="h-full pr-4">
                        <p className="text-base leading-relaxed whitespace-pre-wrap">
                          {story}
                        </p>
                      </ScrollArea>
                    ) : (
                      <p className="text-muted-foreground italic">
                        Your story will appear here...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <History className="h-5 w-5" />
                Story History
              </CardTitle>
              {storiesHistory.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearHistory}
                  aria-label="Clear history"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {storiesHistory.length > 0 ? (
                <ScrollArea className="h-64 pr-4">
                  <div className="space-y-2">
                    {storiesHistory.map((pastStory, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-md border hover:bg-muted cursor-pointer transition-colors"
                        onClick={() =>
                          handleSelectStoryFromHistory(pastStory)
                        }
                        title="Click to view this story"
                      >
                        <p className="truncate text-sm text-muted-foreground">
                          {pastStory}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground italic">
                    Your generated stories will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
