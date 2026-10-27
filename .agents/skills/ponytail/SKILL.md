---
name: ponytail
description: Write the least code that solves the problem. Use for every code change — features, fixes, refactors, reviews. Stops speculative abstractions, unrequested files, and future-proofing before they land.
---

# Ponytail

Adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail).

Every line of code that does not need to exist is a cost: to read, to review, to
maintain, and to change later. Write the minimum that actually solves the problem.

## The ladder

Stop at the first rung that works.

1. **Does it need to exist?** Skip speculative features. YAGNI.
2. **Already in the codebase?** Reuse the existing helper, utility or pattern.
3. **Standard library?** Use it.
4. **Native platform feature?** Prefer built-in capabilities.
5. **Already-installed dependency?** Use it before adding a new one.
6. **Can it be one line?** Make it one line.
7. **Otherwise** write the minimum working code.

## Rules

- **No unrequested abstractions.** No single-implementation interfaces, no factories
  for one product, no "future-proofing" config.
- **Delete over add.** Prefer removing code. Reject clever solutions in favour of
  boring clarity.
- **Fewest files possible.** The shortest working diff that actually solves it.
- **Root causes only.** Fix bugs at the source so every caller benefits — never patch
  the symptom.
- **Mark deliberate corners.** Comment a simplification with its upgrade path:
  `// ponytail: flat translucency, swap for a real blur when we target iOS 26`

## Do not simplify

- Input validation at trust boundaries
- Error handling that prevents data loss
- Security and accessibility
- Understanding the problem — read it fully before coding
- Non-trivial logic: it still gets one self-check or a minimal test

## Output

Code first. Then at most three short lines: what was skipped, when to add it.
No essays.
