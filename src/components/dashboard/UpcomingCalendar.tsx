import Link from 'next/link'
import { Calendar } from 'lucide-react'

interface Assignment {
  crewName: string
  projectId: string
  projectName: string
  startDate: string
  endDate: string | null
}

interface Props {
  assignments: Assignment[]
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function UpcomingCalendar({ assignments }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build next 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })

  function assignmentsForDay(day: Date) {
    return assignments.filter((a) => {
      const start = new Date(a.startDate)
      start.setHours(0, 0, 0, 0)
      const end = a.endDate ? new Date(a.endDate) : null
      if (end) end.setHours(23, 59, 59, 999)
      return day >= start && (!end || day <= end)
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Upcoming Schedule (2 Weeks)</h2>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {days.map((day) => {
            const dayAssignments = assignmentsForDay(day)
            const isToday = day.getTime() === today.getTime()
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            return (
              <div key={day.toISOString()}
                className={`w-24 flex-shrink-0 rounded-lg border ${isToday ? 'border-primary bg-primary/5' : 'border-border bg-card'} ${isWeekend ? 'opacity-60' : ''} p-2`}>
                <p className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {DAY_LABELS[day.getDay()]} {day.getMonth() + 1}/{day.getDate()}
                </p>
                {dayAssignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50">-</p>
                ) : (
                  <div className="space-y-1">
                    {dayAssignments.map((a, i) => (
                      <Link key={i} href={`/projects/${a.projectId}`}
                        className="block text-xs text-foreground bg-primary/10 rounded px-1.5 py-0.5 truncate hover:bg-primary/20 transition-colors"
                        title={`${a.crewName}: ${a.projectName}`}>
                        {a.projectName}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
