'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ExportButtons() {
  const handleExportBooks = () => {
    if (confirm('确定要导出书单吗？')) {
      window.location.href = '/api/export?type=books'
    }
  }

  const handleExportActions = () => {
    if (confirm('确定要导出行动清单吗？')) {
      window.location.href = '/api/export?type=actions'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExportBooks}>
        <Download className="w-4 h-4 mr-1" />导出书单
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportActions}>
        <Download className="w-4 h-4 mr-1" />导出行动
      </Button>
    </div>
  )
}