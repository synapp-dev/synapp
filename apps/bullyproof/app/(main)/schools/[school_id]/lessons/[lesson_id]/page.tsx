"use client";

import {
  PresentationTemplate,
  Slide,
} from "@/components/templates/presentation-template";

// Sample lesson slides data
const sampleSlides: Slide[] = [
  {
    id: "1",
    title: "Welcome to Bullyproof",
    content: (
      <div className="space-y-4">
        <p>
          Today we'll learn about building a safe and respectful school
          environment.
        </p>
        <ul className="text-left space-y-2">
          <li>• Understanding bullying behavior</li>
          <li>• Building empathy and respect</li>
          <li>• Creating positive relationships</li>
          <li>• Standing up for others</li>
        </ul>
      </div>
    ),
  },
  {
    id: "2",
    title: "What is Bullying?",
    content: (
      <div className="space-y-4">
        <p className="text-xl font-semibold text-blue-600">
          Bullying is repeated, intentional behavior that hurts someone else.
        </p>
        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">
              Physical Bullying
            </h3>
            <p className="text-sm">Hitting, pushing, taking things</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">
              Verbal Bullying
            </h3>
            <p className="text-sm">Name-calling, teasing, threats</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800 mb-2">
              Social Bullying
            </h3>
            <p className="text-sm">Spreading rumors, excluding others</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Cyber Bullying</h3>
            <p className="text-sm">Online harassment, mean messages</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "3",
    title: "The Impact of Bullying",
    content: (
      <div className="space-y-6">
        <p className="text-lg">Bullying affects everyone involved:</p>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="bg-red-100 p-4 rounded-lg">
            <h3 className="font-bold text-red-800 mb-2">Target</h3>
            <ul className="text-sm space-y-1">
              <li>• Low self-esteem</li>
              <li>• Anxiety & depression</li>
              <li>• Poor school performance</li>
              <li>• Physical health issues</li>
            </ul>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg">
            <h3 className="font-bold text-orange-800 mb-2">Bully</h3>
            <ul className="text-sm space-y-1">
              <li>• Difficulty with relationships</li>
              <li>• Higher risk of substance abuse</li>
              <li>• Legal problems</li>
              <li>• Poor academic outcomes</li>
            </ul>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">Bystanders</h3>
            <ul className="text-sm space-y-1">
              <li>• Feel guilty or helpless</li>
              <li>• Fear becoming targets</li>
              <li>• Learn that bullying is okay</li>
              <li>• Miss learning opportunities</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "4",
    title: "How to Be an Upstander",
    content: (
      <div className="space-y-6">
        <p className="text-xl font-semibold text-green-600">
          An upstander is someone who takes action to stop bullying!
        </p>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What you can do:</h3>
            <ul className="space-y-2 text-left">
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Speak up and say "That's not okay"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Support the person being bullied</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Report bullying to a trusted adult</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Include others in activities</span>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Remember:</h3>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>It's not tattling</strong> when you're trying to help
                someone who's being hurt. It's the right thing to do!
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "5",
    title: "Building a Positive School Culture",
    content: (
      <div className="space-y-6">
        <p className="text-lg">
          Together, we can create a school where everyone feels safe and
          respected.
        </p>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-green-800 mb-4">
              Our School Values
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Respect for all people</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Kindness and empathy</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Inclusion and diversity</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Standing up for what's right</span>
              </li>
            </ul>
          </div>
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-blue-800 mb-4">Your Role</h3>
            <p className="text-sm mb-4">
              Every student has the power to make our school a better place.
              Small acts of kindness can make a big difference!
            </p>
            <div className="bg-white p-3 rounded border-l-4 border-blue-500">
              <p className="text-sm font-medium">
                "Be the change you wish to see in the world." - Mahatma Gandhi
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "6",
    title: "Resources and Support",
    content: (
      <div className="space-y-6">
        <p className="text-lg">
          If you or someone you know is being bullied, help is available.
        </p>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-blue-800">
              Who to Talk To
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Teachers and Counselors</p>
                  <p className="text-sm text-gray-600">
                    Available during school hours
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Parents and Family</p>
                  <p className="text-sm text-gray-600">
                    Your biggest supporters
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Trusted Friends</p>
                  <p className="text-sm text-gray-600">
                    Sometimes talking helps
                  </p>
                </div>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-green-800">Remember</h3>
            <div className="bg-green-50 p-4 rounded-lg">
              <ul className="space-y-2 text-sm">
                <li>• You are not alone</li>
                <li>• It's not your fault</li>
                <li>• You deserve to feel safe</li>
                <li>• Help is always available</li>
              </ul>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm font-medium">
                <strong>Emergency:</strong> If you're in immediate danger, call
                000 or tell a trusted adult right away.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export default function LessonPage() {
  return (
    <PresentationTemplate
      slides={sampleSlides}
      title="Bullyproof Lesson: Building Respect"
    />
  );
}
