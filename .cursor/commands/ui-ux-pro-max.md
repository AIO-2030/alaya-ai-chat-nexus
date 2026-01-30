# ui-ux-pro-max

Comprehensive design guide for web and mobile applications. Contains 67 styles, 96 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types across 13 technology stacks. Searchable database with priority-based recommendations.

## Prerequisites

Check if Python is installed:

```bash
python3 --version || python --version
```

If Python is not installed, install it based on user's OS:

**macOS:**
```bash
brew install python3
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install python3
```

**Windows:**
```powershell
winget install Python.Python.3.12
```

---

## How to Use This Workflow

When user requests UI/UX work (design, build, create, implement, review, fix, improve), follow this workflow:

### Step 1: Analyze User Requirements

Extract key information from user request:
- **Product type**: SaaS, e-commerce, portfolio, dashboard, landing page, etc.
- **Style keywords**: minimal, playful, professional, elegant, dark mode, etc.
- **Industry**: healthcare, fintech, gaming, education, etc.
- **Stack**: React, Vue, Next.js, or default to `html-tailwind`

### Step 2: Generate Design System (REQUIRED)

**Always start with `--design-system`** to get comprehensive recommendations with reasoning:

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This command:
1. Searches 5 domains in parallel (product, style, color, landing, typography)
2. Applies reasoning rules from `ui-reasoning.csv` to select best matches
3. Returns complete design system: pattern, style, colors, typography, effects
4. Includes anti-patterns to avoid

**Example:**
```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "beauty spa wellness service" --design-system -p "Serenity Spa"
```

### Step 2b: Persist Design System (Master + Overrides Pattern)

To save the design system for hierarchical retrieval across sessions, add `--persist`:

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

This creates:
- `design-system/MASTER.md` — Global Source of Truth with all design rules
- `design-system/pages/` — Folder for page-specific overrides

**With page-specific override:**
```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name" --page "dashboard"
```

This also creates:
- `design-system/pages/dashboard.md` — Page-specific deviations from Master

**How hierarchical retrieval works:**
1. When building a specific page (e.g., "Checkout"), first check `design-system/pages/checkout.md`
2. If the page file exists, its rules **override** the Master file
3. If not, use `design-system/MASTER.md` exclusively

### Step 3: Supplement with Detailed Searches (as needed)

After getting the design system, use domain searches to get additional details:

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

**When to use detailed searches:**

| Need | Domain | Example |
|------|--------|---------|
| More style options | `style` | `--domain style "glassmorphism dark"` |
| Chart recommendations | `chart` | `--domain chart "real-time dashboard"` |
| UX best practices | `ux` | `--domain ux "animation accessibility"` |
| Alternative fonts | `typography` | `--domain typography "elegant luxury"` |
| Landing structure | `landing` | `--domain landing "hero social-proof"` |

### Step 4: Stack Guidelines (Default: html-tailwind)

Get implementation-specific best practices. If user doesn't specify a stack, **default to `html-tailwind`**.

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

Available stacks: `html-tailwind`, `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`

---

## Search Reference

### Available Domains

| Domain | Use For | Example Keywords |
|--------|---------|------------------|
| `product` | Product type recommendations | SaaS, e-commerce, portfolio, healthcare, beauty, service |
| `style` | UI styles, colors, effects | glassmorphism, minimalism, dark mode, brutalism |
| `typography` | Font pairings, Google Fonts | elegant, playful, professional, modern |
| `color` | Color palettes by product type | saas, ecommerce, healthcare, beauty, fintech, service |
| `landing` | Page structure, CTA strategies | hero, hero-centric, testimonial, pricing, social-proof |
| `chart` | Chart types, library recommendations | trend, comparison, timeline, funnel, pie |
| `ux` | Best practices, anti-patterns | animation, accessibility, z-index, loading |
| `react` | React/Next.js performance | waterfall, bundle, suspense, memo, rerender, cache |
| `web` | Web interface guidelines | aria, focus, keyboard, semantic, virtualize |
| `prompt` | AI prompts, CSS keywords | (style name) |

### Available Stacks

