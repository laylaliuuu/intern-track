# Cursor Rules System — How It Works

This document explains how Cursor reads and applies rules in this repository.

## The Four-Layer System

### Layer 1: Cursor Settings (Global, Always Active)

**Location:** Cursor Settings → Rules & Commands  
**Status:** Always active and applied globally; repo rules add project-specific constraints.

**What it contains:**
- Your global User Rules (behavior patterns)
- Your global User Commands (workflows)

**How Cursor uses it:**
- Applied globally to all projects
- Repo rules add project-specific constraints on top

---

### Layer 2: Repo Rules (Enforcement Layer)

**Location:** `.cursor/rules/*.md`  
**Status:** Typically auto-discovered when you open this repo

**Files:**
- `.cursor/rules/intern-tracker-mvp.md` — Core product invariants (source of truth)
- `.cursor/rules/writing.md` — Writing style guide

**What Cursor does:**
- Scans `.cursor/rules/` for `.md` files
- Loads them into context as constraints
- Uses them to guide code generation

**Priority:** If repo rules conflict with global rules, repo rules are the source of truth for this repo.

**Important:** Explicit wording like "This file is the source of truth for this repo" significantly increases compliance. Cursor reacts more strongly to authoritative phrasing.

**Key content from `intern-tracker-mvp.md`:**
- Never guess values → use "Not found"
- EXCLUDED postings not visible by default
- No scoring/tracking (MVP only)
- TypeScript strict mode
- Small composable modules
- API contracts (ACTIVE by default)

---

### Layer 3: Repo Workflows/Commands

**Location:** `.cursor/commands/*.md`  
**Status:** Typically auto-discovered

**Files:**
- `.cursor/commands/dev.md` — Development workflow, commands, Definition of Done
- `.cursor/commands/code-review.md` — Code review checklist

**What Cursor does:**
- Loads as workflow instructions
- References commands when you ask "how do I run tests?"
- Uses Definition of Done as a checklist

**Key content from `dev.md`:**
- Workflow: vertical slice → tests → regression
- Commands: `npm install`, `npm run dev`, `npm test`, etc.
- Definition of Done checklist

---

### Layer 4: Design Docs (Contextual Only)

**Location:** `docs/*.md`  
**Status:** Not auto-loaded; searched when relevant

**Files:**
- `docs/00-overview.md`
- `docs/01-requirements.md`
- `docs/02-architecture.md`
- etc.

**What Cursor does:**
- Does not load automatically
- Searches when:
  - You reference them explicitly
  - Codebase search finds relevant content
  - Context suggests they're needed

---

### Hint File (Optional, Not Guaranteed)

**Location:** `.cursorrules` (repo root)  
**Status:** May or may not be read; treat as a hint

**What it does:**
- Points to key files
- Reminds about priority
- Not guaranteed to be read

---

## How to Ensure Enforcement

1. **Put invariants in `.cursor/rules/intern-tracker-mvp.md`** (enforcement layer)
2. **Put workflow in `.cursor/commands/dev.md`** (workflow layer)
3. **Make rules explicit:** "This file is the source of truth" (priority handling)
4. **Create User Commands in Cursor Settings** for validation (optional but recommended)
5. **Keep `.cursorrules` as a hint** (don't rely on it)
6. **If a rule is critical, repeat it explicitly inside the project rule file.** (Never rely on global rules alone for product invariants.)

---

## What Is Reliable

1. `.cursor/rules/*.md` are typically auto-discovered
2. `.cursor/commands/*.md` are typically auto-discovered
3. Cursor treats repo rules as source of truth when conflicts exist
4. Codebase search finds existing patterns
5. **Explicit wording like "This file is the source of truth for this repo" significantly increases compliance.**

---

## What Is Not Guaranteed

1. `.cursorrules` may or may not be read
2. Load order is not guaranteed (though Cursor typically loads in order)
3. No automatic self-validation (unless you create User Commands)
4. `docs/` are not auto-loaded (only searched contextually)

---

## Complete Task Flow Example

**You:** "Add filtering by company name to the internships API"

**Cursor's internal process:**
1. Loads global rules (Cursor Settings) — always active globally
2. Loads `intern-tracker-mvp.md` → sees API contracts, filtering rules, "Not found" requirement
3. Loads `dev.md` → sees workflow: implement → test → verify
4. Loads `writing.md` → sees style guide
5. Searches codebase → finds `/api/internships/route.ts`, sees existing filter patterns
6. Resolves priority: repo rules override global rules (explicit in `intern-tracker-mvp.md`)
7. Generates code following all constraints
8. [Optional] Validates against Definition of Done (if User Command exists)
9. Delivers: new endpoint + tests + ready to run

**Result:** Code that follows all your rules, matches existing patterns, and is ready to test.

---

## Why This System Works

- **Reduces hallucinations** — Clear constraints prevent AI from making things up
- **Prevents feature creep** — Explicit NON-GOALS section
- **Protects data correctness** — "Never guess" rule with "Not found" fallback
- **Preserves velocity** — Workflow is clear, commands are documented
- **Keeps architecture clean** — Small composable modules enforced
- **Makes Cursor act like a disciplined junior engineer** — Follows rules, writes tests, respects constraints

This is exactly the system a founding engineer would put in place for building a real product with Cursor.

