#!/bin/sh

cp -r $(ls | grep -v .sh\$) /srv/http/teltonika2 && \
scp -r $(ls | grep -v .sh\$) Nexus-5:/var/www/html/teltonika2

