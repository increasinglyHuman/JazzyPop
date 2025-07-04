#!/bin/bash
echo "Testing SSH connection after reboot..."
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com "echo 'SSH IS WORKING! 🎉' && uname -a"