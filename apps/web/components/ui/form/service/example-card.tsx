"use client";

import Image from "next/image";
import { MapPin, Star } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export function ExampleServiceCard({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-xs cursor-pointer", className)}>
      {/* Image Section */}
      <div className="overflow-hidden relative w-full rounded-xl shadow-md">
        <Image
          src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=600&fit=crop"
          alt="Service provider"
          width={400}
          height={300}
          className="object-cover w-full h-60"
        />

        {/* Favorite Icon */}
        <button className="absolute top-2 right-2 p-1 rounded-full bg-white/70 hover:bg-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.121 19.071a4.5 4.5 0 010-6.364L12 5.828l6.879 6.879a4.5 4.5 0 01-6.364 6.364L12 17.414l-1.879 1.879a4.5 4.5 0 01-6.364 0z"
            />
          </svg>
        </button>

        {/* Glass Overlay */}
        <div
          className="flex absolute right-0 bottom-0 left-0 flex-col px-3 py-2 rounded-t-md rounded-b-xl backdrop-blur-md bg-black/30"
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Salma Benjelloun
              </h3>
              <p className="text-xs text-gray-200">Avocat</p>
            </div>

            {/* Rating */}
            <div className="flex gap-1 items-center text-sm font-medium text-white">
              <Star className="w-3.5 h-3.5 text-gray-200 fill-gray-200" />
              4.8 (21)
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div
        className="flex justify-between items-center px-3 py-4 pt-5 -mt-2 text-sm text-gray-700 bg-white rounded-b-xl shadow"
      >
        {/* Location */}
        <div className="flex gap-1 items-center">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="font-medium">Paris</span>
        </div>

        {/* Type */}
        <div className="flex gap-1 items-center">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
          <span className="font-medium">Individual</span>
        </div>

        {/* Price */}
        <span className="text-base font-semibold text-gray-900">150 Dh</span>
      </div>
    </div>
  );
}
