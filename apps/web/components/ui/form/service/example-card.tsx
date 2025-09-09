"use client";

import Image from "next/image";
import { MoreHorizontal, Heart, MessageCircle, Send } from "lucide-react";

export default function ServiceCard() {
  return (
    <div className="p-3 mb-4 w-full max-w-xs bg-white rounded-2xl border shadow sm:max-w-sm">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <h3 className="font-semibold text-gray-900">Zaki krita</h3>
          <span className="text-sm text-gray-500">5h</span>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-600 cursor-pointer" />
      </div>

      {/* Image */}
      <div className="mt-3">
        <Image
          src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=center" // replace with your actual image
          alt="Web Design"
          width={400}
          height={400}
          className="object-cover w-full h-48 rounded-xl sm:h-64"
        />
      </div>

      {/* Text */}
      <div className="mt-3">
        <p className="font-medium text-gray-900">
          Looking for a creative web designer!
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-3 text-gray-600">
        <Heart className="w-5 h-5 cursor-pointer" />
        <MessageCircle className="w-5 h-5 cursor-pointer" />
        <Send className="w-5 h-5 cursor-pointer" />
      </div>
    </div>
  );
}
