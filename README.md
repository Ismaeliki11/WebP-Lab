# 🧪 WebP Lab Pro — Edición Profesional

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescript.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38b2ac?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Sharp](https://img.shields.io/badge/Sharp-High--Performance-green?style=for-the-badge&logo=sharp)](https://sharp.pixelplumbing.com/)

**WebP Lab** es una potente herramienta web diseñada para la optimización y conversión masiva de imágenes. Sin límites artificiales, centrada en el rendimiento y con una estética premium para profesionales del diseño y desarrollo web.

---

## ✨ Características Principales

### 🚀 Rendimiento Extremo
- **Procesamiento en Paralelo:** Utiliza trabajadores configurables en el backend para manejar lotes de cientos de imágenes simultáneamente.
- **Sin Límites:** No hay cuotas de "créditos" o límites de tamaño falsos; el límite es tu propio hardware.

### 🎨 Editor de Imágenes "Pro"
- **Comparador Antes/Después:** Slider interactivo en tiempo real con aceleración por hardware.
- **Estimación de Escala:** Visualiza el peso final estimado del archivo antes de procesarlo.
- **Ajustes Avanzados:** Brillo, contraste, saturación, rotación, desenfoque y filtros (Sepia, B/N).
- **Control de Metadatos:** Opción para limpiar perfiles EXIF e ICC para una web más rápida.

### 🛠️ Flujo de Trabajo Eficiente
- **Dual Mode:** Cambia entre **Modo Fácil** (ajustes preestablecidos inteligentes) y **Modo Experto** (control granular).
- **Historial de Sesión:** Acceso rápido a tus últimas conversiones y estadísticas de ahorro.
- **Multi-idioma:** Soporte nativo para Español e Inglés.
- **Keyboard Shortcuts:** `Ctrl + Enter` para procesar, `Esc` para cerrar el editor.

---

## 🏗️ Stack Tecnológico

- **Frontend:** Next.js 15 (App Router), Framer Motion, Lucide React.
- **Estilos:** Tailwind CSS v4 con arquitectura de tokens personalizados.
- **Backend:** Node.js API Routes con Sharp (procesamiento de imágenes ultra-rápido).
- **Utilidades:** JSZip para empaquetado automático de resultados.

---

## 🚦 Guía de Inicio Rápido

### Instalación Local

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev
```

El servidor estará disponible en `http://localhost:3000`.

### Variables de Entorno (.env.local)

Puedes configurar los límites de tu instancia:

```env
MAX_INPUT_FILE_MB=0      # Máximo MB por archivo (0 = ilimitado)
MAX_TOTAL_INPUT_MB=0     # Máximo MB total por lote
MAX_BATCH_FILES=250      # Máximo de archivos por petición
TRANSFORM_CONCURRENCY=4  # Hilos paralelos para Sharp
```

---

## 📁 Estructura del Proyecto

- `/src/app/api/transform`: Endpoint principal de procesamiento.
- `/src/components`: UI modular (ImageEditor, Config panels, Stats).
- `/src/lib/image-tools`: Lógica de transformación y validación.

---

## 🔗 Repositorio

Proyecto hospedado en GitHub: [https://github.com/Ismaeliki11/WebP-Lab.git](https://github.com/Ismaeliki11/WebP-Lab.git)

---

## 📄 Licencia

Este proyecto es de código abierto y libre bajo la licencia MIT. Desarrollado por **Ismael** (Ismaeliki11).
