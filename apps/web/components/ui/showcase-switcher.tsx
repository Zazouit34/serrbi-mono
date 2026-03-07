"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { isSecondaryClient } from "@/lib/domain";

type Tab = "services" | "jobs" | "tasks";

type ShowcaseItem = {
  title: string;
  category: string; // string mapped from enums in schema
  image: string;
  tags: string[];
  meta?: string; // e.g., skills count or time
};

// Item definitions (static data like category and image). Text is translated via i18n.
const servicesDefs = [
  {
    id: "construction",
    category: "ConstructionInstallation",
    image:
      "https://images.unsplash.com/photo-1485083269755-a7b559a4fe5e?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y29uc3RydWN0aW9ufGVufDB8fDB8fHwy&auto=format&fit=crop&q=60&w=400",
  },
  {
    id: "architect",
    category: "ConstructionInstallation",
    image:
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "lawyer",
    category: "LegalFinance",
    image:
      "https://images.unsplash.com/photo-1662104935883-e9dd0619eaba?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGxhd3llcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=400",
  },
  {
    id: "dentist",
    category: "HealthWellness",
    image:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "esthetician",
    category: "BeautyPersonalCare",
    image:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGJlYXV0eXxlbnwwfHwwfHx8Mg%3D%3D&auto=format&fit=crop&q=60&w=400",
  },
  {
    id: "mechanic",
    category: "AutomotiveTransport",
    image:
      "https://images.unsplash.com/photo-1711386689622-1cda23e10217?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Z2FyYWdlJTIwbWVjaGFuaWN8ZW58MHx8MHx8fDI%3D&auto=format&fit=crop&q=60&w=400",
  },
];

const jobsDefs = [
  {
    id: "softwareEngineer",
    category: "Tech",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "financialAnalyst",
    category: "Finance",
    image:
      "https://images.unsplash.com/photo-1518186233392-c232efbf2373?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "restaurantManager",
    category: "Hospitality",
    image:
      "https://images.unsplash.com/photo-1728044849321-4cbffc50cc1d?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "nurse",
    category: "Health",
    image:
      "https://images.unsplash.com/photo-1691139601099-932c01ec198b?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fG51cnNlfGVufDB8fDB8fHwy?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "paralegal",
    category: "Legal",
    image:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bGVnYWx8ZW58MHx8MHx8fDI%3D&auto=format&fit=crop&q=60&w=400",
  },
  {
    id: "siteEngineer",
    category: "Construction",
    image:
      "https://images.unsplash.com/photo-1682063631532-b865521538fa?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzB8fHNpdGUlMjBlbmdpbmVlcnxlbnwwfHwwfHx8Mg%3D%3D&auto=format&fit=crop&q=60&w=400",
  },
];

const tasksDefs = [
  {
    id: "houseCleaning",
    category: "Cleaning",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "fixBathroomLeak",
    category: "Construction",
    image:
      "https://images.unsplash.com/photo-1749532125405-70950966b0e5?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cGx1bWJlcnxlbnwwfHwwfHx8Mg%3D%3D&auto=format&fit=crop&q=60&w=400",
  },
  {
    id: "carDiagnostic",
    category: "Auto",
    image:
      "https://images.unsplash.com/photo-1504222490345-c075b6008014?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8Y2FyJTIwbWVjaGFuaWN8ZW58MHx8MHx8fDI%3D?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "landingPageCopy",
    category: "Tech",
    image:
      "https://images.unsplash.com/photo-1517511620798-cec17d428bc0?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "tutorAlgebra",
    category: "Education",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "foodDelivery",
    category: "Hospitality",
    image:
      "https://images.unsplash.com/photo-1572195577046-2f25894c06fc?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fGRlbGl2ZXJ5fGVufDB8fDB8fHwy&auto=format&fit=crop&q=60&w=400",
  },
];

export function ShowcaseSwitcher() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("jobs");
  const [dir, setDir] = useState<1 | -1>(1);
  const t = useTranslations("Showcase");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const isSecondary = isSecondaryClient();

  const servicesItems: ShowcaseItem[] = useMemo(
    () =>
      servicesDefs.map((d) => ({
        title: t(`items.services.${d.id}.title` as any),
        category: d.category,
        image: d.image,
        tags: [0, 1, 2].map((i) => t(`items.services.${d.id}.tags.${i}` as any)),
        meta: t(`items.services.${d.id}.meta` as any),
      })),
    [t]
  );

  const jobsItems: ShowcaseItem[] = useMemo(
    () =>
      jobsDefs.map((d) => ({
        title: t(`items.jobs.${d.id}.title` as any),
        category: d.category,
        image: d.image,
        tags: [0, 1, 2].map((i) => t(`items.jobs.${d.id}.tags.${i}` as any)),
        meta: t(`items.jobs.${d.id}.meta` as any),
      })),
    [t]
  );

  const tasksItems: ShowcaseItem[] = useMemo(
    () =>
      tasksDefs.map((d) => ({
        title: t(`items.tasks.${d.id}.title` as any),
        category: d.category,
        image: d.image,
        tags: [0, 1, 2].map((i) => t(`items.tasks.${d.id}.tags.${i}` as any)),
        meta: t(`items.tasks.${d.id}.meta` as any),
      })),
    [t]
  );

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

  const effectiveTab: Tab = isSecondary ? "jobs" : tab;
  const meta = tabMeta[effectiveTab];

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
    const paramKey = effectiveTab === "services" ? "serviceCategory" : "category";
    params.set(paramKey, item.category);
    router.push(`${meta.path}?${params.toString()}`);
  };

  return (
    <section className="mx-auto w-full my-18">
      {/* Header */}
      <div className="flex gap-4 justify-between items-start mb-4 md:mb-6">
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
              {t(`${effectiveTab}Title`)}
            </motion.h2>
          </AnimatePresence>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.p
              key={meta.subtitle}
              initial={{ x: dir * 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -dir * 20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-1 max-w-xl text-sm text-muted-foreground"
            >
              {t(`${effectiveTab}Subtitle`)}
            </motion.p>
          </AnimatePresence>
        </div>
        {!isSecondary && (
          <div className="flex gap-2 items-center">
            <button
              aria-label={t("prev")}
              onClick={handlePrev}
              className="w-9 h-9 bg-white rounded-full border shadow-sm hover:bg-gray-50"
            >
              {isRtl ? (
                <ArrowRight className="mx-auto w-4 h-4" />
              ) : (
                <ArrowLeft className="mx-auto w-4 h-4" />
              )}
            </button>
            <button
              aria-label={t("next")}
              onClick={handleNext}
              className="w-9 h-9 bg-white rounded-full border shadow-sm hover:bg-gray-50"
            >
              {isRtl ? (
                <ArrowLeft className="mx-auto w-4 h-4" />
              ) : (
                <ArrowRight className="mx-auto w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

       {/* Cards Grid */}
       <div className="relative">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={effectiveTab}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -dir * 40, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {gridItems.map((item, idx) => (
              <motion.button
                key={`${item.title}-${idx}`}
                onClick={() => handleClick(item)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex gap-3 items-center p-3 text-left bg-white rounded-xl border border-transparent shadow-md transition-all duration-300 cursor-pointer group hover:shadow-lg hover:border-primary/50"
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
                <div className="flex flex-col flex-1 justify-between h-full">
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
                    <span className="inline-flex gap-1 items-center">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> 4.85
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