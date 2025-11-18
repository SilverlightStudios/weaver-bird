# shadcn/ui Integration Guide

## Overview

We use **shadcn/ui** as a **reference implementation** only, not as our final component library. The shadcn components provide excellent accessibility, keyboard navigation, and component architecture patterns that we adapt to our Minecraft anti-design aesthetic.

### Philosophy

**shadcn → Minecraft Anti-Design Pipeline:**

1. **Consider building from scratch first** - Can you solve this with vanilla React + CSS?
2. Install shadcn component (reference only, if needed)
3. Study its structure, props, accessibility features
4. **Build our own version using vanilla React + SCSS** - No Radix UI dependencies
5. Apply anti-design tokens (shadows, rotations, patterns)
6. Make it more concise for our use case
7. Delete the shadcn component

**⚠️ Important: Avoid Radix UI Dependencies**

We prefer building components ourselves using modern CSS and vanilla React rather than relying on Radix UI primitives. This gives us:
- **Full control** over behavior and styling
- **Smaller bundle size** - No heavy dependencies
- **Simpler codebase** - Easier to understand and maintain
- **Modern CSS features** - Native popover API, CSS anchor positioning (future), dialog element
- **No abstraction overhead** - Direct implementation

---

## Why Use shadcn as Reference?

### ✅ Pros

- **Excellent accessibility** - ARIA attributes, keyboard nav, focus management
- **Headless architecture** - Logic separated from styling
- **TypeScript** - Strong typing, great DX
- **Radix UI primitives** - Battle-tested component behavior
- **Copy-paste** - Full ownership, no package dependency hell

### ❌ What We Don't Use

- **Radix UI primitives** - We build our own using vanilla React + modern CSS
- **Tailwind classes** - We use SCSS modules + CSS variables
- **Their visual design** - Too clean/corporate for our punk aesthetic
- **All their complexity** - We simplify for our specific needs
- **Third-party libraries** - Prefer native solutions (portals, context, hooks)

---

## Installation Process

### 1. Install shadcn Component (Reference)

```bash
npx shadcn@latest add button
```

This creates:
- `src/components/ui/button.tsx` (component)
- Updates `tailwind.config.js` if needed

### 2. Study the Component

Open `src/components/ui/button.tsx` and examine:

- **Props interface** - What variants, sizes, states?
- **Accessibility** - ARIA attributes, disabled states
- **Variants** - How do they handle different styles?
- **Composition** - How do they use Radix/React primitives?

Example shadcn Button:

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### 3. Extract Key Learnings

From the shadcn Button above:

- ✅ **Variants system** - default, destructive, outline
- ✅ **Size system** - sm, default, lg
- ✅ **Forwarding refs** - `React.forwardRef`
- ✅ **Spreading props** - `{...props}` for flexibility
- ✅ **asChild pattern** - Radix Slot for composition
- ✅ **Disabled state** - `disabled:pointer-events-none disabled:opacity-50`
- ✅ **Focus visible** - `focus-visible:outline-none focus-visible:ring-2`

---

## Building Our Anti-Design Version

### 4. Create Our Component

**File**: `src/ui/components/Button/Button.tsx`

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import s from "./Button.module.scss";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const variantClass = s[variant];
    const sizeClass = s[size];

    return (
      <button
        ref={ref}
        className={[s.button, variantClass, sizeClass, className]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
```

### 5. Style with Anti-Design Tokens

**File**: `src/ui/components/Button/Button.module.scss`

```scss
@use "@/ui/tokens" as tokens;

.button {
    // Base styles - Anti-design
    @include tokens.border-standard;
    @include tokens.radius-quirky-sm;
    @include tokens.shadow-md;
    @include tokens.rotate-slight;

    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);

    font-family: var(--font-family);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;

    cursor: pointer;
    transition:
        rotate 180ms var(--spring-bezier),
        translate 180ms var(--spring-bezier),
        box-shadow 180ms var(--spring-bezier),
        background 180ms ease;

    // Interaction
    &:hover:not(:disabled) {
        @include tokens.shadow-xl;
        rotate: 0deg;
        translate: 0 -2px;
    }

    &:active:not(:disabled) {
        @include tokens.shadow-sm;
        rotate: var(--rotate-mild);
        translate: 0 2px;
    }

    &:focus-visible {
        outline: 3px solid var(--color-primary);
        outline-offset: 4px;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(0.5);
    }
}

// Variants
.default {
    background: var(--color-primary);
    color: white;

    &:hover:not(:disabled) {
        background: var(--color-primary-dark);
    }
}

.destructive {
    background: var(--color-danger);
    color: white;

    &:hover:not(:disabled) {
        background: #cc0022;
    }
}

.outline {
    background: transparent;
    color: var(--color-text);
    border-color: var(--color-border);

    &:hover:not(:disabled) {
        background: var(--color-block);
    }
}

// Sizes
.sm {
    padding: 0.3rem 0.6rem;
    font-size: var(--font-size-sm);
}

.md {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-base);
}

