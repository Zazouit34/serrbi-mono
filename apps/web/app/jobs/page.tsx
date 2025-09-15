import Link from "next/link";
import { JobListing } from "./job-listing/job-listing";
export const dynamic = "force-static";

export default function JobsPage() {
  return (
    <div className="space-y-4 md:space-y-8">
      <div className="flex flex-col items-center py-0 space-y-4 md:py-16 md:space-y-10">
        <h1 className="pt-4 text-2xl md:text-5xl text-foreground font-outfit">
          Open jobs
        </h1>
        <p className="hidden text-xl text-gray-500 md:block font-outfit">
          Land a job with leading national and international companies.
        </p>
        <p className="text-lg text-gray-500 md:hidden font-outfit">
          Land a job with leading companies.
        </p>
        <div className="flex gap-3 justify-center md:gap-4">
          <Link
            href="/jobs/job-listing/new"
            className="inline-block px-4 py-2 text-sm text-center rounded-lg shadow-sm transition-all duration-300 md:text-base md:px-6 md:py-3 md:shadow-md hover:shadow-lg hover:scale-105 hover:text-gray-800"
            style={{
              boxShadow:
                "-0.5px -0.5px 1px rgba(255, 255, 255, 0.3), 2px 2px 3px rgba(209, 209, 209, 0.6)",
              color: "rgb(80, 80, 80)",
            }}
          >
            Post a Job
          </Link>

          <Link
            href="#"
            className="inline-block px-4 py-2 text-sm text-center rounded-lg shadow-sm transition-all duration-300 md:text-base md:px-6 md:py-3 md:shadow-md hover:shadow-lg hover:scale-105 hover:text-gray-800"
            style={{
              boxShadow:
                "-0.5px -0.5px 1px rgba(255, 255, 255, 0.3), 2px 2px 3px rgba(209, 209, 209, 0.6)",
              color: "rgb(80, 80, 80)",
            }}
          >
            Post Resume
          </Link>
        </div>
      </div>
      <div className="grid gap-6">
        <JobListing />
      </div>
    </div>
  );
}
