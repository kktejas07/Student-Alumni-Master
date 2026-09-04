#!/bin/bash
expect -c '
spawn ssh -o StrictHostKeyChecking=no root@65.21.196.49
expect "password:"
send "Omsairam@4522!!\r"
expect "#"
send "docker exec -i \$(docker ps -q -f name=dokploy-postgres) psql -U dokploy -d dokploy -c \"SELECT * FROM \\\"application\\\" WHERE name LIKE \\'%student-alumni%\\';\" | grep -o 'buildArgs.*'\r"
expect "#"
send "exit\r"
interact
'
