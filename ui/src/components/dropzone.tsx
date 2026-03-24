import { useCallback, useState } from 'react'
import type { DragEvent } from 'react'

interface DropzoneProps {
  onFiles: (files: File[]) => void
  accept?: string
  children: React.ReactNode
  className?: string
}

export function Dropzone({ onFiles, accept, children, className = '' }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files: File[] = []
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
    } else {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        files.push(e.dataTransfer.files[i])
      }
    }

    if (files.length > 0) {
      const imageFiles = accept
        ? files.filter((f) => accept.split(',').some((ext) => f.name.toLowerCase().endsWith(ext.trim())))
        : files
      onFiles(imageFiles)
    }
  }, [onFiles, accept])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative ${className} ${isDragging ? 'ring-2 ring-accent ring-inset' : ''}`}
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 bg-accent/5 border-2 border-dashed border-accent z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-background/90 px-6 py-3 shadow-lg">
            <span className="text-ui text-[13px] text-accent">Drop files to upload</span>
          </div>
        </div>
      )}
    </div>
  )
}
