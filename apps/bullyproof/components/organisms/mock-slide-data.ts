import { SlideData } from "./slide-renderer";

/**
 * Mock slide data for testing the delivery modes without backend integration
 */
export function getMockSlides(lessonId: string): SlideData[] {
  return [
    {
      id: `${lessonId}-slide-1`,
      kind: "text",
      orderIndex: 0,
      textHtml: "<h1>Welcome to Bullyproof</h1><p>This is a lesson about building resilience and understanding conflict resolution.</p>",
      effectiveNotes: "Start with a warm welcome. Make eye contact with students.",
    },
    {
      id: `${lessonId}-slide-2`,
      kind: "text",
      orderIndex: 1,
      textHtml: "<h2>Learning Objectives</h2><ul><li>Understand what bullying is</li><li>Learn strategies to respond to bullying</li><li>Develop empathy and resilience</li></ul>",
      effectiveNotes: "Review objectives clearly. Ask if anyone has questions.",
    },
    {
      id: `${lessonId}-slide-3`,
      kind: "image",
      orderIndex: 2,
      imageUrl: "https://via.placeholder.com/800x600?text=Bullyproof+Image",
      effectiveNotes: "Discuss the image. What do students see? How does it make them feel?",
    },
    {
      id: `${lessonId}-slide-4`,
      kind: "text",
      orderIndex: 3,
      textHtml: "<h2>What is Bullying?</h2><p>Bullying is repeated, unwanted aggressive behavior that involves a real or perceived power imbalance.</p>",
      effectiveNotes: "Define clearly. Give examples. Encourage discussion.",
    },
    {
      id: `${lessonId}-slide-5`,
      kind: "video",
      orderIndex: 4,
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      videoStartS: 0,
      videoEndS: 30,
      effectiveNotes: "Play video. Pause for discussion at key moments.",
    },
    {
      id: `${lessonId}-slide-6`,
      kind: "text",
      orderIndex: 5,
      textHtml: "<h2>Strategies for Responding</h2><ul><li>Stay calm</li><li>Walk away</li><li>Tell a trusted adult</li><li>Support others who are being bullied</li></ul>",
      effectiveNotes: "Practice these strategies. Role-play scenarios if time permits.",
    },
    {
      id: `${lessonId}-slide-7`,
      kind: "text",
      orderIndex: 6,
      textHtml: "<h2>Key Takeaways</h2><p>Remember: Everyone deserves respect. We can all make a difference by being kind and standing up for others.</p>",
      effectiveNotes: "Summarize key points. Open floor for final questions.",
    },
  ];
}

