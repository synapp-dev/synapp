"use client";

import { useEffect, useRef, useState } from "react";

interface Shape {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  svg: string;
  color?: string;
}

interface AnimatedBackgroundProps {
  className?: string;
}

export function AnimatedBackground({
  className = "",
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<Shape[]>([]);
  const [svgMarkups, setSvgMarkups] = useState<string[]>([]);

  // Fetch SVG markup on mount
  useEffect(() => {
    const shapePaths = [
      "/shapes/circle-orange.svg",
      "/shapes/circle-blue.svg",
      "/shapes/circle-yellow.svg",
      "/shapes/circle-outline.svg",
      "/shapes/circle-outline.svg",
      "/shapes/star.svg",
    ];

    Promise.all(
      shapePaths.map((path) =>
        fetch(path)
          .then((res) => res.text())
          .catch(() => "")
      )
    ).then(setSvgMarkups);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || svgMarkups.length === 0) return;

    const canvas = canvasRef.current;
    const { width, height } = canvas.getBoundingClientRect();

    // Initialize specific shapes with different sizes and speeds
    shapesRef.current = [
      // Large orange circles (2)
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.45,
        speedY: (Math.random() - 0.5) * 0.45,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        scale: 2.4,
        svg: svgMarkups[0] ?? "",
      },
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.675,
        speedY: (Math.random() - 0.5) * 0.675,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.45,
        scale: 1.8,
        svg: svgMarkups[0] ?? "",
      },
      // Medium turquoise circles (2)
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: (Math.random() - 0.5) * 0.6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.45,
        scale: 1.8,
        svg: svgMarkups[1] ?? "",
      },
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.9,
        speedY: (Math.random() - 0.5) * 0.9,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.675,
        scale: 1.35,
        svg: svgMarkups[1] ?? "",
      },
      // Smaller yellow circles (2)
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.75,
        speedY: (Math.random() - 0.5) * 0.75,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.6,
        scale: 1.4,
        svg: svgMarkups[2] ?? "",
      },
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 1.125,
        speedY: (Math.random() - 0.5) * 1.125,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.9,
        scale: 1.05,
        svg: svgMarkups[2] ?? "",
      },
      // Outline circles (4)
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.525,
        speedY: (Math.random() - 0.5) * 0.525,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.375,
        scale: 1.2,
        svg: svgMarkups[3] ?? "",
      },
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.7875,
        speedY: (Math.random() - 0.5) * 0.7875,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.5625,
        scale: 0.9,
        svg: svgMarkups[3] ?? "",
      },
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.675,
        speedY: (Math.random() - 0.5) * 0.675,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.525,
        scale: 0.6,
        svg: svgMarkups[4] ?? "",
      },
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 1.0125,
        speedY: (Math.random() - 0.5) * 1.0125,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.7875,
        scale: 0.45,
        svg: svgMarkups[4] ?? "",
      },
      // Stars (2)
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: (Math.random() - 0.5) * 0.6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.45,
        scale: 0.8,
        svg: svgMarkups[5] ?? "",
      },
      {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.9,
        speedY: (Math.random() - 0.5) * 0.9,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.675,
        scale: 0.6,
        svg: svgMarkups[5] ?? "",
      },
    ];

    const animate = () => {
      shapesRef.current.forEach((shape) => {
        // Update position
        shape.x += shape.speedX;
        shape.y += shape.speedY;
        shape.rotation += shape.rotationSpeed;

        // Bounce off edges
        if (shape.x < 0 || shape.x > width) shape.speedX *= -1;
        if (shape.y < 0 || shape.y > height) shape.speedY *= -1;

        // Keep within bounds
        shape.x = Math.max(0, Math.min(width, shape.x));
        shape.y = Math.max(0, Math.min(height, shape.y));
      });

      // Update DOM
      canvas.innerHTML = shapesRef.current
        .map(
          (shape) => `
            <div
              style="
                position: absolute;
                left: ${shape.x}px;
                top: ${shape.y}px;
                transform: rotate(${shape.rotation}deg) scale(${shape.scale});
                transition: transform 0.1s ease-out;
                pointer-events: none;
                opacity: 0.2;
              "
            >
              ${shape.svg}
            </div>
          `
        )
        .join("");

      requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      shapesRef.current.forEach((shape) => {
        shape.x = Math.min(shape.x, width);
        shape.y = Math.min(shape.y, height);
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [svgMarkups]);

  return (
    <div
      ref={canvasRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    />
  );
}
