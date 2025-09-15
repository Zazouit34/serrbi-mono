"use client"

import { useState } from "react"
import { Textarea } from "@workspace/ui/components/textarea"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

const solidColors = ["#ff75c3", "#ffa647", "#70e2ff", "#0ba360"]
const gradients = [
  "linear-gradient(to top left,#f953c6,#b91d73)",
  "linear-gradient(to top left,#00c6ff,#0072ff)",
  "linear-gradient(to top left,#F00000,#DC281E)",
  "linear-gradient(to top left,#8a2be2,#0000cd,#228b22,#ccff00)",
]
const allBackgrounds = [...solidColors, ...gradients]

interface PostEditorProps {
  description: string
  onChange: (val: string) => void
  bgStyle?: string
  onBgChange: (val?: string) => void
}

export function PostEditor({
  description,
  onChange,
  bgStyle,
  onBgChange,
}: PostEditorProps) {
  const [bgIndex, setBgIndex] = useState<number | null>(
    bgStyle ? allBackgrounds.indexOf(bgStyle) : null
  )

  const next = () =>
    setBgIndex((prev) => {
      const newIndex =
        prev === null ? 0 : (prev + 1) % allBackgrounds.length
      onBgChange(allBackgrounds[newIndex])
      return newIndex
    })

  const prev = () =>
    setBgIndex((prev) => {
      const newIndex =
        prev === null
          ? allBackgrounds.length - 1
          : (prev - 1 + allBackgrounds.length) % allBackgrounds.length
      onBgChange(allBackgrounds[newIndex])
      return newIndex
    })

  const background = bgIndex !== null ? allBackgrounds[bgIndex] : undefined

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div
        className={cn(
          "flex justify-center items-center p-4 w-full rounded-md transition-all min-h-[150px]",
          "text-lg font-bold text-center"
        )}
        style={{
          background: background || "transparent",
          color: background ? "white" : "black",
        }}
      >
        {description || "Start typing your task description..."}
      </div>

      {/* Textarea */}
      <Textarea
        placeholder="Write something..."
        value={description}
        onChange={(e) => onChange(e.target.value)}
        className="resize-none"
      />

      {/* Background Carousel */}
      <div className="flex gap-2 items-center">
        <Button variant="outline" size="icon" onClick={prev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex overflow-hidden flex-1 gap-2 justify-center">
          {allBackgrounds.map((bg, idx) => (
            <div
              key={idx}
              onClick={() => {
                setBgIndex(idx)
                onBgChange(allBackgrounds[idx])
              }}
              className={cn(
                "h-10 w-10 rounded-md cursor-pointer border-2",
                bgIndex === idx ? "border-black" : "border-transparent"
              )}
              style={{ background: bg }}
            />
          ))}
        </div>

        <Button variant="outline" size="icon" onClick={next}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
