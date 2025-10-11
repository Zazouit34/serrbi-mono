"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";

type Tab = "services" | "jobs" | "tasks";

type ShowcaseItem = {
  title: string;
  category: string; // string mapped from enums in schema
  image: string;
  tags: string[];
  meta?: string; // e.g., skills count or time
};

const servicesItems: ShowcaseItem[] = [
  {
    title: "Construction",
    category: "Construction",
    image:
      "https://images.unsplash.com/photo-1581090700227-1e37b190418e?q=80&w=1200&auto=format&fit=crop",
    tags: ["Mason", "Plumber", "Electrician"],
    meta: "294 skills",
  },
  {
    title: "Video Editor",
    category: "Tech",
    image:
      "https://images.unsplash.com/photo-1607112812619-182cb1c7bb61?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8dmlkZW8lMjBlZGl0b3J8ZW58MHx8MHx8fDI%3D?q=80&w=1200&auto=format&fit=crop",
    tags: ["SaaS", "Game Design", "Artist"],
    meta: "354 skills",
  },
  {
    title: "Avocat",
    category: "Lawyer",
    image:
      "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?q=80&w=1200&auto=format&fit=crop",
    tags: ["Legal", "Advice", "Contract"],
    meta: "120 skills",
  },
  {
    title: "Dentist",
    category: "Doctor",
    image:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200&auto=format&fit=crop",
    tags: ["Health", "Cleaning", "Care"],
    meta: "879 skills",
  },
  {
    title: "Esthetician",
    category: "Esthetician",
    image:
      "https://images.unsplash.com/photo-1556228578-86f7f1d6d34c?q=80&w=1200&auto=format&fit=crop",
    tags: ["Beauty", "Skin", "Spa"],
    meta: "188 skills",
  },
  {
    title: "Mechanic",
    category: "Mechanic",
    image:
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1200&auto=format&fit=crop",
    tags: ["Auto", "Repair", "Engine"],
    meta: "240 skills",
  },
];

const jobsItems: ShowcaseItem[] = [
  {
    title: "Software Engineer",
    category: "Tech",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop",
    tags: ["React", "TypeScript", "Remote"],
    meta: "New",
  },
  {
    title: "Financial Analyst",
    category: "Finance",
    image:
      "https://images.unsplash.com/photo-1518186233392-c232efbf2373?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=1200&auto=format&fit=crop",
    tags: ["Excel", "Modeling", "Hybrid"],
    meta: "Today",
  },
  {
    title: "Restaurant Manager",
    category: "Hospitality",
    image:
      "https://images.unsplash.com/photo-1728044849321-4cbffc50cc1d?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=1200&auto=format&fit=crop",
    tags: ["Full-time", "Leadership", "On-site"],
    meta: "New",
  },
  {
    title: "Nurse",
    category: "Health",
    image:
      "https://images.unsplash.com/photo-1691139601099-932c01ec198b?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fG51cnNlfGVufDB8fDB8fHwy?q=80&w=1200&auto=format&fit=crop",
    tags: ["Care", "Clinic", "Night"],
    meta: "3d",
  },
  {
    title: "Paralegal",
    category: "Legal",
    image:
      "https://images.unsplash.com/photo-1555374018-13a8994ab246?q=80&w=1200&auto=format&fit=crop",
    tags: ["Contracts", "Cases", "Full-time"],
    meta: "Hot",
  },
  {
    title: "Site Engineer",
    category: "Construction",
    image:
      "https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?q=80&w=1200&auto=format&fit=crop",
    tags: ["On-site", "Senior", "Full-time"],
    meta: "New",
  },
];

const tasksItems: ShowcaseItem[] = [
  {
    title: "House Cleaning",
    category: "Cleaning",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1200&auto=format&fit=crop",
    tags: ["Home", "Hourly", "Today"],
    meta: "$80 budget",
  },
  {
    title: "Fix Bathroom Leak",
    category: "Construction",
    image:
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop",
    tags: ["Plumber", "Urgent", "City"],
    meta: "$120 budget",
  },
  {
    title: "Car Diagnostic",
    category: "Auto",
    image:
      "https://images.unsplash.com/photo-1504222490345-c075b6008014?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8Y2FyJTIwbWVjaGFuaWN8ZW58MHx8MHx8fDI%3D?q=80&w=1200&auto=format&fit=crop",
    tags: ["Garage", "Engine", "Today"],
    meta: "$60 budget",
  },
  {
    title: "Landing Page Copy",
    category: "Tech",
    image:
      "https://images.unsplash.com/photo-1517511620798-cec17d428bc0?q=80&w=1200&auto=format&fit=crop",
    tags: ["Writing", "Remote", "Web"],
    meta: "$150 budget",
  },
  {
    title: "Tutor Algebra I",
    category: "Education",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop",
    tags: ["Evening", "Online", "1h"],
    meta: "$40 budget",
  },
  {
    title: "Food Delivery",
    category: "Hospitality",
    image:
      "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1200&auto=format&fit=crop",
    tags: ["City", "Today", "Tips"],
    meta: "$30 budget",
  },
];

