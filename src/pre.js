const core = require('@actions/core');
const { readNetCounters } = require('./net');
const { setup } = require('./classify');

async function main() {
  const counters = readNetCounters();
  if (!counters) {
    core.warning('CI Traffic Monitor: /proc/net/dev not available (non-Linux runner). Skipping.');
    return;
  }

  core.saveState('rxBytes', counters.rx.toString());
  core.saveState('txBytes', counters.tx.toString());
  core.info(`Traffic monitor started — baseline RX: ${counters.rx} B, TX: ${counters.tx} B`);

  try {
    const activeKeys = await setup();
    if (activeKeys && activeKeys.length > 0) {
      core.saveState('classifyKeys', JSON.stringify(activeKeys));
      core.info(`Traffic classification active for: ${activeKeys.join(', ')}`);
    } else {
      core.info('Traffic classification unavailable (iptables not accessible or no IPs resolved).');
    }
  } catch (e) {
    core.warning(`Traffic classification setup failed: ${e.message}`);
  }
}

main().catch(core.error);
