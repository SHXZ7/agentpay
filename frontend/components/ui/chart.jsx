"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Theme selector
const THEMES = { light: "", dark: ".dark" }

const ChartContext = React.createContext(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

const ChartContainer = React.forwardRef(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs w-full",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        {children}
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }) => {
  const colorConfig = Object.entries(config || {}).filter(
    ([_, config]) => config?.theme || config?.color,
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig?.theme?.[theme] || itemConfig?.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .filter(Boolean)
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = ({ children, ...props }) => {
  return <div {...props}>{children}</div>
}

const ChartTooltipContent = ({ active, payload, className, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={cn("grid min-w-[8rem] items-start gap-1.5 rounded-xl border border-[#DFD9CE] bg-[#FAF8F5] px-3 py-2 text-xs shadow-xl font-mono", className)}>
      {label && <div className="font-bold text-[#1F2421] mb-1">{label}</div>}
      {payload.map((item, idx) => (
        <div key={idx} className="flex justify-between items-center space-x-2">
          <span className="text-[#6E736D]">{item.name || item.dataKey}:</span>
          <span className="font-bold text-[#1F2421]">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

const ChartLegend = ({ children, className }) => (
  <div className={cn("flex items-center justify-center gap-4 pt-2 text-xs font-mono", className)}>{children}</div>
)

const ChartLegendContent = ({ payload }) => {
  if (!payload?.length) return null
  return (
    <div className="flex items-center justify-center gap-4 text-xs font-mono text-[#6E736D]">
      {payload.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
