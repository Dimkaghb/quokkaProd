import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chatAPI, type ChatThread, type ChatMessage, type UserDocument } from '../api/chatAPI'
import { useLanguageStore } from './languageStore'

// Helper function to generate thread title from message content
const generateThreadTitle = (message: string): string => {
  if (!message || !message.trim()) {
    return "Новый чат"
  }
  
  const trimmedMessage = message.trim()
  const words = trimmedMessage.split(' ').filter(word => word.length > 0)
  
  let title: string
  if (words.length <= 5) {
    title = trimmedMessage
  } else {
    title = words.slice(0, 5).join(" ")
  }
  
  // Truncate to 50 characters if needed
  if (title.length > 50) {
    title = title.substring(0, 47) + "..."
  }
  
  return title
}

// Helper function to check if title is default
const isDefaultTitle = (title: string): boolean => {
  return title === "Новый чат" || title === "New Chat"
}

interface ThreadState {
  // Current state
  threads: ChatThread[]
  currentThread: ChatThread | null
  selectedThreadId: string | null
  messages: ChatMessage[]
  documents: UserDocument[]
  selectedDocuments: string[]
  
  // UI state
  isLoading: boolean
  isLoadingMessages: boolean
  isLoadingDocuments: boolean
  isSendingMessage: boolean
  error: string | null
  
  // Actions - Thread management
  loadThreads: () => Promise<void>
  loadUserThreads: () => Promise<void>
  createThread: (firstMessage: string, selectedDocs?: string[]) => Promise<ChatThread | null>
  selectThread: (threadId: string) => Promise<void>
  setSelectedThread: (threadId: string | null) => void
  clearSelectedThread: () => void
  updateThreadTitle: (threadId: string, title: string) => Promise<void>
  deleteThread: (threadId: string) => Promise<void>
  clearCurrentThread: () => void
  
  // Actions - Message management
  loadMessages: (threadId: string) => Promise<void>
  sendMessage: (content: string, selectedDocs?: string[]) => Promise<void>
  
  // Actions - Document management
  loadDocuments: () => Promise<void>
  uploadDocument: (file: File, tags?: string[]) => Promise<void>
  updateThreadDocuments: (threadId: string, documentIds: string[]) => Promise<void>
  setSelectedDocuments: (documentIds: string[]) => void
  
  // Actions - UI state
  setError: (error: string | null) => void
  clearError: () => void
  clearAll: () => void
}

