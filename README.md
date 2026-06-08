# Job OS

A full-stack job application tracker with AI-powered resume analysis and mock interview prep, deployed on Kubernetes.

## Features

- **Job board** — add and track applications across statuses (applied, interviewing, offered, rejected)
- **Dashboard** — at-a-glance stats and status breakdown via charts
- **ATS Resume Analyzer** — upload a PDF resume, paste a job description, and get an AI score with keyword gaps, weaknesses, and a rewritten professional summary
- **ATS score history** — tracks score over multiple resume iterations per job
- **Mock Interview** — generates tailored questions from your resume + JD, accepts written answers, and returns a full evaluation with communication/technical feedback

## Screenshots

**Dashboard & Job List**

![Dashboard](docs/dashboard.png)

**Job Detail & ATS Analyzer**

![Job Detail](docs/job-detail.png)

**Mock Interview**

![Mock Interview](docs/interview.png)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, Recharts, React Router v7 |
| Backend | FastAPI, Python, psycopg2 |
| AI | Groq API (`llama-3.3-70b-versatile`), pdfplumber |
| Database | PostgreSQL |
| Infrastructure | Kubernetes (Minikube), nginx-ingress, HPA, Grafana |

## Project Structure

```
job-project/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── components/    # Dashboard, JobList, JobForm
│   │   └── pages/         # JobDetail, InterviewPage
│   ├── nginx.conf
│   └── Dockerfile
├── backend/           # FastAPI app
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
└── k8s/               # Kubernetes manifests
    ├── namespace.yaml
    ├── ingress.yaml
    ├── grafana-ingress.yaml
    ├── frontend/
    ├── backend/       # deployment, service, configmap, HPA
    └── postgres/      # deployment, service, PVC
```

## Running Locally (Minikube)

### Prerequisites

- Docker Desktop
- Minikube
- kubectl
- A [Groq API key](https://console.groq.com)

### 1. Start the cluster

```bash
minikube start
minikube addons enable ingress
minikube addons enable metrics-server
```

### 2. Add local DNS entries

```bash
echo "$(minikube ip) jobtracker.local" | sudo tee -a /etc/hosts
echo "$(minikube ip) grafana.local"    | sudo tee -a /etc/hosts
```

### 3. Build and load images into Minikube

```bash
eval $(minikube docker-env)

docker build -t job-frontend:latest ./frontend
docker build -t job-backend:latest  ./backend
```

### 4. Create secrets

Copy the example files and fill in your values:

```bash
cp k8s/backend/secret.yaml.exaple k8s/backend/secret.yaml
cp k8s/postgres/secret.yaml.example k8s/postgres/secret.yaml
```

`k8s/backend/secret.yaml` needs:
- `GROQ_API_KEY`
- `POSTGRES_PASSWORD`
- `DATABASE_USER`
- `DATABASE_HOST`
- `DATABASE_NAME`

### 5. Apply manifests

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml
```

### 6. Start the tunnel (keep running in a separate terminal)

```bash
sudo minikube tunnel
```

### 7. Open the app

Navigate to [http://jobtracker.local](http://jobtracker.local)

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/jobs` | List all jobs |
| `POST` | `/jobs` | Create a job |
| `GET` | `/jobs/{id}` | Get a single job |
| `PATCH` | `/jobs/{id}` | Update a job |
| `GET` | `/stats` | Status counts for dashboard |
| `POST` | `/resumes` | Upload a resume PDF |
| `POST` | `/ats/analyze?job_id=` | Run ATS analysis |
| `GET` | `/ats/history/{job_id}` | ATS score history |
| `POST` | `/interview/start?job_id=` | Generate interview questions |
| `POST` | `/interview/evaluate` | Evaluate interview responses |

## Infrastructure Notes

- The backend `Deployment` is backed by a **HorizontalPodAutoscaler** that scales between 1 and 5 replicas at 70% average CPU utilization.
- Postgres data is persisted via a **PersistentVolumeClaim**.
- Grafana is accessible at [http://grafana.local](http://grafana.local) once the `prometheus-grafana` service is deployed in the `jobtracker` namespace.
- The ingress is split into two resources (`jobtracker-api-ingress` and `jobtracker-frontend-ingress`) so the API path rewrite does not interfere with serving frontend static assets.
