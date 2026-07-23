// dangerfile-gitlab-template.js -- Governance as Code (GitLab CI variant)
//
// Adapted from the reference Danger.js config (originally GitHub Actions)
// to run against GitLab merge requests via danger-gitlab.
//
// Requirements:
//   npm install -g danger
//   Set DANGER_GITLAB_API_TOKEN in the CI environment (see .gitlab-ci.yml job below)
//
// .gitlab-ci.yml job to add:
//
//   danger:
//     stage: review
//     image: node:20
//     rules:
//       - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
//     script:
//       - npm install -g danger
//       - danger ci --dangerfile=dangerfile-gitlab-template.js
//     variables:
//       DANGER_GITLAB_API_TOKEN: $DANGER_GITLAB_API_TOKEN
//
// Reference: https://danger.systems/js/ (platform: gitlab)

// ---------------------------------------------------------------------------
// PROJECT CONFIG -- adjust for your context
// ---------------------------------------------------------------------------

const CONFIG = {
  // GitLab issue reference pattern. Use "#" for same-project issues
  // (e.g. "#123") or "namespace/repo#123" for cross-project references.
  issueReferencePattern: /#\d+/,

  // Critical files that require at least two approvers.
  // Partial path match strings.
  criticalPaths: [
    "src/integrations/gps",
    "src/services/notifications",
    "src/api/routes",
    "migrations/",
    ".env",
    "docker-compose",
  ],

  // Minimum number of approvers for critical files.
  criticalApprovers: 2,

  // MR size (changed lines) above which a careful-review warning fires.
  largeMRThreshold: 500,

  // Test coverage drop (percentage points) that triggers a warning.
  coverageDropThreshold: 5,
};

// ---------------------------------------------------------------------------
// RULE 1 -- The MR must reference a GitLab issue in the title or description
// ---------------------------------------------------------------------------

const titleHasIssue = CONFIG.issueReferencePattern.test(danger.gitlab.mr.title);
const bodyHasIssue = CONFIG.issueReferencePattern.test(danger.gitlab.mr.description || "");

if (!titleHasIssue && !bodyHasIssue) {
  fail(
    "No GitLab issue reference found. The MR title or description must contain " +
    "the issue identifier (e.g. `#123`). This guarantees traceability between " +
    "the MR and planned work."
  );
}

// ---------------------------------------------------------------------------
// RULE 2 -- Critical files require at least N approvers
// ---------------------------------------------------------------------------

const changedFiles = [
  ...danger.git.created_files,
  ...danger.git.modified_files,
];

const touchesCriticalPath = changedFiles.some((file) =>
  CONFIG.criticalPaths.some((cp) => file.includes(cp))
);

if (touchesCriticalPath) {
  // danger-gitlab exposes approvals via danger.gitlab.approvals (if the
  // GitLab Approvals API is enabled for the project).
  const approvals = danger.gitlab.approvals?.approved_by?.length ?? 0;

  const criticalFilesFound = changedFiles
    .filter((f) => CONFIG.criticalPaths.some((cp) => f.includes(cp)))
    .join(", ");

  if (approvals < CONFIG.criticalApprovers) {
    fail(
      `Critical file changed with insufficient approvers. ` +
      `This MR touches integration or sensitive modules. ` +
      `At least ${CONFIG.criticalApprovers} approvers required ` +
      `(current: ${approvals}). ` +
      `Critical files detected: ${criticalFilesFound}`
    );
  } else {
    message(`Critical file with ${approvals} approvers -- review requirement met.`);
  }
}

// ---------------------------------------------------------------------------
// RULE 3 -- Large MRs get a careful-review warning
// ---------------------------------------------------------------------------

const totalChanges = (danger.gitlab.mr.changes_count ? Number(danger.gitlab.mr.changes_count) : null)
  ?? (danger.git.additions + danger.git.deletions);

if (totalChanges > CONFIG.largeMRThreshold) {
  warn(
    `Large MR detected (${totalChanges} changed lines). ` +
    `MRs above ${CONFIG.largeMRThreshold} lines increase the risk of bugs slipping through. ` +
    `Consider splitting into smaller MRs or scheduling a dedicated review session.`
  );
}

// ---------------------------------------------------------------------------
// RULE 4 -- Test coverage must not drop more than the threshold
//
// Requires CI to produce coverage/coverage-summary.json
// (Jest with --coverage --coverageReporters=json-summary).
// Comment out this section if your project doesn't use Jest.
// ---------------------------------------------------------------------------

const fs = require("fs");
const coveragePath = "./coverage/coverage-summary.json";

if (fs.existsSync(coveragePath)) {
  try {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
    const currentPct = coverage.total?.lines?.pct;
    const basePath = "./coverage/base-coverage.json";

    if (fs.existsSync(basePath) && currentPct !== undefined) {
      const basePct = JSON.parse(fs.readFileSync(basePath, "utf8")).total?.lines?.pct;
      const drop = basePct - currentPct;

      if (drop > CONFIG.coverageDropThreshold) {
        warn(
          `Test coverage dropped ${drop.toFixed(1)} points ` +
          `(from ${basePct.toFixed(1)}% to ${currentPct.toFixed(1)}%). ` +
          `A drop above ${CONFIG.coverageDropThreshold}% indicates new code without coverage. ` +
          `Add tests or justify it in the MR description.`
        );
      } else {
        message(`Test coverage: ${currentPct.toFixed(1)}% -- within acceptable range.`);
      }
    } else {
      message(
        `Current coverage: ${currentPct?.toFixed(1) ?? "unavailable"}%. ` +
        `Base coverage file not found -- comparison skipped.`
      );
    }
  } catch (e) {
    warn(
      "Could not read the test coverage file. " +
      "Check that Jest is configured with coverageReporters: json-summary."
    );
  }
} else {
  message(
    `Coverage file not found at ${coveragePath}. ` +
    "To enable this rule: configure Jest with --coverage --coverageReporters=json-summary."
  );
}

// ---------------------------------------------------------------------------
// RULE 5 -- MRs without a description get a warning
// ---------------------------------------------------------------------------

const mrDescription = (danger.gitlab.mr.description || "").trim();

if (mrDescription.length < 30) {
  warn(
    "MR description is too short or missing. " +
    "A good description explains what changes and why -- not just a list of files. " +
    "This makes review and rollback easier and stays in the project history."
  );
}

// ---------------------------------------------------------------------------
// FINAL SUMMARY
// ---------------------------------------------------------------------------

message(
  "Danger check complete. " +
  "Rules checked: issue reference, critical-file approvers, " +
  "MR size, test coverage, and description quality. " +
  "Items marked as failures block the merge. Warnings do not block."
);
