# Re-capture the product screenshots used in the proposal.
#
#   1. npm run build && npm run start      (the app must be serving on :3000)
#   2. powershell -File proposals/capture-shots.ps1
#   3. python proposals/build-proposal.py
#
# Only public pages are captured — headless Chrome has no signed-in session, so
# anything behind /app cannot be shot this way.

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$out    = Join-Path $PSScriptRoot "shots"
$base   = "http://localhost:3000"

New-Item -ItemType Directory -Force $out | Out-Null

$shots = @(
  @{n="storefront-web";    w=1280; h=980; u="$base/o/givny"},
  @{n="storefront-mobile"; w=414;  h=880; u="$base/o/givny"},
  @{n="listing-web";       w=1280; h=980; u="$base/listing/RGcCqXu71te6Y8VsIJa3"},
  @{n="leaderboard-web";   w=1280; h=980; u="$base/leaderboard?who=organisations"},
  @{n="directory-web";     w=1280; h=980; u="$base/organisations"},
  @{n="explore-mobile";    w=414;  h=880; u="$base/explore"}
)

foreach ($s in $shots) {
  & $chrome --headless --disable-gpu --hide-scrollbars `
    "--window-size=$($s.w),$($s.h)" "--screenshot=$out\$($s.n).png" $s.u 2>&1 | Out-Null
  Write-Host "captured $($s.n)"
}