.lg {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-lg);
}
```

### 6. Create Storybook Stories

**File**: `src/ui/components/Button/Button.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Click Me",
    variant: "default",
    size: "md",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outlined",
    variant: "outline",
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true,
  },
};
```

### 7. Delete shadcn Component

```bash
rm src/components/ui/button.tsx
```

We've extracted what we needed. Our version is:
- ✅ More concise (fewer lines)
- ✅ Uses our anti-design tokens
- ✅ SCSS modules instead of Tailwind
- ✅ Maintains accessibility features
- ✅ Fits our exact use case

---

## Component Adaptation Checklist

When adapting a shadcn component:

### Study Phase
- [ ] Install shadcn component
- [ ] Identify all variants and sizes
- [ ] Note accessibility attributes (ARIA, roles, etc.)
- [ ] Check keyboard navigation patterns
- [ ] Understand state management (open/close, active, etc.)
- [ ] Review TypeScript interfaces

### Build Phase
- [ ] Create component directory: `src/ui/components/{Name}/`
- [ ] Create TypeScript component file
- [ ] Create SCSS module file
- [ ] Import and use design tokens
- [ ] Implement variants with SCSS classes
- [ ] Add anti-design styling (shadows, rotations, borders)
- [ ] Preserve accessibility features
- [ ] Forward refs if needed
- [ ] Spread props for flexibility

### Style Phase
- [ ] Apply asymmetric borders
- [ ] Add offset shadows
- [ ] Include subtle rotations
- [ ] Use uppercase typography
- [ ] Add spring animations
- [ ] Include texture/pattern overlays
- [ ] Test hover/active/focus states
- [ ] Test disabled state

### Verify Phase
- [ ] Create Storybook stories
- [ ] Test keyboard navigation
- [ ] Test screen reader (basic check)
- [ ] Test all variants and sizes
- [ ] Verify responsive behavior
- [ ] Check dark mode support

### Cleanup Phase
- [ ] Delete shadcn component file
- [ ] Remove unused Tailwind classes from config (if any)
- [ ] Update imports in codebase
- [ ] Document component usage

---

## Common shadcn Components to Adapt

### Simple Components (Easy)

1. **Button** - Start here, foundational
2. **Badge** - Use rotate-badge token
3. **Card** - Perfect for our heavy shadow style
4. **Label** - Simple typography wrapper
5. **Separator** - Use border tokens

### Medium Complexity

6. **Input** - Text fields with validation states
7. **Textarea** - Multi-line input
8. **Checkbox** - Custom checkmark design
9. **Radio Group** - Custom radio buttons
10. **Switch** - Toggle with animation

### Complex Components (Advanced)

11. **Dialog/Modal** - Focus trap, backdrop, animations
12. **Dropdown Menu** - Positioning, keyboard nav
13. **Select** - Custom dropdown with search
14. **Tabs** - Active states, keyboard navigation
15. **Tooltip** - Positioning, hover delays

---

## Example: Adapting Dialog/Modal

### 1. Install shadcn Dialog

```bash
npx shadcn@latest add dialog
```

### 2. Study the Component

shadcn Dialog uses **Radix UI Dialog** primitive:

- `Dialog` - Root component
- `DialogTrigger` - Opens the dialog
- `DialogContent` - The modal content
- `DialogHeader`, `DialogFooter` - Layout helpers
- `DialogTitle`, `DialogDescription` - Accessibility

Key features:
- ✅ Focus trap (focus stays in modal)
- ✅ Backdrop click to close
- ✅ ESC key to close
- ✅ ARIA attributes for screen readers
- ✅ Portal rendering (outside DOM hierarchy)

### 3. Create Our Anti-Design Version

**Component Structure:**

```tsx
// src/ui/components/Dialog/Dialog.tsx
import { forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import s from "./Dialog.module.scss";

// Use Radix primitives directly
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

// Style the Content
export const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={s.overlay} />
    <DialogPrimitive.Content
      ref={ref}
      className={[s.content, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

// Header, Title, Description helpers
export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={[s.header, className].filter(Boolean).join(" ")} {...props} />
);

export const DialogTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={[s.title, className].filter(Boolean).join(" ")}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={[s.description, className].filter(Boolean).join(" ")}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";
```

**SCSS Styles:**

```scss
// src/ui/components/Dialog/Dialog.module.scss
@use "@/ui/tokens" as tokens;

.overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 70%);
    z-index: 100;
    
    // Halftone overlay for punk aesthetic
    @include tokens.pattern-halftone-lg;
    
    // Fade in animation
    @include tokens.fade-in-up;
}

