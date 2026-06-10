"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { MessageCircle, ThumbsUp, ThumbsDown, Send, LogIn } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

// Types for comments
interface Comment {
  id: string;
  content: string;
  author: {
    steamId: string;
    username: string;
    avatar: string;
    steamLevel: number;
  };
  timestamp: Date;
  likes: number;
  dislikes: number;
  userLiked?: boolean;
  userDisliked?: boolean;
}

// Dummy data for demonstration
const dummyComments: Comment[] = [
  {
    id: "1",
    content:
      "Great player! I've played with them several times and they're always a good teammate. Solid aim and good game sense.",
    author: {
      steamId: "76561198012345678",
      username: "CS2Pro",
      avatar:
        "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg",
      steamLevel: 45,
    },
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    likes: 12,
    dislikes: 1,
    userLiked: false,
    userDisliked: false,
  },
  {
    id: "2",
    content:
      "Suspicious gameplay patterns. I've reported this player multiple times for potential cheating.",
    author: {
      steamId: "76561198087654321",
      username: "FairPlay",
      avatar:
        "https://avatars.steamstatic.com/0c14d0b8b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0_full.jpg",
      steamLevel: 23,
    },
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    likes: 3,
    dislikes: 8,
    userLiked: false,
    userDisliked: false,
  },
  {
    id: "3",
    content:
      "Really helpful player in competitive matches. Good communication and always positive attitude!",
    author: {
      steamId: "76561198011223344",
      username: "TeamPlayer",
      avatar:
        "https://avatars.steamstatic.com/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t_full.jpg",
      steamLevel: 67,
    },
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    likes: 25,
    dislikes: 0,
    userLiked: false,
    userDisliked: false,
  },
  {
    id: "4",
    content:
      "Average player, nothing special. Sometimes good, sometimes bad. Inconsistent performance.",
    author: {
      steamId: "76561198099887766",
      username: "HonestReview",
      avatar:
        "https://avatars.steamstatic.com/9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4p3q2r1s0t_full.jpg",
      steamLevel: 34,
    },
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    likes: 7,
    dislikes: 3,
    userLiked: false,
    userDisliked: false,
  },
];

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

export function CommentsCard() {
  const [comments, setComments] = useState<Comment[]>(dummyComments);
  const [newComment, setNewComment] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock Steam authentication
  const handleSteamLogin = () => {
    // In a real implementation, this would redirect to Steam OAuth
    setIsAuthenticated(true);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !isAuthenticated) return;

    setIsSubmitting(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newCommentObj: Comment = {
      id: Date.now().toString(),
      content: newComment.trim(),
      author: {
        steamId: "76561198012345678", // Mock Steam ID
        username: "CurrentUser",
        avatar:
          "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg",
        steamLevel: 42,
      },
      timestamp: new Date(),
      likes: 0,
      dislikes: 0,
      userLiked: false,
      userDisliked: false,
    };

    setComments([newCommentObj, ...comments]);
    setNewComment("");
    setIsSubmitting(false);
  };

  const handleLike = (commentId: string) => {
    setComments(
      comments.map((comment) => {
        if (comment.id === commentId) {
          const wasLiked = comment.userLiked;
          const wasDisliked = comment.userDisliked;

          return {
            ...comment,
            likes: wasLiked ? comment.likes - 1 : comment.likes + 1,
            dislikes: wasDisliked ? comment.dislikes - 1 : comment.dislikes,
            userLiked: !wasLiked,
            userDisliked: false,
          };
        }
        return comment;
      })
    );
  };

  const handleDislike = (commentId: string) => {
    setComments(
      comments.map((comment) => {
        if (comment.id === commentId) {
          const wasLiked = comment.userLiked;
          const wasDisliked = comment.userDisliked;

          return {
            ...comment,
            likes: wasLiked ? comment.likes - 1 : comment.likes,
            dislikes: wasDisliked ? comment.dislikes - 1 : comment.dislikes + 1,
            userLiked: false,
            userDisliked: !wasDisliked,
          };
        }
        return comment;
      })
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Comments ({comments.length})
        </CardTitle>
        <CardDescription>
          Share your thoughts about this player. Sign in with Steam to comment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comment Form */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg" />
                <AvatarFallback>CU</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">CurrentUser</span>
                <Badge variant="secondary" className="text-xs">
                  Level 42
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Share your thoughts about this player..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 min-h-[80px]"
                disabled={isSubmitting}
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                className="self-end"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.author.avatar} />
                  <AvatarFallback>
                    {comment.author.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.author.username}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Level {comment.author.steamLevel}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(comment.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(comment.id)}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        comment.userLiked
                          ? "text-green-600"
                          : "text-gray-500 hover:text-green-600"
                      }`}
                    >
                      <ThumbsUp className="h-3 w-3" />
                      {comment.likes}
                    </button>
                    <button
                      onClick={() => handleDislike(comment.id)}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        comment.userDisliked
                          ? "text-red-600"
                          : "text-gray-500 hover:text-red-600"
                      }`}
                    >
                      <ThumbsDown className="h-3 w-3" />
                      {comment.dislikes}
                    </button>
                  </div>
                </div>
              </div>
              <Separator />
            </div>
          ))}
        </div>

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
