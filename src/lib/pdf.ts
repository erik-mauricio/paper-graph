import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

// Opens a PDF file with pdf.js. Each call reads the file again, because
// pdf.js takes ownership of (and detaches) the buffer it's given.
export async function loadPdf(file: File) {
  return getDocument({ data: await file.arrayBuffer() }).promise
}

let nonce = 0
// A number that is larger every time it's called. Used to order requests.
export function nextNonce(): number {
  return ++nonce
}
