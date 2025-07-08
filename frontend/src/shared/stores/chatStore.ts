import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Types
export type Message = {
  id: string
  type: 'user' | 'agent' | 'system' | 'file'
  content: string
  timestamp: Date
  status: 'sending' | 'sent' | 'error'
  error?: string
  intermediateSteps?: any[]
  visualization?: Visualization
  file?: {
    name: string
    size: number
    type: string
  }
}

export interface UploadedFile {
  filename: string
  file_type: string
  size: number
  processed_at: string
  chunks_count: number
  summary: string
}

export type Visualization = {
  url?: string;
  path?: string;
  type: string;
  format?: string;
  base64?: string; // Add base64 property for direct image display
  error?: string;
}

interface ChatState {
  // Chat state
  messages: Message[]
  sessionId: string
  isLoading: boolean
  isTyping: boolean
  error: string | null
  
  // File state
  uploadedFiles: UploadedFile[]
  isUploading: boolean
  
  // UI state
  showIntermediateSteps: boolean
  showFileManager: boolean
  
  // Actions
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
  setTyping: (typing: boolean) => void
  setError: (error: string | null) => void
  
  // File actions
  addUploadedFile: (file: UploadedFile) => void
  removeUploadedFile: (filename: string) => void
  setUploadedFiles: (files: UploadedFile[]) => void
  setUploading: (uploading: boolean) => void
  
  // UI actions
  setShowIntermediateSteps: (show: boolean) => void
  setShowFileManager: (show: boolean) => void
  
  // Session actions
  generateNewSession: () => void
  initializeChat: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      sessionId: '',
      isLoading: false,
      isTyping: false,
      error: null,
      
      uploadedFiles: [],
      isUploading: false,
      
      showIntermediateSteps: false,
      showFileManager: false,
      
      // Chat actions
      addMessage: (message: Message) => {
        set(state => ({
          messages: [...state.messages, message]
        }))
      },
      
      updateMessage: (messageId: string, updates: Partial<Message>) => {
        set(state => ({
          messages: state.messages.map(msg => 
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        }))
      },
      
      clearMessages: () => {
        set({
          messages: [],
          error: null
        })
        get().generateNewSession()
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
      
      setTyping: (typing: boolean) => {
        set({ isTyping: typing })
      },
      
      setError: (error: string | null) => {
        set({ error })
      },
      
      // File actions
      addUploadedFile: (file: UploadedFile) => {
        set(state => ({
          uploadedFiles: [...state.uploadedFiles.filter(f => f.filename !== file.filename), file]
        }))
      },
      
      removeUploadedFile: (filename: string) => {
        set(state => ({
          uploadedFiles: state.uploadedFiles.filter(f => f.filename !== filename)
        }))
      },
      
      setUploadedFiles: (files: UploadedFile[]) => {
        set({ uploadedFiles: files })
      },
      
      setUploading: (uploading: boolean) => {
        set({ isUploading: uploading })
      },
      
      // UI actions
      setShowIntermediateSteps: (show: boolean) => {
        set({ showIntermediateSteps: show })
      },
      
      setShowFileManager: (show: boolean) => {
        set({ showFileManager: show })
      },
      
      // Session actions
      generateNewSession: () => {
        set({ sessionId: crypto.randomUUID() })
      },
      
      initializeChat: () => {
        const state = get()
        
        // Generate session ID if not exists
        if (!state.sessionId) {
          get().generateNewSession()
        }
        
        // Add welcome message if no messages exist
        if (state.messages.length === 0) {
          const welcomeMessage: Message = {
            id: 'welcome',
            type: 'system',
            content: `👋 Welcome to QuokkaAI! I'm your intelligent data analysis assistant.

I can help you with:
🔍 **Web Search** - Find current facts, statistics, and numerical data
📊 **Data Analysis** - Analyze your documents and datasets  
📈 **Visualization** - Create charts and graphs from your data
🤖 **Smart Insights** - Get actionable insights from complex data

What would you like to explore today?`,
            timestamp: new Date(),
            status: 'sent'
          }
          
          set({ messages: [welcomeMessage] })
        }
      }
    }),
    {
      name: 'quokka-chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString() // Serialize dates
        })),
        sessionId: state.sessionId,
        uploadedFiles: state.uploadedFiles,
        showIntermediateSteps: state.showIntermediateSteps
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Deserialize dates
          state.messages = state.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }
      }
    }
  )
) 