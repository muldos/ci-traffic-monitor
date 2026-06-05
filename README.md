# CI Traffic Monitor

A GitHub Action that measures inbound and outbound network traffic during a workflow run.

## Usage

Add a single line as your **first step**. The rest of your workflow is unchanged.

```yaml
steps:
  - uses: muldos/ci-traffic-monitor@v1   # ← only line to add

  - name: Build Docker image
    run: docker build .

  - name: Run tests
    run: npm test
```

At the end of the job, a traffic report is printed in the logs and written to the **job summary**.

### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `detailed` | `false` | Enable per-service traffic breakdown. Requires `sudo` and `iptables` on the runner. |

### Default mode — totals only (no elevated permissions required)

```yaml
- uses: muldos/ci-traffic-monitor@v1
```

| Direction    | Bytes     | MB     |
|--------------|-----------|--------|
| Inbound (RX) | 104857600 | 100.00 |
| Outbound (TX)|   1048576 |   1.00 |
| Total        | 105906176 | 101.00 |

### Detailed mode — per-service breakdown (requires `sudo`/`iptables`)

```yaml
- uses: muldos/ci-traffic-monitor@v1
  with:
    detailed: 'true'
```

Adds a breakdown table by service (npm, Maven, Docker Hub, GHCR, PyPI, etc.),
grouped by category. Services with zero traffic are omitted.
Classification is best-effort: CDN-backed services may partially appear under "Unknown".

## How it works

This action uses the GitHub Actions **pre/post hook** mechanism:

- **pre** (runs before any step): reads `/proc/net/dev` and saves the byte counters to job state.
- **post** (runs after all steps): reads `/proc/net/dev` again, computes the delta, and reports.

Because `pre` runs at job setup time (before your first step) and `post` runs at teardown time (after your last step), traffic from **all** steps is captured — including Docker image pulls and builds.

```
Job start
  └─ pre (baseline snapshot)
       ├─ your step 1
       ├─ your step 2
       └─ ...
  └─ post (final snapshot → report)
Job end
```

## Compatibility

| Runner        | Supported |
|---------------|-----------|
| ubuntu-*      | ✅        |
| windows-*     | ❌ (no /proc) |
| macos-*       | ❌ (no /proc) |

On unsupported runners the action exits gracefully with a warning.

## Development

```bash
npm install
npm run build   # bundles src/ → dist/ using @vercel/ncc
```

The `dist/` directory must be committed — it is what GitHub Actions executes.
