#!/usr/bin/env bash
#
# Deterministic, non-AI scan of the CURRENT tracked-file tree for
# references to automated code-generation tools (Claude, Anthropic,
# ChatGPT, OpenAI, GPT, Copilot, Gemini, LLM/"language model",
# "generative AI", "AI-generated", "vibe coding", and Arabic
# equivalents). Uses only `git grep` and POSIX text tools — no AI
# involved in the scan itself.
#
# Scope: tracked files at HEAD only. Never touches Git history (no
# rewriting, no scanning of old commits/blobs) — see
# docs/current-repository-cleanup.md.
#
# Any exclusion below is a single reviewed line, pinned by exact
# SHA-256 content hash (not a filename/directory wildcard). If the
# pinned line's content ever changes, its hash stops matching and the
# scan re-flags it for re-review — an exclusion can never silently
# widen. Add a new entry only after confirming the match is a genuine
# false positive (third-party package metadata, official regulatory
# content, or a documented platform-limitation disclosure) and
# recording the justification here. As of this writing, this repo's
# only matches are this script's own necessary self-documentation
# below (see the allowlist entries at the bottom of this array).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

PATTERN='claude|anthropic|chatgpt|openai|\bgpt\b|copilot|gemini|\bllm\b|language model|generative ai|ai-generated|vibe coding|الذكاء الاصطناعي|تم إنشاؤه بواسطة|نموذج لغوي|مساعد ذكي'

# format: <path>:<line-number>:<sha256 of the exact line content>
ALLOWLIST=(
  # This script's own header comment and PATTERN line necessarily spell
  # out the exact trigger words to document what the scan searches for
  # — inherently self-matching, and not an attribution of any kind.
  'scripts/scan-prohibited-references.sh:4:f9eb4c730a47c1cb4bffde0b6b9ebefe3938dd0e626da1dca21a382d4a24ca63'
  'scripts/scan-prohibited-references.sh:5:949478f556e1723e2ff9a66c74560b68c32e2346890e8e16d660cc280fb5e6f5'
  'scripts/scan-prohibited-references.sh:6:2dcb046d383c91bc46d14ab37df187674e25d84486b63e2964718ba64507b5f6'
  'scripts/scan-prohibited-references.sh:27:bd05f0134916815d96aaa1d7b2b813930443d6c0559ed0e966adda7feaa7dbe7'
)

is_allowed() {
  local file="$1" line="$2" content="$3"
  local content_hash
  content_hash=$(printf '%s' "$content" | shasum -a 256 | cut -d' ' -f1)
  local entry entry_file entry_line entry_hash
  # The bash-3.2 shipped on macOS (pre-4.4 behavior) treats expanding an
  # empty array under `set -u` as an unbound-variable error — the
  # `+"${ALLOWLIST[@]}"` guard keeps this portable across bash versions.
  for entry in "${ALLOWLIST[@]+"${ALLOWLIST[@]}"}"; do
    [[ -z "$entry" ]] && continue
    entry_file="${entry%%:*}"
    local rest="${entry#*:}"
    entry_line="${rest%%:*}"
    entry_hash="${rest#*:}"
    if [[ "$file" == "$entry_file" && "$line" == "$entry_line" && "$content_hash" == "$entry_hash" ]]; then
      return 0
    fi
  done
  return 1
}

violations=0
while IFS=: read -r file line content; do
  [[ -z "$file" ]] && continue
  if ! is_allowed "$file" "$line" "$content"; then
    echo "PROHIBITED REFERENCE: ${file}:${line}: ${content}"
    violations=$((violations + 1))
  fi
done < <(git grep -inE "$PATTERN" -- . ':!node_modules' 2>/dev/null || true)

if [[ "$violations" -gt 0 ]]; then
  echo ""
  echo "${violations} prohibited reference(s) found in tracked files with no matching reviewed allowlist entry."
  echo "See docs/current-repository-cleanup.md for the review process."
  exit 1
fi

echo "No unreviewed prohibited references found."
exit 0
