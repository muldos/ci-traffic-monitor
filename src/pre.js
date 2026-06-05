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

  const detailed = core.getInput('detailed') === 'true';
  if (!detailed) {
    core.info('Detailed breakdown disabled. Set detailed: true to enable per-service classification (requires sudo/iptables).');
    return;
  }

  try {
    const activeKeys = await setup();
    if (activeKeys && activeKeys.length > 0) {
      core.saveState('classifyKeys', JSON.stringify(activeKeys));
      core.info(`Traffic classification active for: ${activeKeys.join(', ')}`);
    } else {
      core.warning('Traffic classification: iptables unavailable or no IPs resolved. Falling back to totals only.');
    }
  } catch (e) {
    core.warning(`Traffic classification setup failed: ${e.message}`);
  }
}

main().catch(core.error);
