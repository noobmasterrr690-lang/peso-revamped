param(
  [string]$Message = "update: PESO app changes and database updates",
  [string]$RepoUrl = ""
)

if ($RepoUrl -ne "") {
  node scripts/github-push.mjs --repo $RepoUrl $Message
} else {
  node scripts/github-push.mjs $Message
}