| Stack | Focus |
|-------|-------|
| `html-tailwind` | Tailwind utilities, responsive, a11y (DEFAULT) |
| `react` | State, hooks, performance, patterns |
| `nextjs` | SSR, routing, images, API routes |
| `vue` | Composition API, Pinia, Vue Router |
| `svelte` | Runes, stores, SvelteKit |
| `swiftui` | Views, State, Navigation, Animation |
| `react-native` | Components, Navigation, Lists |
| `flutter` | Widgets, State, Layout, Theming |
| `shadcn` | shadcn/ui components, theming, forms, patterns |
| `jetpack-compose` | Composables, Modifiers, State Hoisting, Recomposition |

---

## Example Workflow

**User request:** "Làm landing page cho dịch vụ chăm sóc da chuyên nghiệp"

### Step 1: Analyze Requirements
- Product type: Beauty/Spa service
- Style keywords: elegant, professional, soft
- Industry: Beauty/Wellness
- Stack: html-tailwind (default)

### Step 2: Generate Design System (REQUIRED)

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "beauty spa wellness service elegant" --design-system -p "Serenity Spa"
```

**Output:** Complete design system with pattern, style, colors, typography, effects, and anti-patterns.

### Step 3: Supplement with Detailed Searches (as needed)

```bash
# Get UX guidelines for animation and accessibility
python3 .shared/ui-ux-pro-max/scripts/search.py "animation accessibility" --domain ux

# Get alternative typography options if needed
python3 .shared/ui-ux-pro-max/scripts/search.py "elegant luxury serif" --domain typography
```

### Step 4: Stack Guidelines

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "layout responsive form" --stack html-tailwind
```

**Then:** Synthesize design system + detailed searches and implement the design.

---

## Output Formats

The `--design-system` flag supports two output formats:

```bash
# ASCII box (default) - best for terminal display
python3 .shared/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system

# Markdown - best for documentation
python3 .shared/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system -f markdown
```

---

## Tips for Better Results

1. **Be specific with keywords** - "healthcare SaaS dashboard" > "app"
2. **Search multiple times** - Different keywords reveal different insights
3. **Combine domains** - Style + Typography + Color = Complete design system
4. **Always check UX** - Search "animation", "z-index", "accessibility" for common issues
5. **Use stack flag** - Get implementation-specific best practices
6. **Iterate** - If first search doesn't match, try different keywords

---

## Common Rules for Professional UI

These are frequently overlooked issues that make UI look unprofessional:

### Icons & Visual Elements

| Rule | Do | Don't |
|------|----|----- |
| **No emoji icons** | Use SVG icons (Heroicons, Lucide, Simple Icons) | Use emojis like 🎨 🚀 ⚙️ as UI icons |
| **Stable hover states** | Use color/opacity transitions on hover | Use scale transforms that shift layout |
| **Correct brand logos** | Research official SVG from Simple Icons | Guess or use incorrect logo paths |
| **Consistent icon sizing** | Use fixed viewBox (24x24) with w-6 h-6 | Mix different icon sizes randomly |

### Interaction & Cursor

| Rule | Do | Don't |
|------|----|----- |
| **Cursor pointer** | Add `cursor-pointer` to all clickable/hoverable cards | Leave default cursor on interactive elements |
| **Hover feedback** | Provide visual feedback (color, shadow, border) | No indication element is interactive |
| **Smooth transitions** | Use `transition-colors duration-200` | Instant state changes or too slow (>500ms) |

### Light/Dark Mode Contrast

| Rule | Do | Don't |
|------|----|----- |
| **Glass card light mode** | Use `bg-white/80` or higher opacity | Use `bg-white/10` (too transparent) |
| **Text contrast light** | Use `#0F172A` (slate-900) for text | Use `#94A3B8` (slate-400) for body text |
| **Muted text light** | Use `#475569` (slate-600) minimum | Use gray-400 or lighter |
| **Border visibility** | Use `border-gray-200` in light mode | Use `border-white/10` (invisible) |

### Layout & Spacing

| Rule | Do | Don't |
|------|----|----- |
| **Floating navbar** | Add `top-4 left-4 right-4` spacing | Stick navbar to `top-0 left-0 right-0` |
| **Content padding** | Account for fixed navbar height | Let content hide behind fixed elements |
| **Consistent max-width** | Use same `max-w-6xl` or `max-w-7xl` | Mix different container widths |

---

## Pre-Delivery Checklist

Before delivering UI code, verify these items:

