#!/usr/bin/env bash
# Run the workspace test suite. Pins rustc 1.90 via rust-toolchain.toml when rustup
# is on PATH. The desktop crate is skipped when GTK development files are missing,
# which is the usual case on a headless Linux box without libglib/gtk.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if command -v rustup >/dev/null 2>&1; then
  rustc_bin=(rustup run 1.90.0 rustc)
  cargo_bin=(rustup run 1.90.0 cargo)
else
  rustc_bin=(rustc)
  cargo_bin=(cargo)
fi

version="$("${rustc_bin[@]}" --version | awk '{print $2}')"
major="${version%%.*}"
minor="${version#*.}"; minor="${minor%%.*}"
if [ "${major:-0}" -lt 1 ] || { [ "$major" -eq 1 ] && [ "${minor:-0}" -lt 90 ]; }; then
  echo "AgentWeave tests need rustc 1.90 or newer (found $version)." >&2
  echo "Install it with: rustup toolchain install 1.90.0" >&2
  exit 2
fi

args=(test --workspace)
if ! command -v pkg-config >/dev/null 2>&1 || ! pkg-config --exists glib-2.0 2>/dev/null; then
  echo "Skipping agentweave-desktop: pkg-config/glib-2.0 not available."
  echo "Install pkg-config and GTK/glib development packages to include the Tauri crate."
  args+=(--exclude agentweave-desktop)
fi

echo "rustc $version"
echo "running: ${cargo_bin[*]} ${args[*]}"
"${cargo_bin[@]}" "${args[@]}"
