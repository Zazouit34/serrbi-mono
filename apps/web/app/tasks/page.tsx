import { TaskListing } from "./task-listing/task-listing";
import Link from "next/link";
import { useTranslations } from "next-intl";
export const dynamic = "force-static";

export default function TasksPage() {
  const t = useTranslations("TasksPage");
  return (
    <div className="space-y-4 md:space-y-8">
      <div className="flex flex-col items-center py-0 space-y-4 md:py-16 md:space-y-10">
        <h1 className="pt-4 text-2xl md:text-5xl text-foreground font-outfit">
          {t("title")}
        </h1>
        <p className="text-lg text-gray-500 md:text-xl font-outfit">
          {t("subtitle")}
        </p>
        <div className="flex justify-center">
          <Link
            href="/tasks/task-listing/new"
            className="inline-block px-4 py-2 text-sm text-center rounded-lg shadow-sm transition-all duration-300 md:text-base md:px-6 md:py-3 md:shadow-md hover:shadow-lg hover:scale-105 hover:text-gray-800"
            style={{
              boxShadow:
                "-0.5px -0.5px 1px rgba(255, 255, 255, 0.3), 2px 2px 3px rgba(209, 209, 209, 0.6)",
              color: "rgb(80, 80, 80)",
            }}
          >
            {t("postTask")}
          </Link>
        </div>
      </div>
      <div className="grid gap-6">
        <TaskListing />
      </div>
    </div>
  );
}
