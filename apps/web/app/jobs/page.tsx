

import { JobListing } from "./job-listing/job-listing"
export const dynamic = "force-static"

export default function JobsPage() {
  
  return (
    <div>
        <h1 className="mb-8 text-4xl font-bold text-foreground">
          Find Your Next Opportunity
        </h1>
        <div className="grid gap-6">
          <div className="p-6 rounded-lg border bg-card">
            <h2 className="mb-4 text-2xl font-semibold">Featured Jobs</h2>
          </div>
        <JobListing />
        </div>
    </div>
  )
} 