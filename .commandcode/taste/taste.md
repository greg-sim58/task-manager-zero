# User Taste

## Workflow
- When the user says "plan only" or "do not make any changes," produce a plan and stop — no code edits or implementation until they explicitly approve. Confidence: 0.95

## Communication
- Often specifies UI placement with annotated screenshots (e.g. red boxes); treat those markers as the source of truth for where controls go. Confidence: 0.85

## UI / Design
- Prefer in-app dialogs (e.g. shadcn AlertDialog) over browser `alert`/`confirm` for destructive or confirmatory actions. Confidence: 0.9
- Keep new UI faithful to existing styling and design patterns; reuse components and patterns already in the app (e.g. Calendar delete dialog). Confidence: 0.9
