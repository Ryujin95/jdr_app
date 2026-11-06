#!/bin/sh
set -eu

: "${PORT:=10000}"
case "$PORT" in
    ''|*[!0-9]*)
        echo "PORT must be a numeric TCP port." >&2
        exit 1
        ;;
esac
if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "PORT must be between 1 and 65535." >&2
    exit 1
fi

: "${APP_SECRET:?APP_SECRET must be configured in Render}"
: "${DATABASE_URL:?DATABASE_URL must be configured in Render}"
: "${JWT_PASSPHRASE:?JWT_PASSPHRASE must be configured in Render}"
: "${MAILER_DSN:?MAILER_DSN must be configured in Render}"
: "${MESSENGER_TRANSPORT_DSN:?MESSENGER_TRANSPORT_DSN must be configured in Render}"
: "${MAIL_FROM:?MAIL_FROM must be configured in Render}"
: "${FRONT_BASE_URL:?FRONT_BASE_URL must be configured in Render}"
: "${CORS_ALLOW_ORIGIN_REGEX:?CORS_ALLOW_ORIGIN_REGEX must be configured in Render}"
: "${DEFAULT_URI:?DEFAULT_URI must be configured in Render}"

JWT_PRIVATE_FILE=/etc/secrets/jwt-private.pem
JWT_PUBLIC_FILE=/etc/secrets/jwt-public.pem
if [ ! -r "$JWT_PRIVATE_FILE" ] || [ ! -r "$JWT_PUBLIC_FILE" ]; then
    echo "Render Secret Files jwt-private.pem and jwt-public.pem are required." >&2
    exit 1
fi

install -o www-data -g www-data -m 0640 "$JWT_PRIVATE_FILE" config/jwt/private.pem
install -o www-data -g www-data -m 0644 "$JWT_PUBLIC_FILE" config/jwt/public.pem

sed -i "s/^Listen 80$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

exec "$@"
