export const dynamic = "force-static"

export default function ProjectsPage() {
  return (
    <div>
      
        <h1 className="mb-8 text-4xl font-bold text-foreground">
          Showcase Projects
        </h1>
        <div className="grid gap-6">
          <div className="p-6 rounded-lg border bg-card">
            <h2 className="mb-4 text-2xl font-semibold">Featured Projects</h2>
            <p className="text-muted-foreground">
              Explore amazing projects from our community.
            </p>
          </div>
        </div>
    </div>
  )
} 