export const useThreadStore = create<ThreadState>()(
  persist(
    (set, get) => ({
      // Initial state
      threads: [],
      currentThread: null,
      selectedThreadId: null,
      messages: [],
      documents: [],
      selectedDocuments: [],
      
      isLoading: false,
      isLoadingMessages: false,
      isLoadingDocuments: false,
      isSendingMessage: false,
      error: null,

      // Thread management actions
      loadThreads: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await chatAPI.getThreads()
          set({ 
            threads: response.threads.sort((a, b) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            ),
            isLoading: false 
          })
        } catch (error: any) {
          console.error('Failed to load threads:', error)
          set({ 
            error: error?.response?.data?.detail || 'Failed to load chat threads',
            isLoading: false 
          })
        }
      },

      loadUserThreads: async () => {
        await get().loadThreads()
      },

      setSelectedThread: (threadId: string | null) => {
        set({ selectedThreadId: threadId })
        if (threadId) {
          get().selectThread(threadId)
        } else {
          get().clearCurrentThread()
        }
      },

      clearSelectedThread: () => {
        set({ selectedThreadId: null })
        get().clearCurrentThread()
      },

      createThread: async (firstMessage: string, selectedDocs?: string[]) => {
        set({ isLoading: true, error: null })
        try {
          // Get current language from language store
          const currentLanguage = useLanguageStore.getState().language
          
          const response = await chatAPI.createThread({
            first_message: firstMessage,
            selected_documents: selectedDocs || [],
            language: currentLanguage
          })
          
          if (response.success && response.thread) {
            // Generate proper title from first message
            let threadTitle = response.thread.title
            if (isDefaultTitle(threadTitle)) {
              threadTitle = generateThreadTitle(firstMessage)
            }
            
            // Update the thread with proper title
            const updatedThread = { ...response.thread, title: threadTitle }
            
            // Add new thread to the beginning of the list
            set(state => ({
              threads: [updatedThread, ...state.threads],
              currentThread: updatedThread,
              selectedThreadId: updatedThread.id,
              selectedDocuments: updatedThread.selected_documents,
              isLoading: false
            }))
            
            // Load messages for the new thread
            await get().loadMessages(response.thread.id)
            
            return updatedThread
          } else {
            throw new Error(response.message || 'Failed to create thread')
          }
        } catch (error: any) {
          console.error('Failed to create thread:', error)
          set({ 
            error: error?.response?.data?.detail || 'Failed to create chat thread',
            isLoading: false 
          })
          return null
        }
      },

      selectThread: async (threadId: string) => {
        const { threads } = get()
        const thread = threads.find(t => t.id === threadId)
        
        if (thread) {
          set({ 
            currentThread: thread,
            selectedThreadId: threadId,
            selectedDocuments: thread.selected_documents,
            error: null 
          })
          await get().loadMessages(threadId)
        } else {
          set({ error: 'Thread not found' })
        }
      },

      updateThreadTitle: async (threadId: string, title: string) => {
        try {
          const response = await chatAPI.updateThread(threadId, { title })
          
          if (response.success && response.thread) {
            set(state => ({
              threads: state.threads.map(t => 
                t.id === threadId ? response.thread! : t
              ),
              currentThread: state.currentThread?.id === threadId 
                ? response.thread! 
                : state.currentThread
            }))
          }
        } catch (error: any) {
          console.error('Failed to update thread title:', error)
          set({ error: error?.response?.data?.detail || 'Failed to update thread title' })
        }
      },

      deleteThread: async (threadId: string) => {
        set({ isLoading: true, error: null })
        try {
          await chatAPI.deleteThread(threadId)
          
          set(state => {
            const newThreads = state.threads.filter(t => t.id !== threadId)
            const newCurrentThread = state.currentThread?.id === threadId 
              ? null 
              : state.currentThread
            const newSelectedThreadId = state.selectedThreadId === threadId 
              ? null 
              : state.selectedThreadId
            
            return {
              threads: newThreads,
              currentThread: newCurrentThread,
              selectedThreadId: newSelectedThreadId,
              messages: newCurrentThread ? state.messages : [],
              isLoading: false
            }
          })
        } catch (error: any) {
          console.error('Failed to delete thread:', error)
          set({ 
            error: error?.response?.data?.detail || 'Failed to delete thread',
            isLoading: false 
          })
          throw error
        }
      },

      clearCurrentThread: () => {
        set({
          currentThread: null,
          messages: [],
          selectedDocuments: [],
          error: null
        })
      },

      // Message management actions
      loadMessages: async (threadId: string) => {
        set({ isLoadingMessages: true, error: null })
        try {
          const response = await chatAPI.getMessages(threadId)
          set({ 
            messages: response.messages,
            isLoadingMessages: false 
          })
        } catch (error: any) {
          console.error('Failed to load messages:', error)
          set({ 
            error: error?.response?.data?.detail || 'Failed to load messages',
            isLoadingMessages: false 
          })
        }
      },

      sendMessage: async (content: string, selectedDocs?: string[]) => {
        const { currentThread } = get()
        if (!currentThread) {
          set({ error: 'No thread selected' })
          return
        }

        set({ isSendingMessage: true, error: null })
        
        // Check if this is the first user message
        const isFirstUserMessage = get().messages.filter(m => m.role === 'user').length === 0
        
        // Add optimistic user message
        const tempUserMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          thread_id: currentThread.id,
          user_id: currentThread.user_id,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
          metadata: selectedDocs ? { selected_documents: selectedDocs } : undefined
        }
        
        set(state => ({
          messages: [...state.messages, tempUserMessage]
        }))

        try {
          const response = await chatAPI.sendMessage(currentThread.id, {
            content,
            selected_documents: selectedDocs || get().selectedDocuments
          })

          if (response.success) {
            // Replace temp message and add assistant response
            set(state => {
              const newMessages = state.messages.filter(m => m.id !== tempUserMessage.id)
              const messagesToAdd = []
              
              if (response.user_message) {
                messagesToAdd.push(response.user_message)
              }
              if (response.assistant_message) {
                messagesToAdd.push(response.assistant_message)
              }
              
              return {
                messages: [...newMessages, ...messagesToAdd]
              }
            })

            // Update thread message count and title if it's the first user message
            set(state => {
              let updatedTitle = currentThread.title
              
              // If this was the first user message and title is still default, update it
              if (isFirstUserMessage && isDefaultTitle(currentThread.title)) {
                updatedTitle = generateThreadTitle(content)
              }
              
              return {
                threads: state.threads.map(t => 
                  t.id === currentThread.id 
                    ? { ...t, title: updatedTitle, message_count: t.message_count + 2, updated_at: new Date().toISOString() }
                    : t
                ),
                currentThread: { ...currentThread, title: updatedTitle }
              }
            })
          } else {
            throw new Error(response.message || 'Failed to send message')
          }
        } catch (error: any) {
          console.error('Failed to send message:', error)
          
          // Remove optimistic message and show error
          set(state => ({
            messages: state.messages.filter(m => m.id !== tempUserMessage.id),
            error: error?.response?.data?.detail || 'Failed to send message'
          }))
        } finally {
          set({ isSendingMessage: false })
        }
      },

      // Document management actions
      loadDocuments: async () => {
        console.log('threadStore: Starting to load documents...')
        set({ isLoadingDocuments: true, error: null })
        try {
          const response = await chatAPI.getDocuments()
          console.log('threadStore: Documents loaded successfully:', response)
          set({ 
            documents: response.documents,
            isLoadingDocuments: false 
          })
        } catch (error: any) {
          console.error('threadStore: Failed to load documents:', error)
          set({ 
            error: error?.response?.data?.detail || 'Failed to load documents',
            isLoadingDocuments: false 
          })
        }
      },

      uploadDocument: async (file: File, tags?: string[]) => {
        set({ isLoadingDocuments: true, error: null })
        try {
          const response = await chatAPI.uploadDocument(file, tags)
          
          if (response.success && response.document) {
            set(state => ({
              documents: [response.document!, ...state.documents],
              isLoadingDocuments: false
            }))
          } else {
            throw new Error(response.message || 'Failed to upload document')
          }
        } catch (error: any) {
          console.error('Failed to upload document:', error)
          set({ 
            error: error?.response?.data?.detail || 'Failed to upload document',
            isLoadingDocuments: false 
          })
        }
      },

      updateThreadDocuments: async (threadId: string, documentIds: string[]) => {
        try {
          await chatAPI.updateThreadDocuments(threadId, documentIds)
          
          // Update local state
          set(state => ({
            threads: state.threads.map(t => 
              t.id === threadId 
                ? { ...t, selected_documents: documentIds }
                : t
            ),
            currentThread: state.currentThread?.id === threadId 
              ? { ...state.currentThread, selected_documents: documentIds }
              : state.currentThread,
            selectedDocuments: state.currentThread?.id === threadId 
              ? documentIds 
              : state.selectedDocuments
          }))
        } catch (error: any) {
          console.error('Failed to update thread documents:', error)
          set({ error: error?.response?.data?.detail || 'Failed to update thread documents' })
        }
      },

      setSelectedDocuments: (documentIds: string[]) => {
        set({ selectedDocuments: documentIds })
      },

      // UI state actions
      setError: (error: string | null) => {
        set({ error })
      },

      clearError: () => {
        set({ error: null })
      },

      clearAll: () => {
        set({
          threads: [],
          currentThread: null,
          messages: [],
          documents: [],
          selectedDocuments: [],
          isLoading: false,
          isLoadingMessages: false,
          isLoadingDocuments: false,
          isSendingMessage: false,
          error: null
        })
      },
    }),
    {
      name: 'quokka-thread-storage',
      partialize: (state) => ({
        // Only persist essential data, not loading states
        currentThread: state.currentThread,
        selectedDocuments: state.selectedDocuments,
      }),
    }
  )
)

export default useThreadStore