# WebP Lab — Professional Image Optimization Suite

WebP Lab is an advanced web-based image processing platform designed to provide full control over the conversion and optimization of visual assets. It centralizes professional editing tools and cutting-edge compression algorithms in an intuitive and fluid interface.

---

## Project Purpose

The primary goal of WebP Lab is to provide web designers and developers with a secure and powerful environment to prepare images for the modern web. Unlike conventional online tools, this platform allows for local batch processing of large files, ensuring privacy and removing size or quantity restrictions.

---

## Key Features

### 1. Intelligent Multi-Format Conversion
*   Full support for WebP, AVIF, JPEG, and PNG.
*   Real-time file size impact estimation before download.
*   Automatic transparency detection and compatibility alerts.

### 2. Dual Work Modes
*   Easy Mode (Smart Presets): Preconfigured profiles for specific goals (Fast Web, Social Media, Max Quality). Ideal for users seeking speed without technical complexities.
*   Expert Mode (Manual Control): Absolute control over compression parameters, chroma subsampling, metadata, and advanced filters.

### 3. Professional Editing Engine
*   Color Adjustments: Brightness, contrast, saturation, gamma, and hue.
*   Stylized Filters: Grayscale, sepia, blur, and sharpening.
*   Transformation: Precision rotation, horizontal/vertical flip.
*   Smart Crop: Entropy-based algorithm to automatically identify and preserve the image's center of interest.

### 4. Automation and Watermarking
*   Dynamic Watermarking: Batch apply text watermarks with control over opacity, size, position, and repeating patterns.
*   SEO Naming Patterns: Dynamic name generator using tags like [name], [width], [height], [format], and [date].

### 5. Efficient Workflow
*   Batch Processing: Upload multiple files and process them in a single asynchronous pipeline.
*   Flexible Download Options: Individual downloads, ZIP packaging, or direct saving to local folders (via File System Access API).
*   Session History: Persistent log of achieved savings and completed tasks.

---

## Technical Stack

This application uses a modern technology stack to ensure maximum performance:

*   Framework: Next.js (React 19) with App Router.
*   Image Processing: Sharp (the gold standard in Node.js for high performance).
*   Styling: Vanilla CSS with Tailwind CSS v4 support for dynamic utilities.
*   Animations: Framer Motion for a fluid and reactive user experience.
*   Iconography: Lucide React.
*   Packaging: JSZip for client-side compressed file management.

---

## Installation and Setup

### Prerequisites
1.  Node.js: Version 18.x or higher is required.
2.  Package Manager: npm (comes with Node.js) or yarn/pnpm.

### 1. Clone the Repository
```bash
git clone https://github.com/Ismaeliki11/WebP-Lab.git
cd WebP-Lab
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory. You can use the provided `.env.example` as a template:
```bash
cp .env.example .env.local
```

Available variables:
*   `MAX_INPUT_FILE_MB`: Threshold for individual file size (0 for unlimited).
*   `MAX_TOTAL_INPUT_MB`: Limit for the entire batch size (0 for unlimited).
*   `MAX_BATCH_FILES`: Maximum number of files processed per request.
*   `TRANSFORM_CONCURRENCY`: Number of concurrent workers for the Sharp engine.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Contributing

While this project is under a restrictive license, feedback and bug reports are welcome.
*   For bug reports, please open an issue in the repository.
*   Modifications for personal use are encouraged as per the license terms.
*   Contributions that involve redistribution are not permitted unless explicitly authorized by the author.

---

## License

This project is licensed under a **Custom Personal and Educational Use License**.
*   Personal use and modification are allowed.
*   Commercial use and redistribution are strictly prohibited.

For more details, please see the [LICENSE](./LICENSE) file.

---
Developed by Ismael (Ismaeliki11) - 2026.
