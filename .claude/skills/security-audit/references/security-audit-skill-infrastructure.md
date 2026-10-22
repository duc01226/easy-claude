# Security audit — D8 Infrastructure & Configuration

> Read when D8 is in scope (`full`).

- [ ] Local-only infrastructure endpoints bind to loopback unless intentionally public; configured data stores, brokers, caches, search services, and admin UIs exposed to the internet are Critical
- [ ] Default/dev credentials (`guest/guest`, `postgres/postgres`, `sa/...`) NEVER in staging/prod; flag any non-dev config carrying them
- [ ] TLS everywhere external; HSTS; no mixed content
- [ ] CORS: explicit origins, no wildcard+credentials
- [ ] Docker: no `privileged`, no docker.sock mounts, no secrets in ENV/image layers (`docker history`), pinned base images
- [ ] Backups exist, are tested, and are NOT writable/deletable with the same credentials the app uses (ransomware resilience)
- [ ] Error pages generic; server version headers minimized
