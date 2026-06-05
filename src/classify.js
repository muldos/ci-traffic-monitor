const { execSync } = require('child_process');
const dns = require('dns').promises;

// Known services to classify by resolving their hostnames to IPs.
// Classification is best-effort: CDN-backed services rotate IPs.
const SERVICES = {
  npm:    { label: 'npm',        hosts: ['registry.npmjs.org', 'registry.yarnpkg.com'] },
  docker: { label: 'Docker Hub', hosts: ['registry-1.docker.io', 'auth.docker.io', 'index.docker.io'] },
  ghcr:   { label: 'GHCR',       hosts: ['ghcr.io'] },
  github: { label: 'GitHub',     hosts: ['github.com', 'api.github.com', 'objects.githubusercontent.com', 'uploads.github.com'] },
  apt:    { label: 'apt/Ubuntu', hosts: ['archive.ubuntu.com', 'security.ubuntu.com', 'packages.microsoft.com'] },
};

const PREFIX = 'CTM'; // CI Traffic Monitor — iptables chain prefix

const chainOut = (key) => `${PREFIX}_${key.toUpperCase()}_O`;
const chainIn  = (key) => `${PREFIX}_${key.toUpperCase()}_I`;

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
 * Resolves service IPs via DNS and creates iptables counting chains.
 * Returns the list of successfully set-up service keys, or null if iptables unavailable.
 */
async function setup() {
  if (!iptablesAvailable()) return null;

  const activeKeys = [];

  for (const [key, { hosts }] of Object.entries(SERVICES)) {
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

    run(`sudo iptables -N ${co}`);
    run(`sudo iptables -N ${ci}`);

    for (const ip of ips) {
      run(`sudo iptables -A ${co} -d ${ip} -j RETURN`);
      run(`sudo iptables -A ${ci} -s ${ip} -j RETURN`);
    }

    // Insert jump at the top of OUTPUT / INPUT so our chains see all packets
    run(`sudo iptables -I OUTPUT 1 -j ${co}`);
    run(`sudo iptables -I INPUT  1 -j ${ci}`);

    activeKeys.push(key);
  }

  return activeKeys;
}

/**
 * Sums the bytes column from `iptables -L <chain> -v -x -n` output.
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
 * Returns { <key>: { label, rx, tx } }
 */
function read(activeKeys) {
  const result = {};
  for (const key of activeKeys) {
    result[key] = {
      label: SERVICES[key].label,
      rx: chainBytes(chainIn(key)),
      tx: chainBytes(chainOut(key)),
    };
  }
  return result;
}

/**
 * Removes all CTM_* chains and their jump rules from OUTPUT/INPUT.
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

module.exports = { setup, read, cleanup, SERVICES };
