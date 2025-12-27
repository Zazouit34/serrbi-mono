import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@workspace/ui/components/avatar";
import { Mail } from "lucide-react";

type Status = "applying" | "applied" | "pending";

type JobExample = {
  id: number;
  company: string;
  role: string;
  team: string;
  timeAgo: string;
  tags: string[];
  status: Status;
  logoUrl: string;
};

const JOBS: JobExample[] = [
  {
    id: 1,
    company: "Serrbi",
    role: "ML Engineer",
    team: "Machine Learning",
    timeAgo: "Just now",
    tags: ["PyTorch", "MLOps", "AI"],
    status: "applying",
    logoUrl: "/images/logo-hero.png",
  },
  {
    id: 2,
    company: "Stripe",
    role: "Data Analyst",
    team: "Finance",
    timeAgo: "3h",
    tags: ["Analytics", "Python"],
    status: "applied",
    logoUrl: "/images/stripe.png",
  },
  {
    id: 3,
    company: "Microsoft",
    role: "Strategy Partner",
    team: "Corporate",
    timeAgo: "4h",
    tags: ["Strategy", "Leadership"],
    status: "pending",
    logoUrl: "/images/microsoft.png",
  },
];

function statusBadge(status: Status) {
  if (status === "applying") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] md:text-[11px] px-2 md:px-3 py-0.5 md:py-1 rounded-full">
        Applying…
      </Badge>
    );
  }
  if (status === "applied") {
    return (
      <Badge className="bg-black text-white border-black text-[10px] md:text-[11px] px-2 md:px-3 py-0.5 md:py-1 rounded-full">
        Applied
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] md:text-[11px] px-2 md:px-3 py-0.5 md:py-1 rounded-full">
      Pending
    </Badge>
  );
}

export default function AutoApplyExampleResults() {
  return (
    <div className="max-w-md md:max-w-xl lg:max-w-2xl mx-auto">
      <Card className="rounded-2xl border border-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.08)] bg-white">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-3 pb-3">
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl md:rounded-2xl bg-slate-900 flex items-center justify-center flex-shrink-0">
              <Mail className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm md:text-base lg:text-lg font-semibold tracking-tight">
                Auto Apply To Jobs
              </CardTitle>
              <p className="text-[10px] md:text-[11px] text-slate-500">
                Serrbi is applying for you in the background.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] md:text-[11px] px-2 md:px-3 py-0.5 md:py-1 rounded-full whitespace-nowrap self-start md:self-auto">
            967 jobs in queue
          </Badge>
        </CardHeader>

        <CardContent className="space-y-2 md:space-y-3 pt-1">
          {JOBS.map((job) => (
            <div
              key={job.id}
              className="rounded-xl md:rounded-2xl border border-slate-100 bg-slate-50/70 px-2 md:px-3 py-2 md:py-3 flex items-start justify-between gap-2 md:gap-3"
            >
              <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                <Avatar className="h-8 w-8 md:h-9 md:w-9 rounded-lg flex-shrink-0">
                  <AvatarImage src={job.logoUrl} alt={job.company} />
                  <AvatarFallback className="text-xs rounded-lg border border-slate-200">
                    {job.company[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <p className="text-xs md:text-sm font-semibold text-slate-900 truncate">
                      {job.role}
                    </p>
                    <span className="text-[10px] md:text-[11px] text-slate-500 flex-shrink-0">
                      · {job.company}
                    </span>
                  </div>
                  <p className="text-[10px] md:text-[11px] text-slate-500">{job.team}</p>
                  <div className="mt-1.5 md:mt-2 flex flex-wrap gap-1 md:gap-1.5">
                    {job.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="bg-white/80 text-[10px] md:text-[11px] text-slate-600 border-slate-200 px-1.5 md:px-2 py-0 md:py-0.5"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between gap-1 md:gap-0 flex-shrink-0">
                <span className="text-[10px] md:text-[11px] text-slate-400">{job.timeAgo}</span>
                <div className="mt-1 md:mt-2">{statusBadge(job.status)}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

