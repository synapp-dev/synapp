"use client";

import { useState } from "react";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import type { TopicOption } from "@/types/lesson-wizard";

interface LessonWizardTopicProps {
  selectedTopic: TopicOption | null;
  onTopicChange: (topic: TopicOption | null) => void;
}

// Dummy topic data
const dummyTopics: TopicOption[] = [
  {
    id: "topic-1",
    title: "Understanding Bullying",
    stageCode: "S2",
    stageName: "Stage 2",
    slideCount: 12,
    description: "Introduction to bullying concepts, types, and impacts on school community.",
  },
  {
    id: "topic-2",
    title: "Cyber Safety",
    stageCode: "S3",
    stageName: "Stage 3",
    slideCount: 15,
    description: "Online safety, digital citizenship, and responsible internet use.",
  },
  {
    id: "topic-3",
    title: "Building Respect",
    stageCode: "S1",
    stageName: "Stage 1",
    slideCount: 10,
    description: "Core values of respect, kindness, and empathy in daily interactions.",
  },
  {
    id: "topic-4",
    title: "Conflict Resolution",
    stageCode: "S4",
    stageName: "Stage 4",
    slideCount: 18,
    description: "Strategies for resolving conflicts peacefully and seeking help.",
  },
  {
    id: "topic-5",
    title: "Standing Up for Others",
    stageCode: "S2",
    stageName: "Stage 2",
    slideCount: 14,
    description: "Becoming an upstander and supporting peers in difficult situations.",
  },
  {
    id: "topic-6",
    title: "Social Media Awareness",
    stageCode: "S5",
    stageName: "Stage 5",
    slideCount: 16,
    description: "Understanding social media influence and making positive choices online.",
  },
  {
    id: "topic-7",
    title: "Inclusion and Diversity",
    stageCode: "S1",
    stageName: "Stage 1",
    slideCount: 11,
    description: "Celebrating differences and creating inclusive school environments.",
  },
  {
    id: "topic-8",
    title: "Leadership Skills",
    stageCode: "S4",
    stageName: "Stage 4",
    slideCount: 20,
    description: "Developing leadership qualities and positive influence in peer groups.",
  },
];

export function LessonWizardTopic({
  selectedTopic,
  onTopicChange,
}: LessonWizardTopicProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTopics = dummyTopics.filter((topic) =>
    topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.stageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Topic</h3>
        <p className="text-sm text-muted-foreground">
          Choose the lesson content you'd like to use
        </p>
      </div>

      {/* Search input */}
      <Input
        placeholder="Search topics..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full"
      />

      {/* Topic cards grid */}
      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
          {filteredTopics.map((topic) => {
            const isSelected = selectedTopic?.id === topic.id;

            return (
              <button
                key={topic.id}
                onClick={() => onTopicChange(topic)}
                className="text-left"
              >
                <Card
                  className={`
                    h-full transition-all
                    ${isSelected
                      ? "border-primary border-2 bg-primary/5"
                      : "border-border hover:border-primary/50"
                    }
                  `}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-base leading-tight">
                        {topic.title}
                      </h4>
                      {isSelected && (
                        <div className="text-primary text-lg">✓</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{topic.stageCode}</Badge>
                      <Badge variant="secondary">{topic.slideCount} slides</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {topic.description}
                    </p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {searchQuery && filteredTopics.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No topics found matching "{searchQuery}"
        </p>
      )}
    </div>
  );
}

