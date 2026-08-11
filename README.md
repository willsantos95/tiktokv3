# Relampago de Ofertas — TikTok public website

Public website for the TikTok application review process. It includes:

- Public home page
- Features page
- How it works page
- Support page
- Privacy Policy
- Terms of Service
- Docker and Nginx configuration for EasyPanel

## Local test with Docker

```bash
docker compose up --build
```

Open:

```text
http://localhost:8080
```

Health check:

```text
http://localhost:8080/health
```

## Upload to GitHub

```bash
git init
git add .
git commit -m "Create public TikTok review website"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPOSITORY.git
git push -u origin main
```

## Deploy with EasyPanel

1. Create a new project in EasyPanel.
2. Add a new service from GitHub.
3. Select this repository and the `main` branch.
4. Keep the build method as Dockerfile.
5. Internal application port: `80`.
6. Add your public domain.
7. Enable HTTPS.
8. Deploy.

## TikTok URLs

Use public URLs similar to:

```text
Website URL: https://your-domain.com/
Privacy Policy URL: https://your-domain.com/privacy-policy.html
Terms of Service URL: https://your-domain.com/terms-of-service.html
```

Both legal links are visible in the header, the home page and the footer without login.

## Before publishing

Confirm that this email is correct in all pages:

```text
contato@relampagodeoferta.shop
```

Search all files if you need to replace it:

```bash
grep -R "contato@relampagodeoferta.shop" .
```
