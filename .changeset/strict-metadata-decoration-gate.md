---
"@martian-engineering/lossless-claw": patch
---

Tighten the structural same-turn supersede so it only collapses a runtime or live copy onto a bare persisted row when the copy is genuinely OpenClaw-decorated (a structurally validated injected metadata block, or the bare body under a channel timestamp), rather than whenever the content merely contains the substring "(untrusted metadata)" or ends with a line equal to the bare body. This prevents an ordinary multiline user message, or quoted metadata-looking text, from silently superseding an earlier user turn. The guard now covers both the store after-turn path and the assembly supersede path.
