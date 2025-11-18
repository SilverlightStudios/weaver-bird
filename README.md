# Weaverbird - Minecraft Resource Pack Manager

Desktop app for managing Minecraft resource packs with drag-and-drop priority ordering, 3D block preview, and asset-level override control.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Zustand + React Three Fiber
- **Backend:** Rust (Tauri v2)
- **Build:** Vite 7
- **Styling:** SCSS Modules + CSS Variables
- **3D Rendering:** Three.js + React Three Fiber

## Features

- ✅ Drag-and-drop pack reordering
- ✅ Asset search and filtering with variant grouping
- ✅ Real-time 3D block preview
- ✅ Interactive block state controls (facing, powered, etc.)
- ✅ Asset-level pack selection (overrides)
- ✅ Build and export merged resource packs
- ✅ Support for complex Minecraft blockstates (variants + multipart)

## Quick Start

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Build desktop app
npm run build

# Run tests
npm run test
cargo test  # Rust tests (in src-tauri/)

# Component documentation
npm run storybook
```

## Project Structure

```
src/
├── components/         # Feature components
│   ├── PackList/      # Drag-drop pack ordering
│   ├── AssetResults/  # Asset browser with variants
│   ├── Preview3D/     # 3D block preview
│   └── SaveBar/       # Build & export
├── routes/main.tsx    # Main layout
├── state/             # Zustand store + selectors
├── lib/
│   ├── tauri/        # Tauri command wrappers
│   └── three/        # Three.js converters
└── ui/                # Design system
    ├── components/    # Reusable UI components
    └── tokens/        # SCSS mixins + design patterns

src-tauri/src/
├── commands/          # Tauri command implementations
├── util/              # Core logic
│   ├── blockstates.rs    # Parse blockstate JSON
│   ├── block_models.rs   # Load/resolve models
│   ├── pack_scanner.rs   # Scan packs
│   └── weaver_nest.rs    # Build merged pack
└── error.rs           # Structured error handling
```

## Development

### Code Patterns

**Tauri Commands:**
```typescript
import { scanPacksFolder } from '@/lib/tauri';

const result = await scanPacksFolder(path);
```

**State Management:**
```typescript
import { useSelectPacksInOrder } from '@/state/selectors';

const packs = useSelectPacksInOrder();
```

**UI Components:**
```scss
@use "@/ui/tokens" as tokens;

.card {
  @include tokens.shadow-lg;
  @include tokens.radius-quirky-md;
  @include tokens.rotate-slight;
}
```

### Error Handling

**Backend (Rust):**
```rust
AppError::validation("Invalid pack ID")?
```

**Frontend (TypeScript):**
```typescript
try {
  await scanPacksFolder(path);
} catch (error) {
  const msg = formatError(error);
  displayError(msg);
}
```

## Documentation

### For Developers
- **[AI Context](docs/AI_CONTEXT.md)** - Essential codebase knowledge for AI assistants
- **[Entity Feature Mods](docs/entity_feature_mods.md)** - Future ETF/EMF integration

### For UI Development
- **[Design Tokens](src/ui/README.md)** - SCSS mixins and patterns
- **[Anti-Design Guide](src/ui/ANTI_DESIGN_GUIDE.md)** - Style principles
- **[shadcn Integration](src/ui/SHADCN_INTEGRATION_GUIDE.md)** - Adapting components

## Testing

```bash
# TypeScript + React tests
npm run test

# Rust tests
cd src-tauri && cargo test

# Backend integration test
./test-backend.sh

# Type checking
npm run type-check
npm run lint
```

## Architecture Highlights

### 3D Block Preview

Renders Minecraft blocks using React Three Fiber:
1. User clicks asset → selects block
2. Backend resolves blockstate → model(s) + rotations
3. Frontend converts Minecraft JSON → Three.js geometry
4. Loads textures with pack → vanilla fallback
5. Renders in WebGL canvas

### Block State System

Supports complex Minecraft blockstates:
- **Variants:** Property-based models (e.g., `facing=north,powered=true`)
- **Multipart:** Conditional model assembly (fences, redstone)
- **Weighted Random:** Multiple models per state
- **Transformations:** X/Y/Z rotations, uvlock

### State Management

Zustand store with Immer for immutability:
- Pack metadata and priority order
- Asset index with provider tracking
- User overrides per asset
- Selected asset for preview

## Contributing

1. Check [AI_CONTEXT.md](docs/AI_CONTEXT.md) for architecture overview
2. Follow style guidelines in [ANTI_DESIGN_GUIDE.md](src/ui/ANTI_DESIGN_GUIDE.md)
3. Write tests for new features
4. Create Storybook stories for UI components
5. Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)

## Resources

- [Minecraft Model Format](https://minecraft.wiki/w/Model)
- [Tauri v2 Documentation](https://tauri.app/v2/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Zustand Guide](https://github.com/pmndrs/zustand)
