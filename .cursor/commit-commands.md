# Granular commit commands

Paste into terminal from synapp project root. If you already have a single squashed commit, run the reset first.

```bash
# Optional: undo last commit and unstage (run only if redoing)
git reset --soft HEAD~1 && git reset HEAD

git add package.json && git commit -m "chore(deps): bump pnpm to 10.29.3"
git add "apps/bullyproof/app/(main)/schools/[school_id]/classes/page.tsx" && git commit -m "feat(classes): add toast feedback and extract ClassCard with improved UX"
git add apps/bullyproof/components/organisms/lesson-feedback-form.tsx && git commit -m "refactor(lesson-feedback): improve form layout and add rating labels"
git add apps/bullyproof/components/organisms/lesson-wizard-confirm.tsx apps/bullyproof/components/organisms/lesson-wizard-recommendation.tsx apps/bullyproof/components/organisms/lesson-wizard.tsx && git commit -m "refactor(lesson-wizard): redesign confirm and recommendation steps"
git add apps/bullyproof/components/organisms/presentation-mode.tsx apps/bullyproof/entities/lessons/ui/lesson-card.tsx "apps/bullyproof/app/(present)/schools/[school_id]/lessons/[lesson_id]/deliver/present/page.tsx" "apps/bullyproof/app/(present)/schools/[school_id]/lessons/[lesson_id]/run-lesson/present/page.tsx" && git commit -m "feat(presentation): redesign topic completion slide with lesson card"
git push origin master
```
