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

Extended after the entry-id reconciliation rework (#854): the same chunked
drain now applies to the entry-id anchored path — which carries 100% of
current-format traffic and had the same permanent-freeze shape — and to
fully id-bearing no-anchor epochs (declared rollovers), where every entry
adopts or imports by verified id, so a kept tail beyond the cap drains in
bounded passes instead of freezing before stale-id adoption can heal it.
After the first chunk persists ids, the entry-id anchor takes over on
subsequent passes. Id-less no-anchor batches still block entirely.
