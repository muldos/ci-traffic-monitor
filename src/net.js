const fs = require('fs');

/**
 * Reads cumulative RX/TX byte counters from /proc/net/dev.
 * Sums all interfaces except loopback (lo).
 * Returns null on non-Linux systems.
 */
function readNetCounters() {
  const path = '/proc/net/dev';
  if (!fs.existsSync(path)) return null;

  const lines = fs.readFileSync(path, 'utf8').split('\n');
  let rx = 0;
  let tx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Inter') || trimmed.startsWith('face')) continue;

    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;

    const iface = trimmed.slice(0, colon).trim();
    if (iface === 'lo') continue;

    const fields = trimmed.slice(colon + 1).trim().split(/\s+/);
    rx += parseInt(fields[0], 10) || 0;  // RX bytes
    tx += parseInt(fields[8], 10) || 0;  // TX bytes
  }

  return { rx, tx };
}

module.exports = { readNetCounters };
