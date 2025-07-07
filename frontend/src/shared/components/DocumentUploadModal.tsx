import React, { useState, useRef } from 'react'
import { documentsAPI } from '../api/documentsAPI'
import { useToast } from './Toast'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog'
import { Upload, FileText } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess?: () => void
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onUploadSuccess 
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [tags, setTags] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

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
      showToast(`File type ${fileExt} not supported. Allowed types: ${allowedTypes.join(', ')}`, 'error')
      return
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      showToast('File too large. Maximum size is 50MB', 'error')
      return
    }

    try {
      setIsUploading(true)
      const tagList = tags.trim() ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : undefined
      const response = await documentsAPI.uploadDocument(file, tagList)
      
      if (response.success) {
        showToast('Document uploaded successfully', 'success')
        // Reset form and close modal
        setTags('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        onClose()
        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } else {
        showToast('Failed to upload document', 'error')
      }
    } catch (error) {
      console.error('Upload failed:', error)
      showToast('Error uploading document', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const onButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload Document</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleChange}
              accept=".csv,.xlsx,.xls,.pdf,.json,.txt,.md"
            />
            
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-500" />
              </div>
              
              <div className="text-gray-600">
                <p className="text-sm font-medium">
                  {dragActive ? 'Drop your file here' : 'Drag and drop your file here'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  or click to browse files
                </p>
              </div>
              
              <div className="text-xs text-gray-500">
                <p>Supported: CSV, Excel, PDF, JSON, TXT, MD</p>
                <p>Maximum size: 50MB</p>
              </div>
            </div>
          </div>

          {/* Tags Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Tags (optional)
            </label>
            <Input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., finance, quarterly, report"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Separate multiple tags with commas
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={onButtonClick} 
            disabled={isUploading}
            className="bg-black hover:bg-gray-800"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DocumentUploadModal 