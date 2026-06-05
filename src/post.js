const core = require('@actions/core');
const { readNetCounters } = require('./net');
const { read, cleanup } = require('./classify');

const toMB = (b) => (b / (1024 * 1024)).toFixed(2);

async function main() {
  const rxStart = parseInt(core.getState('rxBytes'), 10);
  const txStart = parseInt(core.getState('txBytes'), 10);

  if (isNaN(rxStart) || isNaN(txStart)) {
    core.warning('CI Traffic Monitor: no baseline data found (pre-step may have been skipped).');
    return;
  }

  const counters = readNetCounters();
  if (!counters) {
    core.warning('CI Traffic Monitor: /proc/net/dev not available. Skipping report.');
    return;
  }

  const rxTotal = counters.rx - rxStart;
  const txTotal = counters.tx - txStart;

  core.info(`Network traffic — IN: ${toMB(rxTotal)} MB | OUT: ${toMB(txTotal)} MB | TOTAL: ${toMB(rxTotal + txTotal)} MB`);

  // --- Job Summary ---
  const s = core.summary.addHeading('Network Traffic Report', 2);

  // Global totals table
  s.addTable([
    [
      { data: 'Direction',    header: true },
      { data: 'Bytes',        header: true },
      { data: 'MB',           header: true },
    ],
    ['Inbound (RX)',  rxTotal.toString(),             toMB(rxTotal)],
    ['Outbound (TX)', txTotal.toString(),             toMB(txTotal)],
    ['Total',         (rxTotal + txTotal).toString(), toMB(rxTotal + txTotal)],
  ]);

  // Per-service breakdown (if iptables classification was active)
  const classifyKeysJson = core.getState('classifyKeys');
  if (classifyKeysJson) {
    try {
      const activeKeys = JSON.parse(classifyKeysJson);
      const classified = read(activeKeys);
      cleanup(activeKeys);

      let classifiedRx = 0;
      let classifiedTx = 0;
      const rows = [
        [
          { data: 'Category',       header: true },
          { data: 'Inbound (MB)',   header: true },
          { data: 'Outbound (MB)',  header: true },
          { data: 'Total (MB)',     header: true },
        ],
      ];

      for (const data of Object.values(classified)) {
        if (data.rx > 0 || data.tx > 0) {
          rows.push([data.label, toMB(data.rx), toMB(data.tx), toMB(data.rx + data.tx)]);
          classifiedRx += data.rx;
          classifiedTx += data.tx;
        }
      }

      const unknownRx = Math.max(0, rxTotal - classifiedRx);
      const unknownTx = Math.max(0, txTotal - classifiedTx);
      rows.push(['Unknown / other', toMB(unknownRx), toMB(unknownTx), toMB(unknownRx + unknownTx)]);

      s.addHeading('Traffic Breakdown (best-effort)', 3)
       .addTable(rows)
       .addRaw('\n> Classification is best-effort: CDN-backed services may partially appear under "Unknown".\n');
    } catch (e) {
      core.warning(`Failed to read classified traffic: ${e.message}`);
    }
  }

  s.addRaw('> Measured via `/proc/net/dev` (all interfaces except loopback)');
  await s.write();
}

main().catch(core.error);
