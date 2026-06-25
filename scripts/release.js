#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const autoYes = args.includes('--yes') || args.includes('-y');
const skipPublish = args.includes('--no-publish');
const otpArg = args.find(a => a.startsWith('--otp='));
const otp = otpArg ? otpArg.split('=')[1] : '';
const version = args.find(arg => !arg.startsWith('-'));

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Release skeleton-crew to npm + git.

Usage: node scripts/release.js <version> [options]
       npm run release -- <version> [options]

Arguments:
  <version>        Target version, x.y.z (e.g. 0.7.1). Must be > the published version.

Options:
  --dry-run        Print every step without writing, committing, publishing, or pushing.
  --yes, -y        Non-interactive: skip both confirmation prompts (for CI). Implied by --dry-run.
  --otp=XXXXXX     Pass a one-time password through to \`npm publish\` (npm 2FA accounts).
  --no-publish     Do everything EXCEPT \`npm publish\` (bump, changelog, commit, tag, push).
  --help, -h       Show this help.

Pipeline (in order):
  validate -> bump package.json -> sync README -> generate CHANGELOG entry
  -> [confirm] -> test -> build -> commit + tag -> npm publish -> [confirm] -> push

The publish step runs BEFORE the push, so a failed publish leaves nothing pushed —
just a local commit + tag you can reset. The tag therefore only ever marks a
genuinely-published release.

Examples:
  npm run release:dry -- 0.7.1                 # full rehearsal, no side effects
  npm run release -- 0.7.1                     # interactive release
  npm run release -- 0.7.1 --yes               # unattended (no npm 2FA)
  npm run release -- 0.7.1 --yes --otp=123456  # unattended with 2FA OTP`);
  process.exit(0);
}

if (!version) {
  console.error('Usage: node scripts/release.js <version> [options]   (see --help)');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Version must be in format x.y.z (e.g., 0.7.1)');
  process.exit(1);
}

// otp is interpolated into the publish shell command, so constrain it to the
// npm OTP shape (digits) — never let an arbitrary string reach the shell.
if (otp && !/^\d{6,8}$/.test(otp)) {
  console.error('--otp must be a 6–8 digit one-time password.');
  process.exit(1);
}

// In a dry run there is nothing to confirm, so behave as if --yes was passed.
const noPrompt = autoYes || isDryRun;
const tag = `v${version}`;

// Helper functions
function execute(command, options = {}) {
  if (isDryRun) {
    console.log(`[DRY RUN] Would execute: ${command}`);
    return '';
  }
  return execSync(command, options);
}

