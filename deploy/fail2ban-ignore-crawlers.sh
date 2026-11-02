#!/usr/bin/env bash
# 把 Googlebot / Bingbot 的公開 IP 段寫進 fail2ban ignoreip，避免誤封爬蟲。
#
# crontab（root）：30 4 * * 1 /opt/avalo/app/deploy/fail2ban-ignore-crawlers.sh >> /opt/avalo/cron-f2b.log 2>&1
#
# 來源是 Google 與 Bing 自己公布的 JSON，不是自己猜的網段。
# 寫到 jail.d 獨立檔，不動 jail.local，reload 失敗也不會弄壞既有 jail。
set -euo pipefail

OUT=/etc/fail2ban/jail.d/avalo-crawlers.local
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

python3 - <<'PY' > "$TMP"
import json, urllib.request, datetime, ipaddress, sys

SOURCES = [
    ("Googlebot", "https://developers.google.com/static/search/apis/ipranges/googlebot.json"),
    ("Bingbot", "https://www.bing.com/toolbox/bingbot.json"),
]

prefixes = ["127.0.0.1/8", "::1"]
seen = set(prefixes)
errors = []

for name, url in SOURCES:
    try:
        with urllib.request.urlopen(url, timeout=20) as res:
            data = json.load(res)
        rows = data.get("prefixes") if isinstance(data, dict) else data
        if not isinstance(rows, list):
            rows = []
        n = 0
        for row in rows:
            cidr = row.get("ipv4Prefix") or row.get("ipv6Prefix") or row.get("prefix")
            if not cidr:
                continue
            try:
                ipaddress.ip_network(cidr, strict=False)
            except ValueError:
                continue
            if cidr not in seen:
                seen.add(cidr)
                prefixes.append(cidr)
                n += 1
        print(f"# {name}: {n} prefixes", file=sys.stderr)
    except Exception as e:
        errors.append(f"{name}: {e}")
        print(f"# {name} fetch failed: {e}", file=sys.stderr)

if len(prefixes) <= 2:
    sys.stderr.write("no crawler prefixes fetched; refusing to overwrite\n")
    sys.exit(1)

print(f"# generated {datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')} by fail2ban-ignore-crawlers.sh")
if errors:
    for e in errors:
        print(f"# warning: {e}")
print("[DEFAULT]")
print("ignoreip = " + " ".join(prefixes))
PY

if [ ! -s "$TMP" ]; then
  echo "empty output, abort" >&2
  exit 1
fi

install -m 644 "$TMP" "$OUT"
fail2ban-client reload
echo "wrote $OUT ($(wc -w < "$TMP") tokens) and reloaded fail2ban"