.content {
    @include tokens.border-standard;
    @include tokens.radius-quirky-lg;
    @include tokens.shadow-xl;
    @include tokens.rotate-slight;

    position: fixed;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    z-index: 101;

    max-width: 500px;
    max-height: 85vh;
    width: 90%;
    padding: var(--spacing-xl);

    background:
        linear-gradient(/* glossy */),
        var(--color-block);

    overflow-y: auto;

    // Enter animation
    @include tokens.bounce-in;

    &:focus {
        outline: none;
    }
}

.header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
}

.title {
    @include tokens.text-shadow-bold;

    font-size: var(--font-size-2xl);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    line-height: 1;
}

.description {
    color: var(--color-text-light);
    font-size: var(--font-size-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
```

### 4. Usage Example

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/ui/components/Dialog";
import { Button } from "@/ui/components/Button";

function MyComponent() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Modal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogDescription>
            Are you sure you want to proceed?
          </DialogDescription>
        </DialogHeader>
        <div>
          {/* Modal content */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Delete shadcn Dialog

```bash
rm src/components/ui/dialog.tsx
```

---

## Key Differences Summary

### shadcn Components

- Tailwind CSS classes
- `cn()` utility for class merging
- `class-variance-authority` for variants
- Minimal custom styling
- Generic/corporate aesthetic

### Our Anti-Design Components

- SCSS modules
- Manual class concatenation
- SCSS classes for variants
- Heavy custom styling
- Punk/Minecraft aesthetic
- Design tokens from `/ui/tokens`

---

## Anti-Design Styling Checklist

Every adapted component should have:

1. **Asymmetric borders** - `@include radius-quirky-*`
2. **Offset shadows** - `@include shadow-*`
3. **Subtle rotation** - `@include rotate-*`
4. **Spring animation** - `transition: ... var(--spring-bezier)`
5. **Uppercase text** - `text-transform: uppercase`
6. **Letter spacing** - `letter-spacing: 0.08em+`
7. **Heavy borders** - `@include border-standard` (3px)
8. **Interactive states** - Hover increases shadow, reduces rotation
9. **Texture overlay** - Optional halftone/pattern
10. **High contrast** - Black borders, punk colors

---

## Common Pitfalls

### ❌ Don't Keep Tailwind Classes

```tsx
// Bad - Tailwind mixed with SCSS modules
<button className={`${s.button} rounded-md shadow-lg`}>
```

```tsx
// Good - Only SCSS modules
<button className={s.button}>
```

### ❌ Don't Over-Complicate

If shadcn has 10 variants and you only need 3, only build 3.

### ❌ Don't Skip Accessibility

Always keep:
- ARIA attributes
- Keyboard navigation
- Focus management
- Disabled states
- Screen reader text

### ❌ Don't Forget Storybook

Document every variant, size, and state in Storybook.

---

## Storybook Best Practices for Portal Components

When building components that use portals (dropdowns, modals, tooltips, comboboxes), follow these patterns to ensure they work correctly in Storybook:

### 1. Use `position: absolute` Instead of `position: fixed`

For dropdown/popover components, use `position: absolute` rather than `position: fixed`:

```scss
// Good
.dropdownContent {
    position: absolute;
    z-index: 50;
}

// Avoid
.dropdownContent {
    position: fixed; // Can break in Storybook iframes with transforms
    z-index: 50;
}
```

**Exception**: Full-screen overlays (modals, drawers) should still use `position: fixed`.

### 2. Calculate Positions with Scroll Offsets

When positioning absolutely, include scroll offsets in your calculations:

```typescript
// Good - for position: absolute
const updatePosition = () => {
  const triggerRect = trigger.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;
  
  content.style.top = `${triggerRect.bottom + scrollY + offset}px`;
  content.style.left = `${triggerRect.left + scrollX}px`;
};

// Only for position: fixed (no scroll offsets needed)
const updatePosition = () => {
  const triggerRect = trigger.getBoundingClientRect();
  content.style.top = `${triggerRect.bottom + offset}px`;
  content.style.left = `${triggerRect.left}px`;
};
```

### 3. Global Decorator for Portal Context

Add a global decorator in `.storybook/preview.tsx` to set up positioning context:

```tsx
// .storybook/preview.tsx
import type { Decorator } from "@storybook/react";
import React from "react";

const PortalDecorator: Decorator = (Story) => {
  React.useEffect(() => {
    // Create positioning context for portals
    const root = document.getElementById("storybook-root");
    if (root) {
      root.style.position = "relative";
      root.style.isolation = "isolate";
    }

    document.body.style.position = "relative";
    document.body.style.isolation = "isolate";
  }, []);

  return <Story />;
};

const preview: Preview = {
  decorators: [PortalDecorator],
  // ... rest of config
};
```

**Note**: Use `.tsx` extension for preview files when decorators contain JSX. TypeScript files (`.ts`) cannot parse JSX syntax.

### 4. Avoid Duplicate Position Declarations

Don't declare `position` twice in the same rule - it causes conflicts:

```scss
// Bad - conflicting position declarations
.content {
    position: absolute;
    // ... other styles
    position: relative; // This overrides the first one!
}

// Good
.content {
    position: absolute;
    isolation: isolate; // Use isolation instead of position: relative
}
```

### 5. Portal to document.body

Always portal to `document.body` for consistent behavior:

```tsx
import { createPortal } from "react-dom";

// Good
return createPortal(
  <div className={s.dropdown}>{children}</div>,
  document.body
);
```

### 6. Story Layout Configuration

For components with portals/overlays:

```typescript
// Component stories
const meta = {
  title: "Components/Dropdown",
  component: Dropdown,
  parameters: {
    layout: "fullscreen", // Use fullscreen for overlays
  },
} satisfies Meta<typeof Dropdown>;

// Wrap trigger buttons in a centered container
export const Default: Story = {
  render: () => (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      minHeight: "400px" 
    }}>
      <Dropdown>...</Dropdown>
    </div>
  ),
};
```

### 7. Handle Custom Triggers Properly

When supporting custom triggers via `renderTrigger`, don't wrap them in styled buttons:

```tsx
// Bad - wraps custom trigger in default button styles
const trigger = renderTrigger ? (
  <button className={s.trigger}>
    {renderTrigger({ isOpen })}
  </button>
) : (
  <button className={s.trigger}>Default</button>
);

