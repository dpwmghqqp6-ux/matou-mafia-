param([double]$E3 = 115.80, [double]$E4 = 149.13)
$root = "C:\Users\Mathis\Downloads\DuskFox-leger"
$jobs = @()
foreach ($s in 1..8) { $jobs += Start-Job -ScriptBlock { param($s, $root) Set-Location $root; node agent-tools/rtp_seed.js base (300 + $s) 1500000 } -ArgumentList $s, $root }
foreach ($s in 1..8) { $jobs += Start-Job -ScriptBlock { param($s, $root) Set-Location $root; node agent-tools/rtp_seed.js hunt (400 + $s) 600000 } -ArgumentList $s, $root }
$rows = $jobs | Wait-Job | Receive-Job | ForEach-Object { $_ | ConvertFrom-Json }
$jobs | Remove-Job
foreach ($m in "base", "hunt") {
  $r = $rows | Where-Object { $_.mode -eq $m }
  $cost = if ($m -eq "hunt") { 3 } else { 1 }
  $line = ($r | Measure-Object line -Average).Average
  $trig = ($r | Measure-Object trig -Average).Average
  $p4 = ($r | Measure-Object p4 -Average).Average
  $sim = ($r | Measure-Object rtp -Average).Average
  $an = $line + (($trig - $p4) * $E3 + $p4 * $E4) / $cost
  "{0}: line {1:N4} trig 1 in {2:N0} p4share {3:N3} sim {4:P2} analytic {5:P2}" -f $m, $line, (1 / $trig), ($p4 / $trig), $sim, $an
}
