# 営業日報システム

Next.js 15 (App Router) で構築した営業日報管理アプリケーションです。
Google Cloud Run 上で動作します。

---

## Prerequisites

- [gcloud CLI](https://cloud.google.com/sdk/docs/install) (authenticated with `gcloud auth login`)
- Docker
- A Google Cloud project with billing enabled

Enable required APIs once:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project=YOUR_PROJECT_ID
```

---

## Artifact Registry setup

Create the Docker repository that Cloud Build pushes to:

```bash
gcloud artifacts repositories create daily-report-app \
  --repository-format=docker \
  --location=asia-northeast1 \
  --project=YOUR_PROJECT_ID
```

---

## Secret Manager setup

Store runtime secrets in Secret Manager so they are never baked into the image or
passed as plain-text environment variables.

```bash
# PostgreSQL connection string (Cloud SQL private IP or Public IP with SSL)
echo -n "postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require" | \
  gcloud secrets create DATABASE_URL \
    --data-file=- \
    --replication-policy=automatic \
    --project=YOUR_PROJECT_ID

# JWT signing secret (generate a strong random value, minimum 32 characters)
openssl rand -base64 48 | \
  gcloud secrets create JWT_SECRET \
    --data-file=- \
    --replication-policy=automatic \
    --project=YOUR_PROJECT_ID
```

Grant the Cloud Run service account access to the secrets:

```bash
# Identify the service account used by Cloud Run (default compute SA)
export SA="$(gcloud projects describe YOUR_PROJECT_ID \
  --format='value(projectNumber)')"-compute@developer.gserviceaccount.com

gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=YOUR_PROJECT_ID

gcloud secrets add-iam-policy-binding JWT_SECRET \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=YOUR_PROJECT_ID
```

Also grant the Cloud Build service account the same access so `gcloud run deploy`
can resolve the secret references:

```bash
export CB_SA="$(gcloud projects describe YOUR_PROJECT_ID \
  --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"

for secret in DATABASE_URL JWT_SECRET; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${CB_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=YOUR_PROJECT_ID
done

# Cloud Build also needs permission to deploy to Cloud Run
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin"

gcloud iam service-accounts add-iam-policy-binding "${SA}" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --project=YOUR_PROJECT_ID
```

---

## Cloud Build trigger setup

Connect the repository to Cloud Build and create a push trigger on the `main` branch:

```bash
# After connecting the repository in Cloud Console:
gcloud builds triggers create github \
  --name=daily-report-app-main \
  --repo-name=daily-report-app \
  --repo-owner=YOUR_GITHUB_ORG \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml \
  --substitutions=_PROJECT_ID=YOUR_PROJECT_ID \
  --project=YOUR_PROJECT_ID
```

Every push to `main` will build, push, and deploy automatically.

---

## Manual deploy

To build and deploy from your local machine without a trigger:

```bash
export PROJECT_ID=YOUR_PROJECT_ID

gcloud builds submit . \
  --config=cloudbuild.yaml \
  --substitutions=_PROJECT_ID=${PROJECT_ID} \
  --project=${PROJECT_ID}
```

---

## Database migrations

Run Prisma migrations against Cloud SQL before (or after) deploying a new revision.
The recommended approach is a Cloud Run Job or a one-off Cloud Build step.

Example one-off migration via Cloud Build:

```bash
gcloud builds submit \
  --no-source \
  --config=- <<'EOF'
steps:
  - name: node:20-alpine
    entrypoint: sh
    args:
      - -c
      - |
        npm ci --ignore-scripts
        npx prisma migrate deploy
    secretEnv: [DATABASE_URL]
availableSecrets:
  secretManager:
    - versionName: projects/YOUR_PROJECT_ID/secrets/DATABASE_URL/versions/latest
      env: DATABASE_URL
EOF
```

---

## Environment variables reference

| Variable | Source | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Secret Manager (`DATABASE_URL:latest`) | PostgreSQL connection string |
| `JWT_SECRET` | Secret Manager (`JWT_SECRET:latest`) | HMAC signing key for JWT tokens |
| `NODE_ENV` | Dockerfile (hardcoded `production`) | Node environment |
| `PORT` | Dockerfile (hardcoded `3000`) | HTTP listen port |
| `HOSTNAME` | Dockerfile (hardcoded `0.0.0.0`) | Bind address for Next.js standalone server |

---

## Cloud Run service configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Region | `asia-northeast1` (Tokyo) | Low latency for Japanese users |
| Min instances | `0` | Cost: scales to zero when idle |
| Max instances | `10` | Cost cap; adjust for peak traffic |
| Memory | `512Mi` | Sufficient for Next.js + Prisma |
| CPU | `1` | Scales with concurrency |
| Concurrency | `80` | Cloud Run default; tune based on DB connection limits |
| Timeout | `60s` | Matches typical API + DB response budgets |
| Authentication | Internal (no public unauthenticated access) | Traffic enters via Load Balancer or IAP |

To allow public internet access (e.g., behind a Load Balancer with IAP), add
`--allow-unauthenticated` to the deploy step in `cloudbuild.yaml` and secure the
service at the Load Balancer layer instead.
