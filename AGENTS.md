<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Committing

This is a hobby project. Commit and push whenever you've finished something that
builds — no need to ask first.

Everything goes straight to `main`. No dev branch, no PR to wait on: merge and
push as soon as it builds, even though `main` deploys to production
(bansko-dashboard.vercel.app). Work done in a worktree branch gets merged into
`main` at the end of the task rather than left sitting there.

# There is no dev environment

Not a dev branch, not a staging site, and nothing on Vercel either: **Production
is the only Vercel environment**. Don't set env vars on Preview or Development,
don't suggest verifying on a staging URL, and don't propose a promote-from-preview
step — none of that exists here.

Verification is: run it locally, then merge to `main` and check the production
URL. `NEXT_PUBLIC_*` values are inlined at build time, so changing one in the
Vercel project needs a redeploy (`vercel redeploy <latest-prod-url> --scope
jaap-oosterbroeks-projects`) before it shows up.
