 WINDOWS POWERSHELL

 <!--  check to see what is running on port 5432 (the postgresport)-->
 $netstat -aon | findstr :5432

<!-- Outout example
TCP    0.0.0.0:5432           0.0.0.0:0              LISTENING       19872
TCP    [::]:5432              [::]:0                 LISTENING       19872
TCP    [::1]:5432             [::]:0                 LISTENING       6416
  

  //2 process ID's running, meaning 2 are listening to that port
<!-- --> -->

<!-- identifying processes at port -->
$tasklist /FI "PID eq 19872"
$tasklist /FI "PID eq 6416"

<!-- kill UNWANTED Tasks-->

$taskkill /PID 6416 /F