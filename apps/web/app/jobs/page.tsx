import Link from "next/link";
import { JobListing } from "./job-listing/job-listing";
export const dynamic = "force-static";

export default function JobsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center py-10 space-y-18">
        <h1 className="text-4xl text-foreground font-outfit">
          Open jobs
        </h1>
        <div className="flex gap-4">
          <Link 
            href="/jobs/job-listing/new"
             className="inline-block px-6 py-3 text-center text-white bg-black rounded-full transition-colors hover:bg-gray-800"
          >
            Post a Job
          </Link>
          <Link 
            href="#" 
            className="inline-block px-6 py-3 text-center text-white bg-black rounded-full transition-colors hover:bg-gray-800"
          >
            Post Your CV
          </Link>
        </div>
      </div>
      <div className="grid gap-6">
        <JobListing />
      </div>
    </div>
  );
}
