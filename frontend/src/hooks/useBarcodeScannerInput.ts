import { useEffect, useRef, useCallback } from 'react'

interface UseBarcodeScannerInputOptions {
  onScan: (barcode: string) => void
  enabled?: boolean
  maxTimeBetweenChars?: number
  minBarcodeLength?: number
  barcodePattern?: RegExp
}

/**
 * Hook to detect USB barcode scanner input (keyboard wedge mode)
 *
 * USB barcode scanners work by emulating a keyboard - they "type" the barcode
 * characters very rapidly (typically <50ms between characters) and then send Enter.
 *
 * This hook detects this rapid input pattern and triggers the callback when a
 * valid barcode is scanned, while ignoring normal typing in form fields.
 */
export function useBarcodeScannerInput({
  onScan,
  enabled = true,
  maxTimeBetweenChars = 50,
  minBarcodeLength = 10,
  barcodePattern = /^FFB-\d{6}-[A-Z0-9]{5}$/,
}: UseBarcodeScannerInputOptions) {
  const bufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearBuffer = useCallback(() => {
    bufferRef.current = ''
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      const isEditable =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target.isContentEditable

      // For editable elements, only proceed if it looks like scanner input
      // (very rapid typing)
      const now = Date.now()
      const timeSinceLastKey = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // If typing is slow, clear the buffer (not scanner input)
      if (timeSinceLastKey > 500 && bufferRef.current.length > 0) {
        clearBuffer()
      }

      // Handle Enter key - check if we have a valid barcode
      if (event.key === 'Enter') {
        const barcode = bufferRef.current.trim()

        if (barcode.length >= minBarcodeLength && barcodePattern.test(barcode)) {
          event.preventDefault()
          event.stopPropagation()
          onScan(barcode)
        }

        clearBuffer()
        return
      }

      // Ignore modifier keys - don't clear buffer for these
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) {
        return
      }

      // Only process single characters (guard against undefined key)
      if (!event.key || event.key.length !== 1) {
        return
      }

      // Check if this looks like scanner input (rapid typing)
      const isRapidInput = timeSinceLastKey < maxTimeBetweenChars
      const isFirstChar = bufferRef.current.length === 0

      // For editable elements, only capture if it's clearly scanner input
      if (isEditable && !isRapidInput && !isFirstChar) {
        clearBuffer()
        return
      }

      // Accept alphanumeric characters and hyphens (barcode characters)
      const char = event.key
      if (/^[A-Za-z0-9-]$/.test(char)) {
        // If this is the first character or rapid input, add to buffer
        if (isFirstChar || isRapidInput || bufferRef.current.startsWith('FFB')) {
          bufferRef.current += char.toUpperCase()

          // Set a timeout to process complete barcodes or clear incomplete ones
          timeoutRef.current = setTimeout(() => {
            const barcode = bufferRef.current.trim()
            // If we have a valid barcode when timeout fires, process it
            // (handles scanners that don't send Enter or have delays)
            if (barcode.length >= minBarcodeLength && barcodePattern.test(barcode)) {
              onScan(barcode)
            }
            clearBuffer()
          }, 500)

          // For rapid input in editable fields, prevent the character from being typed
          if (isEditable && isRapidInput && bufferRef.current.length > 3) {
            // Only prevent if we're building what looks like a barcode
            if (bufferRef.current.startsWith('FFB')) {
              event.preventDefault()
            }
          }
        }
      } else {
        // Non-barcode character, clear buffer
        clearBuffer()
      }
    },
    [enabled, onScan, maxTimeBetweenChars, minBarcodeLength, barcodePattern, clearBuffer]
  )

  useEffect(() => {
    if (!enabled) return

    // Use capture phase to intercept before other handlers
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, handleKeyDown])

  return {
    clearBuffer,
  }
}
