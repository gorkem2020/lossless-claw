---
"@martian-engineering/lossless-claw": patch
---

Unfreeze anchored transcript reconcile when the backlog exceeds the import cap.

A session whose transcript grew past the reconcile import cap (e.g. heavy
old-harness history) froze permanently: every pass logged "import cap
exceeded ... Aborting to prevent flood", imported nothing, and afterTurn
skipped persistence to avoid advancing the frontier — while the backlog kept
growing faster than the cap ever could. The live incident left a main-topic
conversation with 1,700+ unpersisted messages and silent data loss on every
turn.

When the missing tail is anchored (lineage proven by an identity anchor in
this conversation), reconcile now imports a bounded oldest-first chunk per
pass instead of aborting: order is preserved, per-pass flood exposure stays
capped, the growing message count raises the cap, and repeated passes
converge until the backlog drains. The checkpoint/frontier still does not
advance while a pass is capped. No-anchor caps (unproven lineage, e.g.
path-mismatched epochs) still block entirely. Telemetry: the warn line is now
"import cap chunking ... importing N/M anchored backlog messages this pass".
