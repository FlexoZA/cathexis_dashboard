"use client"

import { Button } from "@/components/ui/button"

interface SectionTabsProps {
  sectionOrder: string[]
  activeSection: string
  sectionChangedMap: Record<string, boolean>
  editableSections: Set<string>
  onChange: (section: string) => void
}

export function SectionTabs({
  sectionOrder,
  activeSection,
  sectionChangedMap,
  editableSections,
  onChange,
}: SectionTabsProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-2 text-sm">
      {sectionOrder.map((key) => (
        <Button
          key={key}
          variant={activeSection === key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(key)}
          className="flex items-center gap-2"
        >
          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
          {editableSections.size > 0 && !editableSections.has(key) && (
            <span className="text-xs text-gray-500">read-only</span>
          )}
          {sectionChangedMap[key] && <span className="text-xs text-orange-700">●</span>}
        </Button>
      ))}
    </div>
  )
}
