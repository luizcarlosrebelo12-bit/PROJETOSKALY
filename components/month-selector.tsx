'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MONTHS } from '@/lib/types'

interface MonthSelectorProps {
  year: number
  month: number
  onChange: (year: number, month: number) => void
}

export function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  const handlePrevMonth = () => {
    if (month === 1) {
      onChange(year - 1, 12)
    } else {
      onChange(year, month - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 12) {
      onChange(year + 1, 1)
    } else {
      onChange(year, month + 1)
    }
  }

  const handleToday = () => {
    const now = new Date()
    onChange(now.getFullYear(), now.getMonth() + 1)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex min-w-[180px] items-center justify-center text-lg font-semibold">
          {MONTHS[month - 1]} {year}
        </div>
        <Button variant="outline" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="ghost" size="sm" onClick={handleToday}>
        Hoje
      </Button>
    </div>
  )
}