const tabMeta: Record<Tab, { title: string; subtitle: string; items: ShowcaseItem[]; path: string }> = {
  services: {
    title: "Popular Services",
    subtitle: "Check out our top-notch services designed to help you highlight your talents",
    items: servicesItems,
    path: "/services",
  },
  jobs: {
    title: "New Jobs",
    subtitle: "Find your next role across multiple industries and skill levels",
    items: jobsItems,
    path: "/jobs",
  },
  tasks: {
    title: "Available Tasks",
    subtitle: "Pick up quick gigs and short engagements near you",
    items: tasksItems,
    path: "/tasks",
  },
};

export function ShowcaseSwitcher() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("services");
  const [dir, setDir] = useState<1 | -1>(1);

  const meta = tabMeta[tab];

  const handlePrev = () => {
    setDir(-1);
    setTab((t) => (t === "services" ? "tasks" : t === "jobs" ? "services" : "jobs"));
  };
  const handleNext = () => {
    setDir(1);
    setTab((t) => (t === "services" ? "jobs" : t === "jobs" ? "tasks" : "services"));
  };

  const gridItems = useMemo(() => meta.items.slice(0, 4), [meta.items]);

  return (
    <section className="mx-auto my-18 w-full">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4 md:mb-6">
        <div>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.h2
              key={meta.title}
              initial={{ x: dir * 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -dir * 30, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="text-2xl font-semibold md:text-3xl"
            >
              {meta.title}
            </motion.h2>
          </AnimatePresence>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.p
              key={meta.subtitle}
              initial={{ x: dir * 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -dir * 20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-1 text-sm text-muted-foreground max-w-xl"
            >
              {meta.subtitle}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="Previous" onClick={handlePrev} className="h-9 w-9 rounded-full border bg-white shadow-sm hover:bg-gray-50">
            <ArrowLeft className="mx-auto h-4 w-4" />
          </button>
          <button aria-label="Next" onClick={handleNext} className="h-9 w-9 rounded-full border bg-white shadow-sm hover:bg-gray-50">
            <ArrowRight className="mx-auto h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Container */}
      <div className="rounded-2xl border bg-white p-0 shadow-sm">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={tab}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -dir * 40, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 md:grid-cols-2"
          >
            {gridItems.map((item, idx) => (
              <ShowcaseTile
                key={`${item.title}-${idx}`}
                item={item}
                // Row 1: description/image, description/image
                // Row 2: image/description, image/description
                inverted={idx >= 2}
                index={idx}
                total={gridItems.length}
                onClick={() => router.push(`${meta.path}?search=${encodeURIComponent(item.title)}`)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function ShowcaseTile({ item, inverted, index, total, onClick }: { item: ShowcaseItem; inverted?: boolean; index: number; total: number; onClick: () => void }) {
  const isTopRow = index < 2; // md: two columns → top row indices 0,1
  const isLeftCol = index % 2 === 0;
  const isBottomRow = index >= Math.max(total - 2, 0);
  const isNotLastMobile = index !== total - 1;

  // Only draw interior separators so the outer edge shows the container border
  const borders = [
    "border-gray-200",
    isTopRow ? "md:border-b" : "md:border-b-0",
    isLeftCol ? "md:border-r" : "md:border-r-0",
    isNotLastMobile ? "border-b" : "border-b-0", // single-column separators
  ].join(" ");

  // Match container rounding on tiles touching outer edges
  const rounded = [
    index === 0 ? "rounded-t-2xl md:rounded-tr-none" : "",
    index === total - 1 ? "rounded-b-2xl md:rounded-bl-none" : "",
    isTopRow && isLeftCol ? "md:rounded-tl-2xl" : "",
    isTopRow && !isLeftCol ? "md:rounded-tr-2xl" : "",
    isBottomRow && isLeftCol ? "md:rounded-bl-2xl" : "",
    isBottomRow && !isLeftCol ? "md:rounded-br-2xl" : "",
  ].join(" ");
  return (
    <button
      onClick={onClick}
      className={`group grid h-40 w-full grid-cols-2 overflow-hidden bg-white text-left transition-colors hover:bg-gray-50 md:h-52 ${borders} ${rounded}`}
    >
      {/* Text content */}
      <div className={`flex flex-col justify-between p-3 md:p-5 ${inverted ? "order-2" : "order-1"}`}>
        <div>
          <h3 className="text-base font-semibold md:text-lg">{item.title}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t} className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground md:text-xs">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground md:text-xs">
          <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> 4.85</span>
          <span>{item.meta}</span>
        </div>
      </div>

      {/* Image */}
      <div className={`relative ${inverted ? "order-1" : "order-2"} md:rounded-none`}>
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 768px) 50vw, 35vw"
          className="object-cover rounded-none"
        />
      </div>
    </button>
  );
}

export default ShowcaseSwitcher;


