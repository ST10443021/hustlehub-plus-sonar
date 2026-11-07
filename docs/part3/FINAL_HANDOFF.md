# Final repository handoff

Latest reviewed application: [`7ef0cc1`](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/commit/7ef0cc1), [successful CI 30](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/actions/runs/42380128711), 7 November 2026. This README/evidence patch is a later documentation change, so keep its actual run outcome too. The root README is the main evaluation guide; supporting files provide detail and raw results.

## 1. Add the final video

When Pillar 9's recording is ready, replace the single **Final video link pending (Pillar 9)** entry in README section 19 with the real share URL. Test it with the intended assessor access, including any required signed-out/link-permission check. Do not substitute an example URL or state that the recording is complete before it is available.

The recording must show authentication, gig creation, client booking/viewing and transaction recording. Also show the final dashboard/tax information, the two extra security controls, containers, the successful pipeline/static-analysis evidence and actual Azure events so the Part 3 work is easy to assess.

## 2. Review the actual repository state

Run these read-only commands from the real checkout. This patch snapshot contains no `.git` history and cannot supply its live counts or tracked-file status:

```powershell
git branch --show-current
git status --short
git log -1 --oneline
git rev-list --count HEAD
git shortlog -s HEAD
git ls-files -- .env "**/.env" "*.pem" "*.key" "*.pfx" "*.p12"
```

Review the intended branch/commit and any uncommitted work. The last command should list no real environment/credential/key files; if it returns paths, inspect them privately and resolve the issue before submission. Never paste the contents of secrets. This path check is not a full history/content secret scan; the Trivy repository reports also do not prove that no secret was ever committed. Investigate a known exposure and rotate affected credentials if one is found; do not rewrite shared history without team agreement.

The highest GitHub rubric band refers to 75+ meaningful commits, clear messages and multiple contributors. A raw commit total or shortlog is evidence to review, not automatic proof of meaningful work or individual authorship. Keep the existing history; do not manufacture commits to reach a number.

## 3. Keep evidence accessible

The [CI 30 review](evidence/ci-30-7ef0cc1/REVIEW.md) contains the actual reports and verification records. Keep the supplied pipeline/Azure/dashboard screenshots with submission materials or show the relevant screens in the final demo. Existing repository logging/security screenshots remain linked. Portal screenshots containing account headers should be reviewed before sharing; the patch records only selected event rows in text.

The browser HTML report can be downloaded and opened locally. GitHub's private run, source and artifact links require appropriate repository access; verify the assessor can access the submitted Classroom repository. Local Docker execution supports evaluation; public hosting remains optional.

## 4. Review and submit the final version

Push only your own named branch. Follow the team's PR/review process for `main`; creating a patch or pushing `blake` does not merge it. Verify required application changes are present in the branch actually submitted, not only in an unmerged member branch. Record that version and keep a green run for it. Later application/dependency changes need appropriate checks; do not relabel old reports with a new commit.

Retain the root README, pipeline config, Dockerfiles/Compose, analysis reports, logging evidence, extra-feature/security explanations and accessible video link in the final submission. The 12 documented backend development-tool entries remain scoped residual risks, not repaired or hidden findings. Final grading is determined by the assessor against the PoE rubric.
