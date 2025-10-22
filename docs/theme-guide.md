# Retro-Comic Theme Guide

**Version**: 1.4.0

This document provides a quick reference for the "Retro-Comic" design system used throughout the CambioCromos application. Use these colors and classes to ensure all new components match the established aesthetic.

---

## Core Principles

- **Background**: A solid, deep charcoal/navy is the standard for all main page backgrounds.
  - **Class**: `bg-[#1F2937]`
  - **Global**: Both `html` and `body` use `background: #1F2937` with `overflow-x: hidden` to prevent white borders

- **Typography**: Major titles are bold, condensed, and uppercase for a strong visual impact.
  - **Classes**: `text-4xl font-extrabold uppercase text-white`

- **Borders & Shadows**: Components have a chunky, physical feel with thick black borders and pronounced shadows.
  - **Classes**: `border-2 border-black shadow-xl`

- **Rounding**: Corner rounding is reduced for a blockier, sticker-like appearance.
  - **Classes**: `rounded-lg` or `rounded-md`

- **Responsive Layout**: Container classes use full viewport width on mobile/tablet, with max-width only on large screens
  - **Tablet Range (768px-1024px)**: Containers fill viewport width (`100%`)
  - **Desktop (>1024px)**: Containers apply max-width constraints (`xl: 1280px`, `2xl: 1536px`)

---

## Color Palette

| Role                       | Hex       | Tailwind Class (BG) | Tailwind Class (Text) | Usage                                                                |
| -------------------------- | --------- | ------------------- | --------------------- | -------------------------------------------------------------------- |
| **Primary Accent (Gold)**  | `#FFC000` | `bg-[#FFC000]`      | `text-[#FFC000]`      | Primary actions (`TENGO`), active states, highlights |
| **Secondary Accent (Red)** | `#E84D4D` | `bg-[#E84D4D]`      | `text-[#E84D4D]`      | Duplicate (`REPE`) indicators, removal actions (`Eliminar`), and rejection states |
| **Page Background**        | `#1F2937` | `bg-[#1F2937]`      | -                     | Main background for all pages                                        |
| **Card Background**        | -         | `bg-gray-800`       | -                     | Background for `ModernCard`, `StickerTile`, etc.                     |
| **Sticky Nav Background**  | -         | `bg-gray-900`       | -                     | Background for sticky elements like `AlbumPager`                     |
| **Primary Text**           | -         | -                   | `text-white`          | Main titles and body text on dark backgrounds                        |
| **Secondary Text**         | -         | -                   | `text-gray-300`       | Labels and less important text                                       |
| **Text on Gold Accent**    | -         | -                   | `text-gray-900`       | Text inside gold buttons or badges                                   |
| **Text on Red Accent**     | -         | -                   | `text-white`          | Text inside red buttons or badges                                    |

---

## Component Examples

### Standard Card (`ModernCard`, `StickerTile`)

```html
<div class="bg-gray-800 border-2 border-black rounded-lg shadow-xl">
  <!-- Card Content -->
</div>
```

### Primary Action Button (`TENGO`, `Hacer Activa`)

```html
<button
  class="bg-[#FFC000] text-gray-900 font-bold border border-black rounded-md hover:bg-yellow-400"
>
  Acci�n Principal
</button>
```

### Destructive Action Button (`Eliminar`, restar duplicados)

```html
<button
  class="bg-[#E84D4D] text-white font-bold border border-black rounded-md hover:bg-red-600"
>
  Acci�n Negativa
</button>
```

### Active Navigation Tab

```html
<a
  href="#"
  class="bg-[#FFC000] text-gray-900 font-extrabold rounded-full px-4 py-2"
>
  P�gina Activa
</a>
```

### Inactive Navigation Tab

```html
<a
  href="#"
  class="bg-gray-800 text-gray-300 border border-gray-700 rounded-full px-4 py-2"
>
  P�gina Inactiva
</a>
```

