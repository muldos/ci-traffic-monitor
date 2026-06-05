const core = require('@actions/core');
const { readNetCounters } = require('./net');

const counters = readNetCounters();

if (!counters) {
  core.warning('CI Traffic Monitor: /proc/net/dev not available (non-Linux runner). Skipping.');
  process.exit(0);
}

core.saveState('rxBytes', counters.rx.toString());
core.saveState('txBytes', counters.tx.toString());
core.info(`Traffic monitor started — baseline RX: ${counters.rx} B, TX: ${counters.tx} B`);
