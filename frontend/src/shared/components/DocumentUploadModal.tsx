import React, { useState, useRef } from 'react'
import { useThreadStore } from '../stores/threadStore'

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ isOpen, onClose }) => {
  const { uploadDocument, isLoadingDocuments } = useThreadStore()
  const [dragActive, setDragActive] = useState(false)
  const [tags, setTags] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = async (files: FileList) => {
    const file = files[0]
    
    // Validate file type
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.pdf', '.json', '.txt', '.md']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(fileExt)) {
      alert(`File type ${fileExt} not supported. Allowed types: ${allowedTypes.join(', ')}`)
      return
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 50MB')
      return
    }

    try {
      const tagList = tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined
      await uploadDocument(file, tagList)
      
      // Reset form and close modal
      setTags('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const onButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Upload Document</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Upload Area */}
        <div className="space-y-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleChange}
              accept=".csv,.xlsx,.xls,.pdf,.json,.txt,.md"
            />
            
            <div className="space-y-3">
              <svg 
                className="w-12 h-12 mx-auto text-gray-400"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                />
              </svg>
              
              <div className="text-gray-300">
                <p className="text-sm font-medium">
                  {dragActive ? 'Drop your file here' : 'Drag and drop your file here'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  or{' '}
                  <button
                    onClick={onButtonClick}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    browse files
                  </button>
                </p>
              </div>
              
              <div className="text-xs text-gray-500">
                <p>Supported: CSV, Excel, PDF, JSON, TXT, MD</p>
                <p>Maximum size: 50MB</p>
              </div>
            </div>
          </div>

          {/* Tags Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags (optional)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., finance, quarterly, report"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white 
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
                       focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple tags with commas
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white 
                       rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onButtonClick}
              disabled={isLoadingDocuments}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 
                       disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isLoadingDocuments ? 'Uploading...' : 'Select File'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentUploadModal 