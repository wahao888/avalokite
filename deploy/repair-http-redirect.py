#!/usr/bin/env python3
"""Remove Certbot server-level redirects that bypass scan-block locations.
Run with sudo on the server; validate nginx -t before reloading.
"""
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
pattern = r'    if \(\$host = [a-zA-Z0-9.-]+\) \{\s*return 301 https://\$host\$request_uri;\s*\} # managed by Certbot'
# Fail closed: this repair only applies to the known location-based HTTP fallback.
if 'include /etc/nginx/snippets/avalo-scan-block.conf;' not in text or 'location / {\n        return 301 https://$host$request_uri;\n    }' not in text:
    raise SystemExit('Expected scan block and location redirect not found; no changes')
fixed, count = re.subn(pattern, '', text)
if count:
    path.with_name(path.name + '.before-redirect-repair').write_text(text)
    path.write_text(fixed)
print(f'Removed {count} server-level redirects')
