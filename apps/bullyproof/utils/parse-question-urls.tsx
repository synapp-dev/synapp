import React from "react";
import Link from "next/link";

/**
 * Extracts URL tags from question text.
 * Tags are in the format [URL:name] where name is the tag identifier.
 * 
 * @param questionText - The question text containing URL tags
 * @returns Array of unique tag names found in the text
 */
export function extractUrlTags(questionText: string): string[] {
  const tagRegex = /\[URL:([^\]]+)\]/g;
  const tags = new Set<string>();
  let match;

  while ((match = tagRegex.exec(questionText)) !== null) {
    tags.add(match[1]);
  }

  return Array.from(tags);
}

/**
 * Renders question text with URL tags replaced by clickable links.
 * 
 * @param questionText - The question text containing URL tags
 * @param questionUrls - Object mapping tag names to URLs
 * @returns React element with clickable links
 */
export function renderQuestionWithUrls(
  questionText: string,
  questionUrls?: Record<string, string> | null
): React.ReactNode {
  if (!questionUrls || Object.keys(questionUrls).length === 0) {
    return questionText;
  }

  const tagRegex = /\[URL:([^\]]+)\]/g;
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(questionText)) !== null) {
    // Add text before the tag
    if (match.index > lastIndex) {
      parts.push(questionText.substring(lastIndex, match.index));
    }

    const tagName = match[1];
    const url = questionUrls[tagName];

    if (url) {
      // Create a clickable link with blue styling
      parts.push(
        <Link
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {tagName}
        </Link>
      );
    } else {
      // If URL not found, just show the tag name without brackets
      parts.push(tagName);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last tag
  if (lastIndex < questionText.length) {
    parts.push(questionText.substring(lastIndex));
  }

  // If no tags were found, return the original text
  if (parts.length === 0) {
    return questionText;
  }

  return <>{parts}</>;
}

/**
 * Renders question text with URL tags replaced by clickable links as HTML string.
 * 
 * @param questionText - The question text containing URL tags
 * @param questionUrls - Object mapping tag names to URLs
 * @returns HTML string with clickable links
 */
export function renderQuestionWithUrlsAsHtml(
  questionText: string,
  questionUrls?: Record<string, string> | null
): string {
  if (!questionUrls || Object.keys(questionUrls).length === 0) {
    return questionText;
  }

  const tagRegex = /\[URL:([^\]]+)\]/g;
  let result = questionText;
  let match;

  // Replace tags with HTML links
  while ((match = tagRegex.exec(questionText)) !== null) {
    const tagName = match[1];
    const url = questionUrls[tagName];

    if (url) {
      // Escape HTML in tag name and URL
      const escapedTagName = tagName
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      const escapedUrl = url
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      
      const linkHtml = `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">${escapedTagName}</a>`;
      result = result.replace(match[0], linkHtml);
    } else {
      // If URL not found, just show the tag name without brackets
      result = result.replace(match[0], tagName);
    }
  }

  return result;
}
