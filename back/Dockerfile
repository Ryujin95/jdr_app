# syntax=docker/dockerfile:1

FROM php:8.3-apache-bookworm

ENV APP_ENV=prod \
    APP_DEBUG=0 \
    PORT=10000

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        libicu-dev \
        libonig-dev \
        libpq-dev \
        unzip; \
    docker-php-ext-install -j"$(nproc)" \
        intl \
        mbstring \
        opcache \
        pdo_mysql \
        pdo_pgsql; \
    printf '%s\n' \
        'upload_max_filesize=30M' \
        'post_max_size=32M' \
        'max_execution_time=60' \
        'memory_limit=256M' \
        > /usr/local/etc/php/conf.d/storyforge.ini; \
    a2enmod headers; \
    rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

RUN cat > /etc/apache2/sites-available/000-default.conf <<'APACHE'
<VirtualHost *:80>
    ServerName localhost
    DocumentRoot /var/www/html/public

    <Directory /var/www/html/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        FallbackResource /index.php
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
APACHE

COPY composer.json composer.lock symfony.lock ./
RUN COMPOSER_ALLOW_SUPERUSER=1 composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --no-scripts \
    --no-autoloader

COPY . .
COPY docker-entrypoint.sh /usr/local/bin/storyforge-entrypoint

# Render exposes service environment variables as Docker build args. Do not
# declare runtime variable names as ARG; the console commands below receive
# only build-local placeholders, including a DB URL with a fixed server version.

RUN : > .env && \
    chmod 0755 /usr/local/bin/storyforge-entrypoint && \
    mkdir -p config/jwt public/avatars public/image public/uploads/maps public/video private-media var/cache var/log

# Keep each critical step in its own layer so Render reports its exact failure.
RUN composer dump-autoload --no-dev --classmap-authoritative
RUN composer check-platform-reqs --no-dev
RUN APP_SECRET=build-only-placeholder \
    DATABASE_URL='mysql://build:build@127.0.0.1:1/build?serverVersion=mariadb-10.4.32' \
    JWT_PASSPHRASE=build-only-placeholder \
    MAILER_DSN=null://null \
    MESSENGER_TRANSPORT_DSN=sync:// \
    MAIL_FROM=build@example.invalid \
    FRONT_BASE_URL=https://example.invalid \
    CORS_ALLOW_ORIGIN_REGEX='^https?://localhost(:[0-9]+)?$' \
    DEFAULT_URI=https://example.invalid \
    php bin/console cache:clear --env=prod --no-debug
RUN APP_SECRET=build-only-placeholder \
    DATABASE_URL='mysql://build:build@127.0.0.1:1/build?serverVersion=mariadb-10.4.32' \
    JWT_PASSPHRASE=build-only-placeholder \
    MAILER_DSN=null://null \
    MESSENGER_TRANSPORT_DSN=sync:// \
    MAIL_FROM=build@example.invalid \
    FRONT_BASE_URL=https://example.invalid \
    CORS_ALLOW_ORIGIN_REGEX='^https?://localhost(:[0-9]+)?$' \
    DEFAULT_URI=https://example.invalid \
    php bin/console assets:install public --env=prod
RUN APP_SECRET=build-only-placeholder \
    DATABASE_URL='mysql://build:build@127.0.0.1:1/build?serverVersion=mariadb-10.4.32' \
    JWT_PASSPHRASE=build-only-placeholder \
    MAILER_DSN=null://null \
    MESSENGER_TRANSPORT_DSN=sync:// \
    MAIL_FROM=build@example.invalid \
    FRONT_BASE_URL=https://example.invalid \
    CORS_ALLOW_ORIGIN_REGEX='^https?://localhost(:[0-9]+)?$' \
    DEFAULT_URI=https://example.invalid \
    php bin/console importmap:install --env=prod
RUN APP_SECRET=build-only-placeholder \
    DATABASE_URL='mysql://build:build@127.0.0.1:1/build?serverVersion=mariadb-10.4.32' \
    JWT_PASSPHRASE=build-only-placeholder \
    MAILER_DSN=null://null \
    MESSENGER_TRANSPORT_DSN=sync:// \
    MAIL_FROM=build@example.invalid \
    FRONT_BASE_URL=https://example.invalid \
    CORS_ALLOW_ORIGIN_REGEX='^https?://localhost(:[0-9]+)?$' \
    DEFAULT_URI=https://example.invalid \
    php bin/console asset-map:compile --env=prod

RUN chown -R www-data:www-data var public/avatars public/image public/uploads/maps public/video private-media

EXPOSE 10000

ENTRYPOINT ["/usr/local/bin/storyforge-entrypoint"]
CMD ["apache2-foreground"]
