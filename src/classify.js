const { execSync } = require('child_process');
const dns = require('dns').promises;
const SERVICES = require('./services');

// iptables chain names: CTM_<KEY>_O (OUTPUT) and CTM_<KEY>_I (INPUT)
// Max iptables chain name length: 28 chars. Keys must be ≤ 10 chars.
const chainOut = (key) => `CTM_${key.toUpperCase()}_O`;
const chainIn  = (key) => `CTM_${key.toUpperCase()}_I`;

function run(cmd) {
  try { execSync(cmd, { stdio: 'pipe' }); return true; }
  catch { return false; }
}

function runOut(cmd) {
  try { return execSync(cmd, { stdio: 'pipe' }).toString(); }
  catch { return ''; }
}

function iptablesAvailable() {
  return run('sudo iptables -L OUTPUT -n > /dev/null 2>&1');
}

/**
 * Resolves service hostnames to IPs and sets up iptables counting chains.
 * Returns the list of service keys that were successfully set up, or null
 * if iptables is unavailable.
 */
async function setup() {
  if (!iptablesAvailable()) return null;

  const activeKeys = [];

  for (const svc of SERVICES) {
    const { key, hosts } = svc;

    const ips = new Set();
    for (const host of hosts) {
      try {
        const addrs = await dns.resolve4(host);
        for (const ip of addrs) ips.add(ip);
      } catch { /* DNS failure — skip host */ }
    }
    if (ips.size === 0) continue;

    const co = chainOut(key);
    const ci = chainIn(key);

    // Create chains (silently ignore if they already exist)
    run(`sudo iptables -N ${co}`);
    run(`sudo iptables -N ${ci}`);

    for (const ip of ips) {
      run(`sudo iptables -A ${co} -d ${ip} -j RETURN`);
      run(`sudo iptables -A ${ci} -s ${ip} -j RETURN`);
    }

    // Insert jump rules at the top of OUTPUT / INPUT
    run(`sudo iptables -I OUTPUT 1 -j ${co}`);
    run(`sudo iptables -I INPUT  1 -j ${ci}`);

    activeKeys.push(key);
  }

  return activeKeys;
}

/**
 * Sums bytes from all rules in an iptables chain.
 * `iptables -L <chain> -v -x -n` columns: pkts bytes target prot ...
 */
function chainBytes(chain) {
  const output = runOut(`sudo iptables -L ${chain} -v -x -n`);
  let total = 0;
  for (const line of output.split('\n').slice(2)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const b = parseInt(parts[1], 10);
      if (!isNaN(b)) total += b;
    }
  }
  return total;
}

/**
 * Reads classified byte counts for each active service key.
 * Returns { <key>: { label, group, rx, tx } }
 */
function read(activeKeys) {
  const serviceMap = Object.fromEntries(SERVICES.map(s => [s.key, s]));
  const result = {};
  for (const key of activeKeys) {
    const svc = serviceMap[key];
    result[key] = {
      label: svc.label,
      group: svc.group,
      rx: chainBytes(chainIn(key)),
      tx: chainBytes(chainOut(key)),
    };
  }
  return result;
}

/**
 * Removes all CTM_* chains and their jump rules from OUTPUT / INPUT.
 */
function cleanup(activeKeys) {
  for (const key of activeKeys) {
    const co = chainOut(key);
    const ci = chainIn(key);
    run(`sudo iptables -D OUTPUT -j ${co}`);
    run(`sudo iptables -D INPUT  -j ${ci}`);
    run(`sudo iptables -F ${co}`);
    run(`sudo iptables -F ${ci}`);
    run(`sudo iptables -X ${co}`);
    run(`sudo iptables -X ${ci}`);
  }
}

module.exports = { setup, read, cleanup };
