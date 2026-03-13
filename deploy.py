import paramiko
import os
from paramiko import AutoAddPolicy

host = "43.205.232.149"
username = "ec2-user"
key_path = "key-fixed.pem"
remote_dir = "/home/ec2-user/dist"

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(AutoAddPolicy())
    ssh.connect(host, username=username, key_filename=key_path)
    print("Connected!")

    sftp = ssh.open_sftp()
    
    try:
        sftp.mkdir(remote_dir)
    except Exception as e:
        print(f"mkdir ignored: {e}")

    def upload_dir(local_path, remote_path):
        for root, dirs, files in os.walk(local_path):
            for d in dirs:
                remote_d = os.path.join(remote_path, os.path.relpath(os.path.join(root, d), local_path)).replace("\\", "/")
                try:
                    sftp.mkdir(remote_d)
                except Exception:
                    pass
            for f in files:
                local_f = os.path.join(root, f)
                remote_f = os.path.join(remote_path, os.path.relpath(local_f, local_path)).replace("\\", "/")
                print(f"Uploading {local_f} to {remote_f}")
                sftp.put(local_f, remote_f)

    upload_dir("frontend/dist", remote_dir)
    print("Uploaded frontend items")

    commands = [
        "sudo yum install -y nginx",
        "sudo systemctl enable --now nginx",
        "sudo rm -rf /usr/share/nginx/html/*",
        "sudo cp -r /home/ec2-user/dist/* /usr/share/nginx/html/",
        "echo -e 'server {\\n    listen 80;\\n    root /usr/share/nginx/html;\\n    index index.html;\\n    location / {\\n        try_files $uri $uri/ /index.html;\\n    }\\n}' | sudo tee /etc/nginx/conf.d/civicbridge.conf",
        "sudo systemctl restart nginx"
    ]

    for cmd in commands:
        print(f"Executing: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode())
        print(stderr.read().decode())

    ssh.close()
except Exception as e:
    print(f"Error: {e}")
