export default function TimeLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-muted rounded" />
      <div className="h-32 bg-muted rounded-xl" />
      <div className="h-28 bg-muted rounded-xl" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 bg-muted rounded-xl" />
      ))}
    </div>
  )
}
