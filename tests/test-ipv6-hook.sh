#!/bin/sh
set -eu
root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT HUP INT TERM

cat > "$tmp/uci" <<'MOCK'
#!/bin/sh
[ "$1" = "-q" ] && [ "$2" = "get" ] || exit 2
case "$3" in
	mentohust.config.ipv6_network) printf '%s\n' "${TEST_IPV6_NETWORK-}" ;;
	network.*.proto) printf '%s\n' "${TEST_IPV6_PROTO-}" ;;
	*) exit 1 ;;
esac
MOCK
cat > "$tmp/ifup" <<'MOCK'
#!/bin/sh
printf '%s\n' "$*" >> "$TEST_CALLS"
[ "${TEST_IFUP_FAIL-0}" -eq 0 ]
MOCK
cat > "$tmp/logger" <<'MOCK'
#!/bin/sh
exit 0
MOCK
chmod +x "$tmp/uci" "$tmp/ifup" "$tmp/logger"
export PATH="$tmp:$PATH" TEST_CALLS="$tmp/calls"
hook="$root/mentohust/files/mentohust-ipv6-up"

# Disabled must never touch other interfaces.
TEST_IPV6_NETWORK='' TEST_IPV6_PROTO='dhcpv6' sh "$hook"
[ ! -e "$TEST_CALLS" ]

# Success starts only the configured logical interface.
TEST_IPV6_NETWORK='wan6' TEST_IPV6_PROTO='dhcpv6' sh "$hook"
[ "$(cat "$TEST_CALLS")" = 'wan6' ]
rm "$TEST_CALLS"

# Bad interface names cannot inject commands or options.
if TEST_IPV6_NETWORK='wan6;touch /tmp/not-allowed' TEST_IPV6_PROTO='dhcpv6' sh "$hook"; then
	echo 'invalid name accepted' >&2
	exit 1
fi
[ ! -e "$TEST_CALLS" ]

# Do not bring down or manipulate non-DHCPv6 interfaces.
if TEST_IPV6_NETWORK='wan6' TEST_IPV6_PROTO='static' sh "$hook"; then
	echo 'static interface accepted' >&2
	exit 1
fi
[ ! -e "$TEST_CALLS" ]

# Propagate an ifup failure to the C hook log while keeping auth running.
if TEST_IPV6_NETWORK='wan6' TEST_IPV6_PROTO='dhcpv6' TEST_IFUP_FAIL=1 sh "$hook"; then
	echo 'ifup failure ignored' >&2
	exit 1
fi
[ "$(cat "$TEST_CALLS")" = 'wan6' ]
printf '%s\n' 'IPv6 post-auth hook tests passed'
