import React, {
  useRef,
  useState,
  useEffect,
  ReactNode,
  CSSProperties,
} from "react";
import { cn } from "@workspace/ui/lib/utils";
import brandColors from "../../lib/brandColors.json";

/**
 * Props for ThreeDCard component.
 */
export interface ThreeDCardProps {
  /**
   * Brand for the card (steam, leetify, faceit). Determines border color.
   */
  brand: "steam" | "leetify" | "faceit";
  /**
   * If true, disables the 3D/parallax effect.
   */
  isStatic?: boolean;
  /**
   * Strength of the shine effect (0-1).
   */
  shineStrength?: number;
  /**
   * If true, shows pointer cursor on hover.
   */
  cursorPointer?: boolean;
  /**
   * Optional click handler.
   */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  /**
   * Additional style for the card container.
   */
  style?: CSSProperties;
  /**
   * Card content.
   */
  children?: ReactNode;
}

/**
 * Modern 3D Card component with parallax/shine effect, using Tailwind v4.
 * Fully customizable, accepts arbitrary children.
 */
export const ThreeDCard: React.FC<ThreeDCardProps> = ({
  brand,
  isStatic = false,
  shineStrength = 0.001,
  cursorPointer = false,
  onClick,
  style,
  children,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rootSize, setRootSize] = useState({ width: 350, height: 200 });
  const [isOnHover, setIsOnHover] = useState(false);
  const [containerStyle, setContainerStyle] = useState<CSSProperties>({});
  const [, setShineStyle] = useState<CSSProperties>({});
  const [layersTransform, setLayersTransform] = useState<CSSProperties[]>([]);
  const [dynamicShineOverlayStyle, setDynamicShineOverlayStyle] =
    useState<CSSProperties>({});

  // Update card size on mount
  useEffect(() => {
    if (!isStatic && cardRef.current) {
      setRootSize({
        width: cardRef.current.clientWidth || 350,
        height: cardRef.current.clientHeight || 200,
      });
    }
  }, [isStatic]);

  // 3D/parallax logic (stronger effect)
  const handleMove = (pageX: number, pageY: number) => {
    if (!cardRef.current) return;
    const layerCount = React.Children.count(children) || 1;
    const { width, height } = rootSize;
    const offsets = cardRef.current.getBoundingClientRect();
    const x = pageX - offsets.left - window.scrollX;
    const y = pageY - offsets.top - window.scrollY;
    // Centered values from -0.5 to 0.5
    const xRel = x / width - 0.5;
    const yRel = y / height - 0.5;
    // Dramatic rotation multipliers
    const rotateY = xRel * 16; // degrees
    const rotateX = -yRel * 4; // degrees
    // For shine
    const arad = Math.atan2(y - height / 2, x - width / 2);
    const rawAngle = (arad * 180) / Math.PI - 90;
    const angle = rawAngle < 0 ? rawAngle + 360 : rawAngle;
    // Shine opacity
    const shineOpacity = Math.max(
      0.05,
      Math.min(1, (y / height) * shineStrength + 0.05)
    );

    setContainerStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)${isOnHover ? " scale3d(1.07,1.07,1.07)" : ""}`,
      transition: isOnHover
        ? "transform 0.15s cubic-bezier(.25,.8,.25,1)"
        : "transform 0.3s cubic-bezier(.25,.8,.25,1)",
      willChange: "transform",
    });
    setShineStyle({
      opacity: shineOpacity,
      zIndex: 8,
      pointerEvents: "none",
      transition: "opacity 0.15s cubic-bezier(.25,.8,.25,1)",
    });
    setLayersTransform(
      Array.from({ length: layerCount }).map((_, idx) => ({
        transform: `translateX(${xRel * layerCount * ((idx * 1) / 0.9)}px) translateY(${yRel * layerCount * ((idx * 1) / 0.9)}px)${isOnHover ? " scale(1.04)" : ""}`,
        zIndex: 4,
        filter: isOnHover
          ? "drop-shadow(0 4px 24px rgba(0,0,0,0.10))"
          : undefined,
        transition:
          "transform 0.15s cubic-bezier(.25,.8,.25,1), filter 0.15s cubic-bezier(.25,.8,.25,1)",
      }))
    );
    setDynamicShineOverlayStyle({
      background: `linear-gradient(${angle}deg, rgba(255,255,255,${shineOpacity}) 0%, rgba(255,255,255,0) 50%)`,
      zIndex: 9,
      pointerEvents: "none",
      transition: "background 0.15s cubic-bezier(.25,.8,.25,1)",
      borderRadius: "inherit",
      position: "absolute",
      inset: 0,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isStatic) return;
    handleMove(e.pageX, e.pageY);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isStatic) return;
    if (e.touches.length > 0) {
      handleMove(e.touches[0]?.pageX ?? 0, e.touches[0]?.pageY ?? 0);
    }
  };
  const handleEnter = () => {
    if (isStatic) return;
    setIsOnHover(true);
  };
  const handleLeave = () => {
    if (isStatic) return;
    setIsOnHover(false);
    setContainerStyle({});
    setShineStyle({});
    setLayersTransform([]);
    setDynamicShineOverlayStyle({});
  };

  // Compose children with transforms
  const renderedLayers = React.Children.map(children, (child, idx) => {
    if (React.isValidElement(child)) {
      const childWithStyle = child as React.ReactElement<{
        style?: React.CSSProperties;
      }>;
      const safeIdx = typeof idx === "number" ? idx : 0;
      const safeLayersTransform = Array.isArray(layersTransform)
        ? layersTransform
        : [];
      return React.cloneElement(childWithStyle, {
        style: {
          ...((childWithStyle.props?.style as React.CSSProperties) ?? {}),
          ...(safeLayersTransform[safeIdx] || {}),
        },
      });
    }
    return child;
  });

  return (
    <div className="flex transition-all duration-200 ease-out">
      <div
        ref={cardRef}
        onClick={onClick}
        style={{
          // Only keep transform, zIndex, etc. No borderColor here
          borderColor: brandColors[brand],
          ...containerStyle,
          ...style,
        }}
        className={cn(
          "rounded-xl relative w-full h-fit transition-all duration-200 ease-out",
          isOnHover
            ? "border-2 border-opacity-100"
            : "border-0 border-opacity-25",
          cursorPointer && "cursor-pointer"
        )}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onTouchMove={handleTouchMove}
        onTouchStart={handleEnter}
        onTouchEnd={handleLeave}
      >
        {/* Shadow */}
        <div
          className="absolute top-[5%] left-[5%] right-[5%] bottom-[5%] rounded-xl transition-all duration-200 ease-out"
          style={{
            zIndex: 0,
            boxShadow: isOnHover
              ? "0 60px 120px 0 rgba(14, 21, 47, 0.45), 0 24px 48px 0 rgba(14, 21, 47, 0.45)"
              : "0 8px 30px rgba(14, 21, 47, 0.6)",
            transition: "box-shadow 0.2s cubic-bezier(.25,.8,.25,1)",
          }}
        />
        {/* Shine (subtle, slightly tinted overlay) */}
        <div
          className="absolute top-0 left-0 right-0 bottom-0 rounded-xl pointer-events-none"
          style={{ zIndex: 8 }}
        >
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={dynamicShineOverlayStyle}
          />
        </div>
        {/* Layers */}
        <div
          className="relative w-full h-full overflow-hidden rounded-xl"
          style={{
            transformStyle: "preserve-3d",
            zIndex: 2,
          }}
        >
          {renderedLayers}
        </div>
      </div>
    </div>
  );
};

export default ThreeDCard;
