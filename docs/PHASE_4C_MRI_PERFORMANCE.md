# Phase 4C MRI Performance Baseline (§44)

**Status:** NOT_MEASURED on device. Values below are header-measured constants
(MEASURED), arithmetic estimates (ESTIMATED), or explicitly UNKNOWN — never
presented as device results.

## Dataset (MEASURED from file header/bytes, 2026-09-27)

- Volume: `colin27_t1_tal_lin.nii` — 28,436,900 bytes on disk
- Voxel dimensions: 181 × 217 × 181 = 7,109,317 voxels
- Bit depth: float32 (4 bytes/voxel) → 28,437,268 bytes uncompressed payload
- Archive: `mni_colin27_1998_nifti.zip` — 24,250,681 bytes
- Renderer: none exercised (headless Node only)
- Device / browser: UNKNOWN (no browser harness, no physical device)

## Slice/texture arithmetic (ESTIMATED)

- Largest cross-section: 217 × 181 = 39,277 px → R8 texture ≈ 39 KB/slice
- Resident slices: ≤3 (LRU) → ≈ 118 KB texture total (ESTIMATED)
- Resident volume: 1 max → 28.4 MB CPU-side Float32 after decode (MEASURED size)
- iPad budget check: 28.4 MB + 0.1 MB ≪ 110 MB discipline, lazy-only, never at startup

## Latencies / frame rate / resident memory / GPU texture

- Slice latency: NOT_MEASURED
- Frame rate: NOT_MEASURED
- Resident memory (device): UNKNOWN
- GPU texture (device): UNKNOWN
- Browser rendering: MRI_BROWSER_VALIDATION_PENDING
- iPadOS: MRI_IPADOS_VALIDATION_PENDING