### Visual Quality
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] Brand logos are correct (verified from Simple Icons)
- [ ] Hover states don't cause layout shift
- [ ] Use theme colors directly (bg-primary) not var() wrapper

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

### Light/Dark Mode
- [ ] Light mode text has sufficient contrast (4.5:1 minimum)
- [ ] Glass/transparent elements visible in light mode
- [ ] Borders visible in both modes
- [ ] Test both modes before delivery

### Layout
- [ ] Floating elements have proper spacing from edges
- [ ] No content hidden behind fixed navbars
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile

### Accessibility
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected

---

## Alaya Chat Nexus Design System Rules

These rules define the standard layout, styling patterns, and design principles for all pages in the application, ensuring consistency across the entire UI.

### Layout & Container Rules

| Rule | Value | Application |
|------|-------|-------------|
| **Page container max-width** | `600px` | All content containers should be centered with `margin: 0 auto` |
| **Container padding** | `24px 16px` (mobile), `var(--spacing-2xl) var(--spacing-lg)` (desktop) | Use `!important` to override theme defaults when needed |
| **Vertical gap between sections** | `24px` (mobile), `var(--spacing-2xl)` (desktop) | Consistent spacing between major content sections |
| **Section margin-bottom** | `24px` | Standard spacing between sections |
| **Layout direction** | `flex-direction: column` | Default for page containers and vertical content stacks |

### Color System

| Element Type | Color | Usage Context |
|--------------|-------|----------------|
| **Page background** | `#000000` | Pure black background for all pages - **MUST use `!important`** to override theme defaults |
| **Primary panel/button** | `#1E3A5F` | Deep blue for primary content and main actions |
| **Secondary panel/button** | `#4A2C5A` | Purple-blue for secondary actions |
| **Accent panel** | `#CC6600` | Orange for special emphasis or secondary content |
| **Subtle button/card** | `#1a1a1a` | Dark gray for less prominent interactive elements |
| **Accent icon** | `#D4A5FF` | Light purple for icons and decorative elements |
| **Muted text** | `#9ca3af` | Gray for secondary text and labels |
| **Border (light mode)** | `rgba(255, 255, 255, 0.15)` | Standard border for panels |
| **Border (subtle)** | `rgba(255, 255, 255, 0.08)` | Subtle borders for feature buttons/cards |

### Typography Scale

| Element Type | Mobile Size | Desktop Size | Weight | Letter Spacing | Transform |
|--------------|------------|--------------|--------|----------------|-----------|
| **Page title** | `36px` | `48px` | `700` | `-0.03em` to `-0.04em` | None |
| **Section subtitle** | `20px` | `24px` | `600` | `0.05em` | lowercase, small-caps (if serif) |
| **Primary button text** | `var(--text-base)` | `var(--text-lg)` | `700` | `0.03em` | uppercase |
| **Secondary button text** | `11px` | `var(--text-base)` | `500` | `0.01em` | capitalize |
| **Body text** | `var(--text-sm)` | `var(--text-base)` | `400` | `0.01em` | None |

### Button Component Rules

#### Primary Action Buttons
- **Layout**: Vertical stack when multiple buttons (`flex-direction: column`, `gap: 16px`)
- **Padding**: `20px var(--spacing-xl)` (mobile), `24px var(--spacing-2xl)` (desktop)
- **Min-height**: `64px` (mobile), `72px` (desktop) - Ensures touch-friendly targets
- **Border radius**: `16px` - Consistent rounded corners
- **Border**: `2px solid rgba(255, 255, 255, 0.2)` - Visible but subtle
- **Box shadow**: Multi-layer pattern: outer shadow + inset highlight for depth
  - Example: `0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)`
- **Hover state**: `translateY(-2px)` with enhanced shadow
- **Icon size**: `22px` (mobile), `24px` (desktop)
- **Icon hover effect**: `scale(1.15) rotate(5deg)` - Subtle animation
- **Text transform**: `uppercase` with letter-spacing `0.03em`

