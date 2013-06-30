<?php
// Read stream and save to file
$entityBody = file_get_contents('php://input');
$file = 'test.wav';
file_put_contents($file, $entityBody);
?>
