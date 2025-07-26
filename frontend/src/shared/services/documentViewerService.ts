import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import type { UserDocument } from '../api/documentsAPI';

export interface DocumentContent {
  type: 'pdf' | 'word' | 'excel' | 'text' | 'csv' | 'unknown';
  content?: string;
  excelData?: {
    sheets: { [key: string]: any[][] };
    sheetNames: string[];
  };
  error?: string;
}

export class DocumentViewerService {
  private static instance: DocumentViewerService;

  public static getInstance(): DocumentViewerService {
    if (!DocumentViewerService.instance) {
      DocumentViewerService.instance = new DocumentViewerService();
    }
    return DocumentViewerService.instance;
  }

  private getAuthToken(): string {
    const storage = localStorage.getItem('quokka-auth-storage');
    if (storage) {
      const authData = JSON.parse(storage);
      return authData.state?.token || '';
    }
    return '';
  }

  public async loadDocumentContent(document: UserDocument): Promise<DocumentContent> {
    try {
      const fileType = document.file_type.toLowerCase();
      
      if (fileType === '.pdf') {
        return await this.loadPdfDocument(document);
      } else if (fileType === '.docx' || fileType === '.doc') {
        return await this.loadWordDocument(document);
      } else if (fileType === '.xlsx' || fileType === '.xls') {
        return await this.loadExcelDocument(document);
      } else if (fileType === '.csv') {
        return await this.loadCsvDocument(document);
      } else if (fileType === '.txt' || fileType === '.md') {
        return await this.loadTextDocument(document);
      } else {
        return {
          type: 'unknown',
          error: `Unsupported file type for preview: ${fileType}`
        };
      }
    } catch (error) {
      console.error('Error loading document content:', error);
      return {
        type: 'unknown',
        error: `Failed to load document content: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async loadPdfDocument(document: UserDocument): Promise<DocumentContent> {
    try {
      const response = await fetch(`/api/documents/${document.id}/content`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Convert ArrayBuffer to Uint8Array for PDF.js
      const uint8Array = new Uint8Array(arrayBuffer);
      
      return {
        type: 'pdf',
        content: uint8Array as any // PDF.js accepts Uint8Array
      };
    } catch (error) {
      console.error('Error loading PDF document:', error);
      return {
        type: 'pdf',
        error: `Failed to load PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async loadWordDocument(document: UserDocument): Promise<DocumentContent> {
    try {
      const response = await fetch(`/api/documents/${document.id}/content`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Log some debug info
      console.log('Word document arrayBuffer size:', arrayBuffer.byteLength);
      
      // Let mammoth library handle format validation instead of manual signature checking
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Title'] => h1.title:fresh",
            "r[style-name='Strong'] => strong"
          ]
        }
      );

      if (result.messages.length > 0) {
        console.warn('Mammoth conversion warnings:', result.messages);
      }

      return {
        type: 'word',
        content: result.value || '<p>Document appears to be empty</p>'
      };
    } catch (error) {
      console.error('Error loading Word document:', error);
      return {
        type: 'word',
        content: `
          <div class="p-6 bg-red-50 rounded-lg border border-red-200">
            <h2 class="text-xl font-bold mb-4 text-red-800">${document.original_filename}</h2>
            <p class="text-red-700 mb-4">Unable to load document content. This might be due to:</p>
            <ul class="list-disc list-inside text-red-600 space-y-1">
              <li>Network connectivity issues</li>
              <li>Document format not supported</li>
              <li>File corruption or invalid format</li>
              <li>Authentication issues</li>
            </ul>
            <div class="mt-4 p-4 bg-blue-50 rounded border-l-4 border-blue-400">
              <p class="text-sm text-blue-800"><strong>Summary:</strong> ${document.summary}</p>
            </div>
            <div class="mt-2 text-xs text-red-500">
              Error: ${error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        `
      };
    }
  }

  private async loadExcelDocument(document: UserDocument): Promise<DocumentContent> {
    try {
      const response = await fetch(`/api/documents/${document.id}/content`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch document: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Log some debug info
      console.log('Excel document arrayBuffer size:', arrayBuffer.byteLength);
      
      // Let XLSX library handle format validation instead of manual signature checking
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellText: true,
        cellDates: true
      });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in Excel document');
      }

      const sheets: { [key: string]: any[][] } = {};
      const sheetNames = workbook.SheetNames;

      sheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        if (worksheet) {
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false
          });
          sheets[sheetName] = jsonData as any[][];
        }
      });

      return {
        type: 'excel',
        excelData: {
          sheets,
          sheetNames
        }
      };
    } catch (error) {
      console.error('Error loading Excel document:', error);
      // Return error information as fallback
      return {
        type: 'excel',
        excelData: {
          sheets: {
            'Error': [
              ['Unable to load Excel file'],
              ['Document:', document.original_filename],
              ['Error:', error instanceof Error ? error.message : 'Unknown error'],
              ['Summary:', document.summary],
              ['Size:', `${Math.round(document.file_size / 1024)} KB`],
              ['Chunks:', document.chunks_count.toString()],
              ['', ''],
              ['Possible causes:'],
              ['- Network connectivity issues'],
              ['- Invalid Excel file format'],
              ['- File corruption'],
              ['- Authentication problems'],
              ['- Backend file path resolution issues'],
              ['', ''],
              ['Debug Info:'],
              ['- API URL:', '/api (proxied)'],
              ['- Document ID:', document.id],
              ['- File Type:', document.file_type]
            ]
          },
          sheetNames: ['Error']
        }
      };
    }
  }

  private async loadTextDocument(document: UserDocument): Promise<DocumentContent> {
    try {
      const response = await fetch(`/api/documents/${document.id}/content`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();

      // Escape HTML to prevent XSS
      const escapeHtml = (unsafe: string) => {
        return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      const escapedText = escapeHtml(text);

      return {
        type: 'text',
        content: `
          <div class="space-y-4">
            <div class="bg-gray-50 p-4 rounded-lg border">
              <h2 class="text-xl font-bold mb-2 text-gray-800">${document.original_filename}</h2>
              <p class="text-sm text-gray-600">Text Document • ${text.length} characters</p>
            </div>
            <div class="bg-white p-6 rounded-lg border">
              <pre class="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">${escapedText}</pre>
            </div>
          </div>
        `
      };
    } catch (error) {
      console.error('Error loading text document:', error);
      return {
        type: 'text',
        content: `
          <div class="p-6 bg-red-50 rounded-lg border border-red-200">
            <h2 class="text-xl font-bold mb-4 text-red-800">${document.original_filename}</h2>
            <p class="text-red-700 mb-4">Unable to load document content.</p>
            <div class="mt-4 p-4 bg-blue-50 rounded border-l-4 border-blue-400">
              <p class="text-sm text-blue-800"><strong>Summary:</strong> ${document.summary}</p>
            </div>
            <div class="mt-2 text-xs text-red-500">
              Error: ${error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        `
      };
    }
  }

  private async loadCsvDocument(document: UserDocument): Promise<DocumentContent> {
    try {
      const response = await fetch(`/api/documents/${document.id}/content`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();
      
      if (!csvText.trim()) {
        throw new Error('CSV file is empty');
      }

      // Parse CSV using a simple parser
      const lines = csvText.split('\n').filter(line => line.trim());
      const data: any[][] = [];
      
      for (const line of lines) {
        // Simple CSV parsing (handles basic cases)
        const row = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        data.push(row);
      }

      if (data.length === 0) {
        throw new Error('No data found in CSV file');
      }

      return {
        type: 'csv',
        excelData: {
          sheets: {
            'CSV Data': data
          },
          sheetNames: ['CSV Data']
        }
      };
    } catch (error) {
      console.error('Error loading CSV document:', error);
      return {
        type: 'csv',
        excelData: {
          sheets: {
            'Error': [
              ['Unable to load CSV file'],
              ['Document:', document.original_filename],
              ['Error:', error instanceof Error ? error.message : 'Unknown error'],
              ['Summary:', document.summary],
              ['Size:', `${Math.round(document.file_size / 1024)} KB`],
              ['Chunks:', document.chunks_count.toString()],
              ['', ''],
              ['Possible causes:'],
              ['- Network connectivity issues'],
              ['- Invalid CSV file format'],
              ['- File corruption'],
              ['- Authentication problems']
            ]
          },
          sheetNames: ['Error']
        }
      };
    }
  }
}