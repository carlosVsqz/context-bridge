#!/usr/bin/env python3
"""Create strong local bootstrap credentials without overwriting existing secrets."""
import argparse
import os
import secrets
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--email', default='admin@contextbridge.local')
args=parser.parse_args()
if any(c in args.email for c in '\r\n=') or '@' not in args.email:
    parser.error('Invalid email')
path=Path(__file__).resolve().parents[1]/'.env'
content=(f'POSTGRES_USER=contextbridge\nPOSTGRES_PASSWORD={secrets.token_urlsafe(36)}\n'
         f'ADMIN_EMAIL={args.email}\nADMIN_NAME=Administrador\nADMIN_PASSWORD={secrets.token_urlsafe(24)}\n'
         'APP_BIND_ADDRESS=127.0.0.1\nAPP_PORT=8080\nCOOKIE_SECURE=false\n')
try:
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
except FileExistsError:
    raise SystemExit('.env already exists; nothing was changed.')
with os.fdopen(fd,'w') as f: f.write(content)
print('Created .env. Open it to get your administrator credentials. Do not commit this file.')
