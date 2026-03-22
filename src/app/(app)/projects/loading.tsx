export default function ProjectsLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="h-9 w-32 bg-muted rounded-md" />
      </div>
      <div className="h-10 bg-muted rounded-md" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-20 bg-muted rounded-xl" />
      ))}
    </div>
  )
}
