"use client";

import { useState, useEffect } from "react";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2 } from "lucide-react";
import type { TopicOption } from "@/types/lesson-wizard";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";

interface LessonWizardTopicProps {
  selectedTopic: TopicOption | null;
  onTopicChange: (topic: TopicOption | null) => void;
}

export function LessonWizardTopic({
  selectedTopic,
  onTopicChange,
}: LessonWizardTopicProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all curriculum stages first
        const stagesResult = await curriculumApi.stages.list();
        if (stagesResult.error || !stagesResult.data) {
          setError(stagesResult.error?.message || "Failed to load curriculum stages");
          setTopics([]);
          return;
        }

        const stages = stagesResult.data;

        // Fetch topics for all stages in parallel
        const topicsPromises = stages.map((stage) =>
          topicsApi.get.list({ stageId: stage.id })
        );

        const topicsResults = await Promise.all(topicsPromises);
        const allTopics: Array<{ topic: any; stage: any }> = [];

        topicsResults.forEach((result, index) => {
          if (!result.error && result.data) {
            const stage = stages[index];
            result.data.forEach((topic) => {
              allTopics.push({ topic, stage });
            });
          }
        });

        // Fetch slide counts for each topic in parallel
        const topicsWithSlides = await Promise.all(
          allTopics.map(async ({ topic, stage }) => {
            try {
              const topicDetailResult = await topicsApi.get.byId(topic.id);
              const slideCount = topicDetailResult.data?.slides?.length || 0;
              
              return {
                id: topic.id,
                title: topic.title,
                stageCode: stage.code,
                stageName: stage.name,
                slideCount,
                description: topic.officialNotes || topic.title, // Use officialNotes as description, fallback to title
              } as TopicOption;
            } catch (err) {
              console.error(`Failed to fetch details for topic ${topic.id}:`, err);
              return {
                id: topic.id,
                title: topic.title,
                stageCode: stage.code,
                stageName: stage.name,
                slideCount: 0,
                description: topic.officialNotes || topic.title,
              } as TopicOption;
            }
          })
        );

        // Sort topics by stage sort index, then by stage order
        const sortedTopics = topicsWithSlides.sort((a, b) => {
          const stageA = stages.find((s) => s.code === a.stageCode);
          const stageB = stages.find((s) => s.code === b.stageCode);
          
          if (stageA && stageB) {
            const stageDiff = (stageA.sortIndex || 0) - (stageB.sortIndex || 0);
            if (stageDiff !== 0) return stageDiff;
          }
          
          return a.title.localeCompare(b.title);
        });

        setTopics(sortedTopics);
      } catch (err: any) {
        console.error("Failed to fetch topics:", err);
        setError(err.message || "Failed to load topics. Please try again.");
        setTopics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  const filteredTopics = topics.filter((topic) =>
    topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.stageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.stageCode.toLowerCase().includes(searchQuery.toLowerCase())
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
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
            {filteredTopics.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? `No topics found matching "${searchQuery}"`
                    : "No topics available"}
                </p>
              </div>
            ) : (
              filteredTopics.map((topic) => {
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
              })
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

