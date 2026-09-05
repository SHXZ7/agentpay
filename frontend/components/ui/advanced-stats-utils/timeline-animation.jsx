'use client'
import React from 'react'
import { cn } from '@/lib/utils'

export function TimelineAnimation({
  children,
  className,
  animationNum = 1,
  timelineRef
}) {
  return (
    <div
      className={cn(
        'transition-all duration-700 ease-out transform',
        className
      )}
      style={{
        animationDelay: `${animationNum * 120}ms`
      }}
    >
      {children}
    </div>
  )
}
