const core = require('@actions/core');
const { readNetCounters } = require('./net');

const rxStart = parseInt(core.getState('rxBytes'), 10);
const txStart = parseInt(core.getState('txBytes'), 10);

if (isNaN(rxStart) || isNaN(txStart)) {
  core.warning('CI Traffic Monitor: no baseline data found (pre-step may have been skipped).');
  process.exit(0);
}

const counters = readNetCounters();
if (!counters) {
  core.warning('CI Traffic Monitor: /proc/net/dev not available. Skipping report.');
  process.exit(0);
}

const rxBytes = counters.rx - rxStart;
const txBytes = counters.tx - txStart;
const totalBytes = rxBytes + txBytes;

const toMB = (b) => (b / (1024 * 1024)).toFixed(2);

core.info(`Network traffic — IN: ${toMB(rxBytes)} MB | OUT: ${toMB(txBytes)} MB | TOTAL: ${toMB(totalBytes)} MB`);

async function writeSummary() {
  await core.summary
    .addHeading('Network Traffic Report', 2)
    .addTable([
      [
        { data: 'Direction', header: true },
        { data: 'Bytes', header: true },
        { data: 'MB', header: true },
      ],
      ['Inbound (RX)',  rxBytes.toString(),    toMB(rxBytes)],
      ['Outbound (TX)', txBytes.toString(),   toMB(txBytes)],
      ['Total',         totalBytes.toString(), toMB(totalBytes)],
    ])
    .addRaw('\n> Measured via `/proc/net/dev` (all interfaces except loopback)')
    .write();
}

writeSummary().catch(core.error);
