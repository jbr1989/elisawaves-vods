# Elisawaves VODs

A web application built with Astro for managing and viewing VODs (Video On Demand) content.

## 🚀 Project Structure

```text
/
├── public/          # Static assets
├── src/            # Source code
│   ├── layouts/    # Layout components
│   └── pages/      # Page components
├── .astro/         # Astro build output
├── .vscode/        # VS Code configuration
├── node_modules/   # Dependencies
├── astro.config.mjs # Astro configuration
├── package.json    # Project metadata and dependencies
├── pnpm-lock.yaml  # Dependency lock file
├── tsconfig.json   # TypeScript configuration
└── .env            # Environment variables
```

## 🛠️ Development

### Prerequisites

- Node.js (LTS version recommended)
- pnpm (Package manager)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Available Scripts

| Command           | Description                                    |
|------------------|------------------------------------------------|
| `pnpm dev`       | Start development server at `localhost:4321`   |
| `pnpm build`     | Build for production                           |
| `pnpm preview`   | Preview production build locally               |
| `pnpm astro`     | Run Astro CLI commands                         |

## 📦 Dependencies

- Astro ^5.5.4

## 🔧 Configuration

- TypeScript support
- VS Code configuration included
- Environment variables support (.env)

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
