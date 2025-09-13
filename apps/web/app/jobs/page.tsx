import Link from "next/link";
import { JobListing } from "./job-listing/job-listing";
export const dynamic = "force-static";

export default function JobsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center py-16 space-y-10">
        <h1 className="text-5xl text-foreground font-outfit">Open jobs</h1>
        <p className="text-xl text-gray-500 font-outfit">
          Land a job with leading national and international companies.
        </p>
        <div className="flex gap-4">
          <Link
            href="/jobs/job-listing/new"
            className="inline-block px-6 py-3 text-center text-black rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 hover:text-gray-800"
            style={{
              boxShadow:
                "-1px -1px 2px rgba(255, 255, 255, 0.3), 3px 3px 5px rgba(209, 209, 209, 0.705)",
              color: "rgb(80, 80, 80)",
            }}
          >
            Post a Job
          </Link>
          <Link
            href="#"
            className="inline-block px-6 py-3 text-center text-black rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 hover:text-gray-800"
            style={{
              boxShadow:
                "-1px -1px 2px rgba(255, 255, 255, 0.3), 3px 3px 5px rgba(209, 209, 209, 0.705)",
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
