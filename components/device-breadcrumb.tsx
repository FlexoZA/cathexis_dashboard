"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"

type BreadcrumbItem = {
  label: string
  href?: string
}

interface DeviceBreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function DeviceBreadcrumb({ items, className }: DeviceBreadcrumbProps) {
  return (
    <div className={`flex items-center gap-1 text-sm text-gray-600 flex-wrap ${className || ''}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={index} className="flex items-center gap-1 min-w-0">
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-gray-900 truncate max-w-[180px] sm:max-w-xs">
                {item.label}
              </Link>
            ) : (
              <span className={`truncate max-w-[180px] sm:max-w-xs ${isLast ? 'text-gray-900 font-medium' : ''}`}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}

