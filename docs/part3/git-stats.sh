#!/bin/sh
# Prints the numbers Section 19 of the README refers to, straight from Git, so nothing is quoted from memory.
# Run from the repository root:  sh docs/part3/git-stats.sh
# Merge commits and Dependabot are left out because they are not the team's own work.
set -e
echo "Commits per author (all branches, merge commits and Dependabot excluded):"
git shortlog -sn --all --no-merges | grep -vi dependabot || true
echo
echo "Total commits counted:"
git log --all --no-merges --format=%an | grep -vi dependabot | wc -l | tr -d ' '
echo
echo "Default branch:"
git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || echo "(origin/HEAD is not set; check Settings > Branches on GitHub)"
