#!/bin/bash
expect -c '
spawn ssh -o StrictHostKeyChecking=no root@65.21.196.49
expect "password:"
send "Omsairam@4522!!\r"
expect "#"
send "cd /etc/dokploy/applications/student-alumni-backend-kokoiw/code && git fetch origin main && git reset --hard origin/main && docker build -t student-alumni-backend-kokoiw:latest -f ./backend/Dockerfile ./backend && docker service update --force student-alumni-backend-kokoiw\r"
expect "#"
send "cd /etc/dokploy/applications/student-alumni-frontend-r8s0hz/code && git fetch origin main && git reset --hard origin/main && docker build --build-arg EXPO_PUBLIC_BACKEND_URL=https://studentalumni.ai -t student-alumni-frontend-r8s0hz:latest -f ./frontend/Dockerfile ./frontend && docker service update --force student-alumni-frontend-r8s0hz\r"
expect "#"
send "exit\r"
interact
'