function executeReturn(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

function writeFile(path, content) {
  if (isDryRun) {
    console.log(`[DRY RUN] Would write to: ${path}`);
    return;
  }
  writeFileSync(path, content);
}

async function promptConfirmation(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/** Compare two x.y.z strings. Returns 1 if a>b, -1 if a<b, 0 if equal. */
function cmpVersion(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

(async () => {
  try {
    if (isDryRun) console.log('🧪 DRY RUN MODE — no files written, nothing published or pushed.');
    console.log(`🚀 Preparing release ${tag}...`);

    // 1. Git checks (branch + clean tree)
    const currentBranch = executeReturn('git branch --show-current');
    if (currentBranch !== 'main') throw new Error(`Must be on main branch (currently "${currentBranch}")`);

    // A release must start from a clean tree: the script itself produces the
    // only diffs (package.json / README / CHANGELOG), and it commits+tags them.
    // Stray uncommitted changes would silently ride along in that commit.
    const status = executeReturn('git status --porcelain');
    if (status && !isDryRun) {
      throw new Error(
        'Working tree is not clean. Commit or stash changes before releasing:\n' + status
      );
    }

    // 1b. Version must move forward past what is already published.
    const publishedVersion = executeReturn('npm view skeleton-crew version');
    if (publishedVersion) {
      const c = cmpVersion(version, publishedVersion);
      if (c < 0) throw new Error(`Target ${version} is OLDER than published ${publishedVersion}.`);
      if (c === 0) throw new Error(`Version ${version} is already published to npm. Bump it.`);
      console.log(`   Published version is ${publishedVersion}; releasing ${version}.`);
    } else {
      console.log('   No published version found (first release?).');
    }

    // 2. Update package.json
    console.log('📝 Updating package.json...');
    const packagePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    const oldVersion = packageJson.version;

    if (oldVersion !== version) {
      console.log(`   Bumping version from ${oldVersion} to ${version}`);
      if (!isDryRun) {
        packageJson.version = version;
        writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
      }
    } else {
      console.log(`   Version already ${version}`);
    }

    // 3. Update README.md (only if it actually references the old version string)
    console.log('📝 Updating README.md...');
    const readmePath = join(process.cwd(), 'README.md');
    let readmeContent = readFileSync(readmePath, 'utf8');
    const oldVerRegex = new RegExp(oldVersion.replace(/\./g, '\\.'), 'g');
    if (oldVersion !== version && oldVerRegex.test(readmeContent)) {
      readmeContent = readmeContent.replace(oldVerRegex, version);
      writeFile(readmePath, readmeContent);
      console.log('   Updated version strings in README.md');
    } else {
      console.log('   No version string to update in README.md (ok — release notes live in CHANGELOG.md)');
    }

    // 4. Generate Changelog entry from git history
    console.log('📝 Generating CHANGELOG.md...');
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    const changelogContent = readFileSync(changelogPath, 'utf8');
    const date = new Date().toISOString().split('T')[0];
    const newHeader = `## [${version}] - ${date}`;

    if (changelogContent.includes(`## [${version}]`)) {
      console.log('   Entry already exists — leaving it as written (manual notes preserved).');
    } else {
      console.log('   Generating new entry from git history...');

      const lastTag = executeReturn('git describe --tags --abbrev=0');
      const commits = lastTag
        ? executeReturn(`git log ${lastTag}..HEAD --pretty=format:"%s"`)
        : executeReturn(`git log --pretty=format:"%s"`);

      const lines = commits.split('\n').filter(l => l.trim());
      const categories = { Added: [], Fixed: [], Changed: [], Documentation: [] };

      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.startsWith('feat') || lower.startsWith('added')) categories.Added.push(line.replace(/^(feat|added)(\(\w+\))?:?\s*/i, '').trim());
        else if (lower.startsWith('fix') || lower.startsWith('fixed')) categories.Fixed.push(line.replace(/^(fix|fixed)(\(\w+\))?:?\s*/i, '').trim());
        else if (lower.startsWith('docs') || lower.startsWith('doc')) categories.Documentation.push(line.replace(/^(docs|doc)(\(\w+\))?:?\s*/i, '').trim());
        else if (!lower.startsWith('chore') && !lower.startsWith('wip')) categories.Changed.push(line);
      });

      let changesText = '';
      for (const [cat, items] of Object.entries(categories)) {
        if (items.length > 0) {
          changesText += `\n### ${cat}\n`;
          items.forEach(item => changesText += `- ${item}\n`);
        }
      }
      if (!changesText) changesText = '\n### Changed\n- Maintenance release\n';

      const entry = `${newHeader}\n${changesText}\n`;
      const firstEntryIndex = changelogContent.search(/^## \[\d+\.\d+\.\d+\]/m);
      if (firstEntryIndex !== -1) {
        writeFile(changelogPath, changelogContent.slice(0, firstEntryIndex) + entry + changelogContent.slice(firstEntryIndex));
      } else {
        console.warn('   Could not find insertion point. Appending to top.');
        writeFile(changelogPath, `# Changelog\n\n${entry}\n${changelogContent.replace('# Changelog\n\n', '')}`);
      }
    }

    // 5. Review checkpoint
    console.log('\n---------------------------------------------------');
    console.log('🛑  PAUSED FOR REVIEW');
    console.log('---------------------------------------------------');
    console.log('   • package.json version bumped');
    console.log('   • README.md version strings synced (if any)');
    console.log('   • CHANGELOG.md entry generated from commits');
    console.log('\n👉 Open CHANGELOG.md now and rewrite the auto-generated bullets into real release notes.');
    console.log('   (The generator is a starting point, not the final copy.)\n');

    if (!noPrompt) {
      await promptConfirmation('Press ENTER to continue to Test → Build → Publish, or Ctrl+C to abort... ');
    } else {
      console.log(isDryRun ? '[DRY RUN] Would pause for review here.' : '(--yes) Skipping review prompt.');
    }

    // 6. Test & build
    console.log('\n🧪 Running tests...');
    execute('npm test', { stdio: 'inherit' });

    console.log('🔨 Building...');
    execute('npm run build', { stdio: 'inherit' });

    // 7. Commit & tag (the tag will mark exactly what we publish)
    console.log('💾 Committing release...');
    execute('git add package.json CHANGELOG.md README.md');
    try {
      execute(`git commit -m "chore(release): ${version}"`);
    } catch (e) {
      console.log('   Nothing to commit (already committed?). Continuing.');
    }

    console.log(`🏷️  Tagging ${tag}...`);
    const existingTag = executeReturn(`git tag -l ${tag}`);
    if (existingTag === tag) {
      console.log(`   Tag ${tag} already exists locally — leaving it.`);
    } else {
      execute(`git tag ${tag}`);
    }

    // 8. Publish to npm — the irreversible step. Runs BEFORE the push so a
    //    failed publish leaves nothing on origin; you reset the local commit/tag
    //    and retry. (prepublishOnly re-runs the build as a safety net.)
    if (skipPublish) {
      console.log('\n📦 Skipping npm publish (--no-publish).');
    } else {
      console.log('\n📦 Publishing to npm...');
      const otpFlag = otp ? ` --otp=${otp}` : '';
      execute(`npm publish --access public${otpFlag}`, { stdio: 'inherit' });
      if (!isDryRun) {
        const live = executeReturn('npm view skeleton-crew version');
        if (live !== version) {
          throw new Error(`Publish reported success but registry shows "${live}", expected "${version}". NOT pushing. Investigate before pushing the tag.`);
        }
        console.log(`   ✅ npm now serves ${live}.`);
      }
    }

    // 9. Push commit + tag (only after a verified publish)
    let doPush = noPrompt;
    if (!noPrompt) {
      const answer = await promptConfirmation(`\n🚀 Publish done. Push commit + ${tag} to origin? (y/n) `);
      doPush = answer.toLowerCase() === 'y';
    }
    if (doPush) {
      console.log('📤 Pushing...');
      execute('git push origin main', { stdio: 'inherit' });
      execute(`git push origin ${tag}`, { stdio: 'inherit' });
    } else {
      console.log('❌ Push skipped. Push manually when ready:');
      console.log(`   git push origin main && git push origin ${tag}`);
    }

    console.log(`\n✅ Release ${version} complete!`);
    if (isDryRun) console.log('   (dry run — nothing actually changed)');

  } catch (error) {
    console.error(`\n❌ Release failed: ${error.message}`);
    process.exit(1);
  }
})();
