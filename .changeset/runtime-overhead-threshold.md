---
"@martian-engineering/lossless-claw": patch
---

Account for runtime prompt overhead when threshold compaction is triggered from an observed token count. Lossless now compares Codex's live prompt count against its persisted context count and compacts far enough to cover the observed gap instead of clearing threshold debt while the live prompt may still be over target.
