"use client";
import Image from "next/image";
import { useLocale } from "next-intl";

// Ultra high-quality 4K service-focused images with dark professional aesthetic
const carouselImages = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1671722294182-ed01cbe66bd1?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjN8fEFyY2hpdGVjdCUyMGluJTIwb2ZmaWNlJTIwcGxhbmluZ3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=400",
    alt: "Architect working on blueprints with dramatic lighting",
    width: 320,
    height: 240,
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
    alt: "Legal professional in elegant office setting",
    width: 280,
    height: 350,
  },
  {
    id: 3,
    src: "https://plus.unsplash.com/premium_photo-1682974931688-7e8859add0f8?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZW5naW5lZXJzJTIwd29ya2luZ3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=400",
    alt: "Modern office with cinematic lighting",
    width: 300,
    height: 280,
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1758518730250-9fde74eb4757?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1031",
    alt: "Professional consultant with ambient workspace",
    width: 340,
    height: 320,
  },
  {
    id: 5,
    src: "https://plus.unsplash.com/premium_photo-1663011218145-c1d0c3ba3542?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=870",
    alt: "Male professional in sophisticated setting",
    width: 290,
    height: 220,
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2672&q=80",
    alt: "Developer in atmospheric coding environment",
    width: 310,
    height: 360,
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1562322140-8baeececf3df?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8aGFpciUyMHNhbG9ufGVufDB8fDB8fHww&auto=format&fit=crop&q=60&w=400",
    alt: "Healthcare professional with premium lighting",
    width: 330,
    height: 260,
  },
  {
    id: 8,
    src: "https://plus.unsplash.com/premium_photo-1661884973994-d7625e52631a?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8cGx1bWJlciUyMHdvcmtpbmd8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=400",
    alt: "Designer workspace with moody atmosphere",
    width: 270,
    height: 340,
  },
  {
    id: 9,
    src: "https://images.unsplash.com/photo-1596986952526-3be237187071?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8Y2FyJTIwd29ya3Nob3B8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=400",
    alt: "Computer science professor in a modern classroom",
    width: 350,
    height: 280,
  },
];

interface CarouselMainProps {
  className?: string;
  speed?: number;
  direction?: "left" | "right";
}

export const CarouselMain: React.FC<CarouselMainProps> = ({
  className = "",
  speed = 50,
  direction = "left",
}) => {
  const locale = useLocale();
  const isRtl = locale === "ar";
  // Duplicate images for seamless loop
  const duplicatedImages = [...carouselImages, ...carouselImages];

  return (
    <div
      className={`pt-2 w-full md:pt-8 ${className}`}
      style={{
        overflow: "hidden",
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        width: "100vw",
      }}
    >
      {/* Custom marquee container */}
      <div className="relative custom-marquee-container">
        {/* Gradient overlays - positioned relative to viewport */}
        <div 
          className="custom-marquee-gradient-left w-[50px] md:w-[100px]"
          style={{
            left: "calc(-50vw + 50%)", // Align with viewport edge
          }}
        ></div>
        <div 
          className="custom-marquee-gradient-right w-[50px] md:w-[100px]"
          style={{
            right: "calc(-50vw + 50%)", // Align with viewport edge  
          }}
        ></div>
        
        {/* Scrolling content */}
        <div 
          className="custom-marquee-content"
          style={{
            animationName: isRtl ? "marquee-scroll-rtl" : undefined,
            animationDuration: `${100 - speed}s`, // Convert speed to duration
            animationDirection: direction === "right" ? "reverse" : "normal"
          }}
        >
          {duplicatedImages.map((image, index) => (
            <div key={`${image.id}-${index}`} className="mx-3">
              <div className="rounded-2xl shadow-lg">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  className="object-cover rounded-2xl"
                  priority={index < 4}
                  style={{
                    width: `${image.width}px`,
                    height: `${image.height}px`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CarouselMain;
