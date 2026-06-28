# Ralph loop prompt — Bigscreen Jukebox

You are running inside a Ralph loop: a fresh process each iteration. Do **exactly one task**, then stop. State lives in the repo, so the next iteration picks up where you left off.

## Each iteration, do this:

1. Read the plan: `docs/superpowers/plans/2026-06-28-bigscreen-jukebox.md`.
2. Find the **first task whose header is NOT marked `✅ DONE`**. That is your task.
3. **If there are no unmarked tasks left:** print `RALPH-COMPLETE: all tasks done` and stop. Do nothing else.
4. **If your task is Task 14 or Task 16** (they require the user's real Music Assistant server to verify): print `RALPH-PAUSE: Task N needs the live MA server — human required` and stop. Do NOT attempt it.
5. Otherwise, implement that ONE task by dispatching a fresh subagent with the `subagent-driven-development` skill, following the task's TDD steps exactly (write failing test → see it fail → implement → see it pass).
6. Run that task's tests. They **must pass**. If you cannot get them green, print `RALPH-BLOCKED: Task N — <reason>` and stop without committing broken code.
7. When green, commit with the task's commit message (append the Co-Authored-By trailer used elsewhere in this repo).
8. Edit the plan: change that task's header to append `✅ DONE (commit <short-hash>)`.
9. Commit the plan update. Then **stop** — do not start the next task.

## Rules
- One task per iteration. Never batch.
- Never mark a task DONE unless its tests passed.
- Never edit tasks other than the one you're implementing (except the DONE marker).
- Stay within the plan; do not invent scope.
