import { useMemo } from 'react';

interface HabitLog {
  date: string;
  value: number;
}

interface ContributionGraphProps {
  logs: HabitLog[];
  weeks?: number;
  maxValue?: number;
}

export function ContributionGraph({ logs, weeks = 12, maxValue }: ContributionGraphProps) {

  const { grid, months, calculatedMax } = useMemo(() => {
    const today = new Date();
    const totalDays = weeks * 7;
    
    // Create a map of date -> value for quick lookup
    const logMap = new Map<string, number>();
    logs.forEach(log => logMap.set(log.date, log.value));
    
    // Find max value if not provided
    const max = maxValue || Math.max(...logs.map(l => l.value), 1);
    
    // Generate grid data (7 rows for days, columns for weeks)
    const gridData: { date: string; value: number; dayOfWeek: number }[][] = [];
    const monthLabels: { month: string; column: number }[] = [];
    
    let lastMonth = -1;
    
    // Start from (totalDays - 1) days ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);
    
    // Adjust to start from Sunday
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);
    
    for (let week = 0; week < weeks + 1; week++) {
      const weekData: { date: string; value: number; dayOfWeek: number }[] = [];
      
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7 + day);
        
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const value = logMap.get(dateStr) || 0;
        const currentMonth = currentDate.getMonth();
        
        // Track month changes for labels
        if (currentMonth !== lastMonth && day === 0) {
          monthLabels.push({
            month: currentDate.toLocaleDateString('en-US', { month: 'short' }),
            column: week,
          });
          lastMonth = currentMonth;
        }
        
        // Only include dates up to today
        if (currentDate <= today) {
          weekData.push({
            date: dateStr,
            value,
            dayOfWeek: day,
          });
        }
      }
      
      if (weekData.length > 0) {
        gridData.push(weekData);
      }
    }
    
    return { grid: gridData, months: monthLabels, calculatedMax: max };
  }, [logs, weeks, maxValue]);

  const getColor = (value: number) => {
    if (value === 0) {
      return 'bg-[var(--surface-subtle)]';
    }
    
    const intensity = Math.min(value / calculatedMax, 1);
    
    if (intensity <= 0.25) {
      return 'bg-[var(--success)] opacity-25';
    } else if (intensity <= 0.5) {
      return 'bg-[var(--success)] opacity-50';
    } else if (intensity <= 0.75) {
      return 'bg-[var(--success)] opacity-75';
    } else {
      return 'bg-[var(--success)]';
    }
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="overflow-x-auto pb-1" role="img" aria-label={`${weeks} week habit activity heatmap`}>
      <div className="inline-block min-w-fit">
        {/* Month labels */}
        <div className="flex ml-8 mb-1">
          {months.map((m, i) => (
            <div
              key={i}
              className="font-mono text-[11px] text-[var(--ink-muted)]"
              style={{ 
                position: 'relative',
                left: `${m.column * 14}px`,
                width: 0,
                whiteSpace: 'nowrap'
              }}
            >
              {m.month}
            </div>
          ))}
        </div>
        
        {/* Grid with day labels */}
        <div className="flex">
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] mr-1">
            {dayLabels.map((day, i) => (
              <div
                key={day}
                className="flex h-[12px] items-center justify-end pr-1 font-mono text-[10px] text-[var(--ink-muted)]"
                style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Contribution squares */}
          <div className="flex gap-[2px]">
            {grid.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[2px]">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                  const dayData = week.find(d => d.dayOfWeek === dayIndex);
                  
                  if (!dayData) {
                    return (
                      <div
                        key={dayIndex}
                        className="w-[12px] h-[12px] rounded-sm opacity-0"
                      />
                    );
                  }
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`w-[12px] h-[12px] rounded-sm transition-colors cursor-default ${getColor(dayData.value)}`}
                      title={`${dayData.date}: ${dayData.value}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2">
          <span className="mr-1 text-xs text-[var(--ink-muted)]">Less</span>
          <div className="h-[12px] w-[12px] rounded-sm bg-[var(--surface-subtle)]" />
          <div className="h-[12px] w-[12px] rounded-sm bg-[var(--success)] opacity-25" />
          <div className="h-[12px] w-[12px] rounded-sm bg-[var(--success)] opacity-50" />
          <div className="h-[12px] w-[12px] rounded-sm bg-[var(--success)] opacity-75" />
          <div className="h-[12px] w-[12px] rounded-sm bg-[var(--success)]" />
          <span className="ml-1 text-xs text-[var(--ink-muted)]">More</span>
        </div>
      </div>
    </div>
  );
}
