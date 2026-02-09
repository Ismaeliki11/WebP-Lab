# WebP Lab Pro — Enterprise Image Optimization Suite

An advanced web-based image processing engine focused on high-performance batch transformations, featuring real-time optimization previews and no artificial constraints.

---

## Overview

WebP Lab is a professional-grade tool designed for web developers and designers who require granular control over image optimization. Built with Next.js and the Sharp processing library, it delivers near-native performance for heavy batch workloads.

## Key Technical Features

### High-Performance Processing
- **Asynchronous Batch Execution:** Leverages backend multi-threading for concurrent image processing.
- **Hardware Acceleration:** Real-time UI updates utilizing CSS `will-change` properties for smooth interaction during preview adjustments.
- **Raw Processing:** No server-side limits on file dimensions or batch size (configurable via infrastructure settings).

### Professional Image Editor
- **Hardware-Accelerated Comparison:** Interactive split-screen slider for instant visual QA between source and optimized output.
- **Dynamic Size Estimation:** Real-time feedback on expected output file size based on current transformation parameters.
- **Granular Controls:** Professional adjustments for luminance, contrast, saturation, and chromatic aberration.
- **Metadata Management:** Configurable stripping of EXIF, ICC profiles, and other non-essential image metadata.

### Workflow & Productivity
- **Dual Interface Modes:** Quick-access "Smart Presets" for common tasks and "Expert Mode" for full parameter control.
- **Session Persistence:** Persistent state management for user preferences, language settings, and conversion history.
- **Keyboard Integration:** Global shortcuts implemented for core actions (e.g., `Ctrl+Enter` for execution).

## Technical Stack

- **Framework:** Next.js 15 (App Router Architecture)
- **Image Engine:** Sharp (High-performance Node.js image processing)
- **UI Architecture:** Tailwind CSS v4, Framer Motion (Optimized layout animations)
- **Type Safety:** 100% TypeScript implementation

## Deployment & Local Development

### Installation

```bash
npm install
npm run dev
```

### Environment Configuration

Instance limits can be tuned via `.env.local`:

```env
MAX_INPUT_FILE_MB=0      # Per-file size limit (0 = unlimited)
MAX_TOTAL_INPUT_MB=0     # Total batch size limit
MAX_BATCH_FILES=250      # Maximum concurrent file handling
TRANSFORM_CONCURRENCY=4  # Sharp engine thread count
```

## Repository Information

Official repository: [https://github.com/Ismaeliki11/WebP-Lab.git](https://github.com/Ismaeliki11/WebP-Lab.git)

## License

MIT License. Developed by Ismael (Ismaeliki11).
