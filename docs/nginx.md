# Nginx recommandé (ne pas appliquer en production sans validation)

L’application de développement (`npm run dev`) n’utilise pas Nginx.

En production, l’app est derrière Nginx. **Ne pas modifier le VPS dans cette phase.**
Vérifier séparément que `X-Real-IP` est bien posé avant d’appliquer quoi que ce soit.

L’application lit l’IP client via `TRUSTED_IP_HEADER` (défaut : `x-real-ip`).
Elle ne doit **pas** faire confiance au premier élément de `X-Forwarded-For`.

```nginx
# Exemple — proxy vers Next (port 3006 en prod actuelle)
location / {
    proxy_pass http://127.0.0.1:3006;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Bruit des scanners — ne pas filtrer au user-agent
location ~* /(\.env|\.git|wp-admin|wp-login\.php|xmlrpc\.php|wlwmanifest\.xml) {
    return 404;
}

location ~* \.(sql|tar|gz|zip|bak|old)$ {
    return 404;
}
```

Après application (plus tard) : confirmer qu’une requête légitime arrive avec un `X-Real-IP` unique, sans virgule.
