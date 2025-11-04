"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

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
      "https://images.unsplash.com/photo-1485083269755-a7b559a4fe5e?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y29uc3RydWN0aW9ufGVufDB8fDB8fHwy&auto=format&fit=crop&q=60&w=400",
    tags: ["Mason", "Plumber", "Electrician"],
    meta: "294 skills",
  },
  {
    title: "Architect",
    category: "Architect",
    image:
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=1200&auto=format&fit=crop",
    tags: ["Design", "Planning", "Blueprints"],
    meta: "210 skills",
  },
  {
    title: "Avocat",
    category: "Lawyer",
    image:
      "https://images.unsplash.com/photo-1662104935883-e9dd0619eaba?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGxhd3llcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=400",
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
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGJlYXV0eXxlbnwwfHwwfHx8Mg%3D%3D&auto=format&fit=crop&q=60&w=400",
    tags: ["Beauty", "Skin", "Spa"],
    meta: "188 skills",
  },
  {
    title: "Mechanic",
    category: "Mechanic",
    image:
      "https://images.unsplash.com/photo-1711386689622-1cda23e10217?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Z2FyYWdlJTIwbWVjaGFuaWN8ZW58MHx8MHx8fDI%3D&auto=format&fit=crop&q=60&w=400",
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
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bGVnYWx8ZW58MHx8MHx8fDI%3D&auto=format&fit=crop&q=60&w=400",
    tags: ["Contracts", "Cases", "Full-time"],
    meta: "Hot",
  },
  {
    title: "Site Engineer",
    category: "Construction",
    image:
      "https://images.unsplash.com/photo-1682063631532-b865521538fa?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzB8fHNpdGUlMjBlbmdpbmVlcnxlbnwwfHwwfHx8Mg%3D%3D&auto=format&fit=crop&q=60&w=400",
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
      "https://images.unsplash.com/photo-1749532125405-70950966b0e5?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cGx1bWJlcnxlbnwwfHwwfHx8Mg%3D%3D&auto=format&fit=crop&q=60&w=400",
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
      "https://images.unsplash.com/photo-1572195577046-2f25894c06fc?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fGRlbGl2ZXJ5fGVufDB8fDB8fHwy&auto=format&fit=crop&q=60&w=400",
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
  const [tab, setTab] = useState<Tab>("jobs");
  const [dir, setDir] = useState<1 | -1>(1);
  const t = useTranslations("Showcase");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const meta = tabMeta[tab];

  const handlePrev = () => {
    setDir(-1);
    setTab((t) => (t === "jobs" ? "tasks" : t === "services" ? "jobs" : "services"));
  };
  const handleNext = () => {
    setDir(1);
    setTab((t) => (t === "jobs" ? "services" : t === "services" ? "tasks" : "jobs"));
  };

  const gridItems = useMemo(() => meta.items.slice(0, 6), [meta.items]);

  const handleClick = (item: ShowcaseItem) => {
    const params = new URLSearchParams();
    params.set("category", item.category);
    router.push(`${meta.path}?${params.toString()}`);
  };

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
              {t(`${tab}Title`)}
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
              {t(`${tab}Subtitle`)}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label={t("prev")}
            onClick={handlePrev}
            className="h-9 w-9 rounded-full border bg-white shadow-sm hover:bg-gray-50"
          >
            {isRtl ? (
              <ArrowRight className="mx-auto h-4 w-4" />
            ) : (
              <ArrowLeft className="mx-auto h-4 w-4" />
            )}
          </button>
          <button
            aria-label={t("next")}
            onClick={handleNext}
            className="h-9 w-9 rounded-full border bg-white shadow-sm hover:bg-gray-50"
          >
            {isRtl ? (
              <ArrowLeft className="mx-auto h-4 w-4" />
            ) : (
              <ArrowRight className="mx-auto h-4 w-4" />
            )}
          </button>
        </div>
      </div>

       {/* Cards Grid */}
       <div className="relative">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={tab}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -dir * 40, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {gridItems.map((item, idx) => (
              <motion.button
                key={`${item.title}-${idx}`}
                onClick={() => handleClick(item)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group cursor-pointer bg-white border border-transparent rounded-xl shadow-md hover:shadow-lg hover:border-primary/50 transition-all duration-300 p-3 text-left flex items-center gap-3"
              >
                {/* Image */}
                <div className="relative w-1/2 aspect-[4/3] overflow-hidden rounded-lg flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className="object-cover rounded-lg"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-base font-semibold line-clamp-1">{item.title}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {item.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground md:text-xs"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground md:text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> 4.85
                    </span>
                    <span>{item.meta}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

export default ShowcaseSwitcher;