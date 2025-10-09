# Graphini Demo

A Next.js demo application showcasing the Drawnix drawing component:

- **@drawnix/drawnix**: A powerful drawing and diagramming component with mind maps, freehand drawing, and more

## Getting Started

### Prerequisites

Make sure you have Node.js 18+ and npm/yarn installed.

### Installation

1. Install dependencies:
```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to view the demo.

### Build for Production

**Note:** There are currently some TypeScript compilation issues in the packages themselves that need to be resolved before production builds work. The development server runs successfully and demonstrates the packages.

```bash
npm run build  # May have compilation errors
npm start
```

## Fixed Issues

### SSR Compatibility
- **Problem**: Components were trying to access `window` object during server-side rendering
- **Solution**: Used Next.js `dynamic` imports with `ssr: false` to load components only on the client side

### Context Provider Issues
- **Problem**: `useBoard` hook required components to be wrapped in `BoardContext`
- **Solution**: Properly wrapped `Board` components with `Wrapper` component that provides the required context

### Component Usage
- **Problem**: Components were being used incorrectly without proper props or context
- **Solution**: Updated component usage with correct props and proper component hierarchy

## Package Overview

### @drawnix/drawnix

The Drawnix component provides a full-featured drawing board with:

- Mind mapping capabilities
- Freehand drawing
- Text editing with links
- Multiple themes
- Toolbar with drawing tools
- Hotkey support
- Shape tools and connectors
- Zoom and pan controls

## Project Structure

```
graphinix/
├── packages/
│   └── drawnix/          # Drawing component package
├── app/                  # Next.js app router
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Full-screen Drawnix demo
│   └── globals.css       # Global styles
├── package.json          # Project dependencies
├── next.config.js        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## Usage Examples

See `app/page.tsx` for an example of how to use the Drawnix component in a React/Next.js application as a full-screen drawing canvas.

## Contributing

The Drawnix package is located in the `packages/drawnix/` directory. It has its own build configuration and can be developed independently.
