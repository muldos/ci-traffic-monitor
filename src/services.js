/**
 * Service registry for traffic classification.
 *
 * Classification works by resolving each hostname to IPs at job start,
 * then counting bytes in iptables chains. This means:
 *
 *   - Public services with stable or CDN FQDNs: well supported
 *   - Self-hosted Artifactory / Nexus on custom domains: NOT classifiable
 *     (HTTPS encrypts URLs, SNI matching is possible but not implemented)
 *   - JFrog Cloud (*.jfrog.io): classifiable only if the specific subdomain
 *     is listed in `hosts` below — add your org's hostname there
 *
 * To add a custom service, append an entry following the same schema.
 *
 * Fields:
 *   key    - unique identifier, max 10 chars (used as iptables chain suffix)
 *   label  - display name in the job summary report
 *   group  - section header in the report
 *   hosts  - FQDNs resolved to IPs for iptables accounting
 */

module.exports = [

  // ── Package managers ──────────────────────────────────────────────────────

  {
    key: 'npm',
    label: 'npm / Yarn',
    group: 'Package managers',
    hosts: [
      'registry.npmjs.org',
      'registry.yarnpkg.com',
      'registry.npmjs.com',
    ],
  },
  {
    key: 'maven',
    label: 'Maven / Gradle',
    group: 'Package managers',
    hosts: [
      // Maven Central
      'repo1.maven.org',
      'repo.maven.apache.org',
      // Sonatype OSSRH (legacy + new portal)
      'oss.sonatype.org',
      's01.oss.sonatype.org',
      'central.sonatype.com',
      'repo.sonatype.org',
      // Google Maven
      'maven.google.com',
      // Gradle
      'plugins.gradle.org',
      'services.gradle.org',
      'downloads.gradle.org',
      'downloads.gradle-dn.com',
      // Spring
      'repo.spring.io',
      // JCenter (deprecated 2021, still widely referenced)
      'jcenter.bintray.com',
      'dl.bintray.com',
    ],
  },
  {
    key: 'pypi',
    label: 'PyPI',
    group: 'Package managers',
    hosts: [
      'pypi.org',
      'files.pythonhosted.org',
      'pypi.python.org',          // legacy alias
    ],
  },
  {
    key: 'rubygems',
    label: 'RubyGems',
    group: 'Package managers',
    hosts: [
      'rubygems.org',
      'api.rubygems.org',
      'index.rubygems.org',
      'bundler.rubygems.org',
    ],
  },
  {
    key: 'cargo',
    label: 'Cargo (crates.io)',
    group: 'Package managers',
    hosts: [
      'crates.io',
      'static.crates.io',
    ],
  },
  {
    key: 'gomod',
    label: 'Go modules',
    group: 'Package managers',
    hosts: [
      'proxy.golang.org',
      'sum.golang.org',
      'goproxy.io',
    ],
  },
  {
    key: 'nuget',
    label: 'NuGet',
    group: 'Package managers',
    hosts: [
      'api.nuget.org',
      'www.nuget.org',
      'globalcdn.nuget.org',
      'nuget.org',
    ],
  },
  {
    key: 'packagist',
    label: 'Composer / Packagist',
    group: 'Package managers',
    hosts: [
      'packagist.org',
      'repo.packagist.org',
    ],
  },
  {
    key: 'hex',
    label: 'Hex (Elixir/Erlang)',
    group: 'Package managers',
    hosts: [
      'repo.hex.pm',
      'hexdocs.pm',
    ],
  },

  // ── Artifact repositories ─────────────────────────────────────────────────
  //
  // Self-hosted Artifactory/Nexus: traffic appears under "Unknown" unless you
  // add the FQDN of your instance to the hosts list of a custom entry here.
  // JFrog Cloud: replace <your-org> with your actual subdomain.

  {
    key: 'cloudsmith',
    label: 'Cloudsmith',
    group: 'Artifact repos',
    hosts: [
      'dl.cloudsmith.io',
      'api.cloudsmith.io',
      'docker.cloudsmith.io',
    ],
  },
  {
    key: 'jfrog',
    label: 'JFrog Cloud (*.jfrog.io)',
    group: 'Artifact repos',
    hosts: [
      // JFrog SaaS infrastructure (shared CDN layer)
      'releases.jfrog.io',
      'downloads.jfrog.io',
      // Add your org-specific subdomain, e.g.: 'mycompany.jfrog.io'
    ],
  },
  {
    key: 'packagecloud',
    label: 'packagecloud.io',
    group: 'Artifact repos',
    hosts: [
      'packagecloud.io',
      'packagecloud-repositories.s3.amazonaws.com',
    ],
  },
  {
    key: 'gemfury',
    label: 'Gemfury / Fury.io',
    group: 'Artifact repos',
    hosts: [
      'repo.fury.io',
      'gem.fury.io',
      'pypi.fury.io',
      'npm.fury.io',
    ],
  },

  // ── Container registries ──────────────────────────────────────────────────

  {
    key: 'dockerhub',
    label: 'Docker Hub',
    group: 'Container registries',
    hosts: [
      'registry-1.docker.io',
      'auth.docker.io',
      'index.docker.io',
      'production.cloudflare.docker.com',
      'docker.io',
    ],
  },
  {
    key: 'ghcr',
    label: 'GHCR',
    group: 'Container registries',
    hosts: [
      'ghcr.io',
    ],
  },
  {
    key: 'quay',
    label: 'Quay.io',
    group: 'Container registries',
    hosts: [
      'quay.io',
      'cdn01.quay.io',
      'cdn02.quay.io',
      'cdn03.quay.io',
    ],
  },
  {
    key: 'ecrpublic',
    label: 'Amazon ECR Public',
    group: 'Container registries',
    hosts: [
      'public.ecr.aws',
    ],
  },
  {
    key: 'mcr',
    label: 'Microsoft MCR',
    group: 'Container registries',
    hosts: [
      'mcr.microsoft.com',
    ],
  },

  // ── SCM / CI / cloud storage ──────────────────────────────────────────────

  {
    key: 'github',
    label: 'GitHub',
    group: 'SCM / CI',
    hosts: [
      'github.com',
      'api.github.com',
      'objects.githubusercontent.com',
      'uploads.github.com',
      'codeload.github.com',
      'raw.githubusercontent.com',
      'releases.githubusercontent.com',
    ],
  },

  // ── OS packages ───────────────────────────────────────────────────────────

  {
    key: 'apt',
    label: 'apt / Ubuntu',
    group: 'OS packages',
    hosts: [
      'archive.ubuntu.com',
      'security.ubuntu.com',
      'packages.microsoft.com',
      'ppa.launchpad.net',
      'esm.ubuntu.com',
    ],
  },
];
