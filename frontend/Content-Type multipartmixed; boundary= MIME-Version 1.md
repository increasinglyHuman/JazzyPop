Content-Type: multipart/mixed; boundary="//" MIME-Version: 1.0 --// Content-Type: text/cloud-config; charset="us-ascii" MIME-Version: 1.0 Content-Transfer-Encoding: 7bit Content-Disposition: attachment; filename="cloud-config.txt" #cloud-config cloud_final_modules: - [scripts-user, always] --// Content-Type:    text/x-shellscript; charset="us-ascii" MIME-Version: 1.0 Content-Transfer-Encoding: 7bit Content-Disposition: attachment; filename="userdata.txt" #!/bin/bash OS_USER=ubuntu chown ro



ssh-keygen -y -f ~/.ssh/poqpoq2025.pem



ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC+5F5kVkC1LKUIhiV89P00QJdzI/2TBHcxgEoyyD00pzs6Cab5EAIyEyL/3snTs++Emt7JCRHt7eTLvtyqsdrA5AumEqgOKVX2KIJ6T9R6Czzmz19Qo2/g1RPf2pC7UZqoBaCJH4L7vCA3MDlPaimv+JtbC0BRdOIP06WGwhN31uguPinKcpAE7opq8k0DIIGw0UVng1gJm78tPzjSVRnKSBnvwL4A3Gb1b0cAH0UC0lmgCvUC14ZEU/743nVkz2JKIF9JCgl6URVvrI0XhWPPNjE3lqCFmjmUxFsCI8js9DWXsb5CRPvm3+4HR5jv4Rt0DN9OPLUHVJJPMyNh/CDJ