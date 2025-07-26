import React, { useState, useRef } from 'react'
import { documentsAPI } from '../api/documentsAPI'
import { useToast } from './Toast'
import { useLanguageStore } from '../stores/languageStore'
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
  const { t } = useLanguageStore()
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
      showToast(t('upload.fileTypeNotSupported', { fileExt, allowedTypes: allowedTypes.join(', ') }), 'error')
      return
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      showToast(t('upload.fileTooLarge'), 'error')
      return
    }

    try {
      setIsUploading(true)
      const tagList = tags.trim() ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : undefined
      const response = await documentsAPI.uploadDocument(file, tagList)
      
      if (response.success) {
        showToast(t('upload.documentUploaded'), 'success')
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
        showToast(t('upload.uploadFailed'), 'error')
      }
    } catch (error) {
      console.error('Upload failed:', error)
      showToast(t('upload.uploadError'), 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const onButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>{t('upload.uploadDocument')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
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
                  {dragActive ? t('upload.dropFileHere') : t('upload.dragDropFile')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('upload.orClickBrowse')}
                </p>
              </div>
              
              <div className="text-xs text-gray-500">
                <p>{t('upload.supportedFormats')}</p>
                <p>{t('upload.maxSize')}</p>
              </div>
            </div>
          </div>

          {/* Tags Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('upload.tagsOptional')}
            </label>
            <Input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('upload.tagsPlaceholder')}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              {t('upload.tagsHelp')}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={onButtonClick} 
            disabled={isUploading}
            className="bg-black hover:bg-gray-800"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {t('upload.uploading')}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {t('upload.uploadFile')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DocumentUploadModal 