# Plan: Hardware Barcode Scanner Support

**Status**: Complete
**Created**: 2025-12-12
**Target**: Support USB barcode scanners (e.g., Motorola/Symbol DS9208-SR00004NNWW)

---

## Background

### How USB Barcode Scanners Work

USB barcode scanners like the Motorola/Symbol DS9208 operate in "keyboard wedge" mode:
1. Scanner connects via USB and appears as a standard HID keyboard device
2. When a barcode is scanned, the scanner "types" each character rapidly (typically 20-50ms between characters)
3. After the barcode data, the scanner sends Enter key (configurable, but Enter is default)
4. No special drivers required - works on any OS that supports USB keyboards

### Current Implementation

- Camera-based scanning exists at `/scan` using `react-barcode-scanner`
- Barcode lookup API: `GET /api/clients/barcode/{code}`
- Barcode format: `FFB-YYYYMM-XXXXX` (CODE128)
- No keyboard input handling currently exists

---

## Implementation Plan

### Step 1: Create `useBarcodeScannerInput` Hook

**File**: `frontend/src/hooks/useBarcodeScannerInput.ts`

**Purpose**: Detect and capture keyboard wedge barcode input globally

**Algorithm**:
1. Listen to `keydown` events on `document`
2. Track timing between keystrokes (USB scanners type very fast: <50ms between chars)
3. Accumulate characters in a buffer when rapid typing is detected
4. On Enter key, if buffer looks like a barcode (FFB-* pattern), trigger callback
5. Clear buffer on timeout (300ms of inactivity) or when non-barcode input detected
6. Ignore input when user is focused on text input/textarea elements

**Key Parameters**:
- `onScan: (barcode: string) => void` - callback when valid barcode detected
- `enabled?: boolean` - to enable/disable scanner (default: true)
- `maxTimeBetweenChars?: number` - threshold for rapid typing detection (default: 50ms)
- `minBarcodeLength?: number` - minimum barcode length to consider valid (default: 10)

**Detection Logic**:
```
IF (time since last keystroke < 50ms) AND (char is alphanumeric or hyphen):
  append to buffer
ELSE IF (key is Enter) AND (buffer matches FFB-* pattern):
  trigger onScan callback
  clear buffer
ELSE IF (time since last keystroke > 300ms):
  clear buffer
```

### Step 2: Create Barcode Scanner Context Provider

**File**: `frontend/src/hooks/useBarcodeScanner.tsx`

**Purpose**: Provide global barcode scanner functionality with API integration

**Responsibilities**:
- Wrap `useBarcodeScannerInput` hook
- Handle API lookup when barcode scanned
- Manage scanner state (idle, loading, not-found, error)
- Provide navigation after successful scan
- Show toast notifications for results
- Expose enable/disable control (e.g., disable during form input)

**State**:
- `scannerEnabled: boolean`
- `lastScan: { barcode: string, timestamp: Date, result: 'success' | 'not-found' | 'error' } | null`
- `isProcessing: boolean`

### Step 3: Integrate Provider into App

**File**: `frontend/src/main.tsx`

**Changes**:
- Wrap app with `BarcodeScannerProvider` inside `Auth0Provider`
- Provider only activates when user is authenticated

### Step 4: Add Scanner Status Indicator

**File**: `frontend/src/components/Navbar.tsx`

**Changes**:
- Add small scanner icon in navbar showing scanner status
- Icon states: ready (green pulse), scanning (yellow), disabled (gray)
- Click to toggle scanner on/off
- Tooltip showing last scan result

### Step 5: Update BarcodeScannerPage

**File**: `frontend/src/features/clients/BarcodeScannerPage.tsx`

**Changes**:
- Show that hardware scanner is also available
- Display "Scan with camera or use hardware scanner" message
- Hardware scanner works even on this page (via global hook)

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useBarcodeScannerInput.ts` | Create | Low-level keyboard wedge detection |
| `src/hooks/useBarcodeScanner.tsx` | Create | Context provider with API integration |
| `src/main.tsx` | Modify | Add BarcodeScannerProvider |
| `src/components/Navbar.tsx` | Modify | Add scanner status indicator |
| `src/features/clients/BarcodeScannerPage.tsx` | Modify | Update UI to mention hardware scanner |

---

## Testing Considerations

1. **Without Hardware Scanner**:
   - Can test by typing barcode quickly followed by Enter
   - Or create a test utility that simulates rapid keystrokes

2. **Edge Cases**:
   - User typing in search box (should not trigger)
   - User typing barcode manually in a form (should not trigger)
   - Partial scans (scanner error mid-scan)
   - Multiple rapid scans
   - Non-FFB barcodes (should ignore)

3. **Browser Compatibility**:
   - `keydown` event is universal
   - No special APIs required

---

## Future Enhancements (Out of Scope)

- Audio feedback on successful/failed scan
- Configurable scanner settings (speed threshold, prefix pattern)
- Support for other barcode formats
- Offline scan queue

---

## Acceptance Criteria

1. Hardware USB barcode scanner can scan client barcodes from any authenticated page
2. Successful scan navigates to client detail page
3. Not-found scan shows toast notification
4. Scanner does not interfere with normal keyboard input (forms, search)
5. Scanner status visible in navbar
6. Scanner can be toggled on/off