// Good - uses unstyled wrapper for custom triggers
const trigger = renderTrigger ? (
  <div role="combobox" onClick={handleClick}>
    {renderTrigger({ isOpen })}
  </div>
) : (
  <button className={s.trigger}>Default</button>
);
```

### 8. Prevent Content Overflow

For dropdowns with search inputs or scrollable content:

```scss
.dropdownContent {
    position: absolute;
    overflow: hidden; // Prevent content from escaping
}

.searchWrapper {
    width: 100%;
    max-width: 100%; // Constrain to parent
}

.searchInput {
    width: 100%;
    min-width: 0; // Allow flexbox shrinking
    box-sizing: border-box; // Include padding/border in width
}
```

### Common Storybook Portal Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Dropdown appears in wrong location | Using `position: fixed` with transforms in iframe | Use `position: absolute` + scroll offsets |
| Content overflows dropdown | No width constraints | Add `width: 100%`, `min-width: 0`, `box-sizing: border-box` |
| Custom trigger has default styles | Wrapping custom content in styled button | Use unstyled wrapper (`<div>`) for custom triggers |
| Portal not visible | No positioning context | Add global decorator with `position: relative` |
| Duplicate `position` rules | Copy/paste error | Remove conflicting declarations, use `isolation: isolate` |

---

## Resources

- **shadcn/ui**: https://ui.shadcn.com/
- **Radix UI**: https://www.radix-ui.com/ (primitives shadcn uses)
- **Our Design Tokens**: `/src/ui/tokens/`
- **Anti-Design Guide**: `/src/ui/tokens/ANTI_DESIGN_GUIDE.md`
- **Storybook Decorators**: https://storybook.js.org/docs/writing-stories/decorators

---

## Quick Reference

```bash
# 1. Install shadcn component (reference)
npx shadcn@latest add button

# 2. Study it
cat src/components/ui/button.tsx

# 3. Build our version
mkdir -p src/ui/components/Button
touch src/ui/components/Button/Button.tsx
touch src/ui/components/Button/Button.module.scss
touch src/ui/components/Button/Button.stories.tsx

# 4. Delete shadcn version
rm src/components/ui/button.tsx
```

---

**Remember**: shadcn is a blueprint, not a dependency. Extract, adapt, apply anti-design, delete. 🎸
