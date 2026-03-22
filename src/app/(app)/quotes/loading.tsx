export default function QuotesLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-muted rounded" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-muted rounded-xl" />
      ))}
    </div>
  )
}
