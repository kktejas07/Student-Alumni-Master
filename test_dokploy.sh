#!/bin/bash
expect -c '
spawn ssh -o StrictHostKeyChecking=no root@65.21.196.49
expect "password:"
send "Omsairam@4522!!\r"
expect "#"
send "curl -X POST http://localhost:3000/api/application.deploy -H \"Content-Type: application/json\" -d \\\"{\\\\\\\"applicationId\\\\\\\":\\\\\\\"8KOtU9oelmKTC9_L1nDf6\\\\\\\"}\\\"\r"
expect "#"
send "curl -X POST http://localhost:3000/api/application.deploy -H \"Content-Type: application/json\" -d \\\"{\\\\\\\"applicationId\\\\\\\":\\\\\\\"_fTUV0uJTMdos2iYluSKM\\\\\\\"}\\\"\r"
expect "#"
send "exit\r"
interact
'