#### Secondary Feature Buttons
- **Layout**: Horizontal when multiple (`flex-direction: row`, `justify-content: space-between`)
- **Gap**: `12px` (desktop), `8px` (mobile) - Between buttons
- **Padding**: `12px 12px` (mobile), `var(--spacing-xl) var(--spacing-lg)` (desktop)
- **Border radius**: `16px` - Same as primary buttons
- **Border**: `1px solid rgba(255, 255, 255, 0.08)` - More subtle than primary
- **Icon size**: `24px` (mobile), `40px` (desktop) - Larger for visual balance
- **Icon color**: `#D4A5FF` (light purple accent)
- **Hover state**: Background `#252525`, icon `scale(1.1)`, text color `#d1d5db`
- **Text transform**: `capitalize` with letter-spacing `0.01em`

### Panel/Card Component Rules

#### Primary Panel
- **Background**: `#1E3A5F` (deep blue) or theme primary color
- **Border**: `2px solid rgba(255, 255, 255, 0.15)`
- **Border radius**: `16px` - Consistent with buttons
- **Padding**: `20px 32px` - Comfortable content spacing
- **Max-width**: `500px` - Prevents over-wide panels
- **Box shadow**: `0 4px 16px rgba(30, 58, 95, 0.4)` + inset highlight
- **Text color**: `#ffffff` - High contrast on dark background

#### Secondary/Accent Panel
- **Background**: `#CC6600` (orange) or theme accent color
- **Border**: `2px solid rgba(0, 0, 0, 0.1)` - Darker border for light backgrounds
- **Border radius**: `16px` - Consistent
- **Padding**: `16px 28px` - Slightly less than primary
- **Max-width**: `500px` - Same constraint
- **Text color**: `#000000` - High contrast on light background
- **Font style**: Can use serif (Georgia/Times New Roman), italic, lowercase, small-caps for distinction

### Responsive Breakpoints

| Breakpoint | Type | Usage |
|-----------|------|-------|
| **640px** | `max-width` | Mobile-specific adjustments: smaller gaps, reduced padding, compact layouts |
| **768px** | `min-width` | Desktop enhancements: larger fonts, increased padding, taller buttons, more spacing |

### CSS Module Naming Convention

Use BEM-like naming with double underscore pattern: `{page}__{component}__{element}--{modifier}`

**Examples:**
- `.page__container` - Page-level container
- `.page__section` - Major section wrapper
- `.page__button` - Button base class
- `.page__button--primary` - Primary button variant
- `.page__button--secondary` - Secondary button variant
- `.page__panel` - Panel/card base
- `.page__panel__title` - Title element within panel
- `.page__icon` - Icon base class

**Rules:**
- Use page prefix (e.g., `index__`, `chat__`, `profile__`) for page-specific styles
- Use double underscore `__` for element separation
- Use double dash `--` for modifiers
- Keep names descriptive but concise

### Universal Design Rules

1. **Page Background**: Always use pure black `#000000` with `!important` for all page backgrounds - ensures consistent dark theme across the application
2. **Color Overrides**: Use `!important` for color overrides when theme variables conflict with design system
3. **Border Radius**: Always `16px` for panels, buttons, and cards - creates consistent rounded aesthetic
4. **Shadow Pattern**: Multi-layer shadows (outer + inset) for depth and visual hierarchy
5. **Transitions**: Always `0.2s ease` for hover and state changes - smooth but not sluggish
6. **Icon Sizing**: Use fixed pixel values (not relative units) for consistent icon appearance
7. **Text Transforms**: 
   - Primary buttons: `uppercase` for emphasis
   - Secondary buttons: `capitalize` for readability
   - Body text: None (natural case)
8. **Vertical Spacing**: Use `margin-bottom: 24px` consistently between major sections
9. **Touch Targets**: Minimum `64px` height for interactive elements on mobile
10. **Hover Feedback**: Always provide visual feedback (color change, shadow, transform) for interactive elements
11. **Accessibility**: Maintain 4.5:1 contrast ratio for text, ensure focus states are visible

### Component Hierarchy Rules

**When designing a new page, follow this structure:**
1. **Page Container** - Full-width wrapper with background
2. **Content Container** - Max-width constrained, centered content area
3. **Sections** - Major content blocks with consistent spacing
4. **Panels/Cards** - Content containers with defined styling
5. **Buttons** - Primary actions first, secondary features below
6. **Interactive Elements** - Icons, links, inputs with consistent styling

**Priority Order for Actions:**
- Primary actions (vertical stack, prominent)
- Secondary features (horizontal layout, subtle)
- Tertiary elements (minimal styling, less prominent)
