export default function ReportsLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-muted rounded" />
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
}
