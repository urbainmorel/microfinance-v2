# Script de tunnel persistant avec reconnexion automatique
while ($true) {
    Write-Host "[Tunnel] Lancement du tunnel HTTPS..."
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -R 80:localhost:3000 nokey@localhost.run
    Write-Host "[Tunnel] Déconnecté. Reconnexion dans 3 secondes..."
    Start-Sleep -Seconds 3
}
