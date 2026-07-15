"use client";

import Image from "next/image";
import { Card } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { SlideRenderer } from "@/components/organisms/slide-renderer";
import { renderQuestionWithUrls } from "@/utils/parse-question-urls";

import type { ExtendedSlideData } from "./types";

// Current Slide Preview - 3/5 width
export function SlidePreview({
  currentSlide,
  slideRefreshKey,
  isCertification,
}: {
  currentSlide: ExtendedSlideData;
  slideRefreshKey: number;
  isCertification: boolean;
}) {
  return (
    <div className="col-span-3 relative aspect-video">
      {/* Background card - inset by 1px */}
      <Card
        className="absolute inset-[1px] overflow-hidden border-none shadow-none p-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(0, 0, 0, 0.03) 10px,
            rgba(0, 0, 0, 0.03) 20px
          )`,
        }}
      >
        <div className="relative w-full h-full p-[2px]">
          <div className="relative w-full h-full border-2 border-dashed border-muted-foreground/30 rounded-sm" />
        </div>
      </Card>
      {/* Content - fills outer container */}
      <div className="relative w-full h-full">
        {currentSlide.kind === "quiz" ? (
          <>
            {/* Bullyproof Logo - Top Center */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <Image
                src="/images/bullyproof-logo.svg"
                alt="Bullyproof"
                width={168}
                height={45}
                className="h-11 w-auto"
              />
            </div>
            <div className="flex flex-col h-full justify-center space-y-4 pt-4">
              {/* Question - Centered and Bold */}
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  {(currentSlide as ExtendedSlideData).quizData
                    ?.question
                    ? renderQuestionWithUrls(
                        (currentSlide as ExtendedSlideData).quizData!
                          .question,
                        (currentSlide as ExtendedSlideData).quizData!
                          .questionUrls,
                      )
                    : "Question"}
                </h2>
              </div>
              {/* Answers - Single Column Grid with Radio Buttons */}
              <div className="flex justify-center">
                <RadioGroup
                  className="w-full max-w-md space-y-0"
                  disabled
                >
                  {(
                    currentSlide as ExtendedSlideData
                  ).quizData?.answers.map(
                    (answer: any, index: number) => (
                      <div
                        key={answer.id || index}
                        className="flex items-center space-x-3 p-3 border rounded-md bg-card"
                      >
                        <RadioGroupItem
                          value={answer.id || `answer-${index}`}
                          id={answer.id || `answer-${index}`}
                        />
                        <Label
                          htmlFor={answer.id || `answer-${index}`}
                          className="flex-1 cursor-pointer"
                        >
                          {answer.text || `Answer ${index + 1}`}
                        </Label>
                      </div>
                    ),
                  ) || []}
                </RadioGroup>
              </div>
            </div>
          </>
        ) : (
          <SlideRenderer
            key={`${currentSlide.id}-${slideRefreshKey}`}
            slide={currentSlide}
            className="w-full h-full"
            isCertification={isCertification}
          />
        )}
      </div>
    </div>
  );
}
