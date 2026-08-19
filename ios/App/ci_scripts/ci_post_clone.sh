#!/bin/zsh
# Xcode Cloud runs this immediately after cloning the repo, BEFORE it
# resolves the Xcode project's Swift Package dependencies.
#
# ios/App/CapApp-SPM/Package.swift (managed by `cap sync`, do not hand-edit)
# references every @capacitor/* plugin via a *local filesystem path* into
# node_modules/ — that's how Capacitor 8 wires SPM plugins. node_modules is
# gitignored, so on a fresh Xcode Cloud clone those paths don't exist yet,
# and Xcode Cloud's automatic "Check project configuration" step fails with
# "Could not resolve package dependencies" / "cannot be accessed" for every
# @capacitor/* package before this script (or any custom script) would
# normally get a chance to run again.
#
# Fix: install npm deps and rebuild the web bundle here, in ci_post_clone,
# which Xcode Cloud runs *before* package resolution — so by the time it
# resolves CapApp-SPM's local path dependencies, node_modules/@capacitor/*
# already exists.
#
# Location matters: Xcode Cloud only looks for ci_scripts next to the
# .xcodeproj/.xcworkspace it's building (ios/App/App.xcodeproj here), or at
# the repo root — this file must stay at ios/App/ci_scripts/ci_post_clone.sh.
set -e

# Xcode Cloud sets this to the repo root (e.g. /Volumes/workspace/repository) —
# the same prefix seen in the failing package paths.
if [ -z "$CI_PRIMARY_REPOSITORY_PATH" ]; then
  echo "error: CI_PRIMARY_REPOSITORY_PATH is not set — this script is meant to run on Xcode Cloud."
  exit 1
fi
cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "== Node/npm =="
if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found on this image — installing Node via Homebrew"
  brew install node
fi
node -v
npm -v

echo "== npm ci =="
npm ci

echo "== Building the Capacitor web bundle =="
npm run build:mobile

echo "== cap sync ios (refresh native web assets / plugin list) =="
npx cap sync ios

echo "ci_post_clone.sh: done — node_modules/@capacitor/* now present for SPM resolution."
