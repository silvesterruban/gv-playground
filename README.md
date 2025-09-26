# 🚀 GV Playground - CI/CD Learning Environment

A comprehensive, production-ready full-stack application designed for learning modern DevOps practices, CI/CD pipelines, and cloud-native development.

## 🎯 What is GV Playground?

GV Playground is a complete learning environment that demonstrates:

- **Kubernetes orchestration with EKS**
- **Infrastructure as Code with Terraform**
- **Microservices architecture with proper service separation**
- **Multi-platform development with React**
- **Cloud-native deployment with comprehensive monitoring and security**

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions (CI/CD)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │     CI      │  │   Staging   │  │ Production  │            │
│  │  Pipeline   │  │ Deployment  │  │ Deployment  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Infrastructure                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │     EKS     │  │     RDS     │  │     ECR     │            │
│  │   Cluster   │  │ PostgreSQL  │  │ Container   │            │
│  │             │  │             │  │ Registry    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- AWS CLI
- Terraform 1.0+
- kubectl

### Local Development
```bash
# Clone the repository
git clone <your-repo-url>
cd gv-playground

# Run setup script
./scripts/setup.sh

# Start development environment
docker-compose up --build
```

### Deploy to AWS
```bash
# Deploy infrastructure and applications
./scripts/deploy.sh -e dev

# Deploy to staging
./scripts/deploy.sh -e staging

# Deploy to production
./scripts/deploy.sh -e production
```

## 📁 Project Structure

```
gv-playground/
├── backend/                 # Node.js/Express API
│   ├── src/                # TypeScript source code
│   ├── prisma/             # Database schema and migrations
│   ├── tests/              # Test files
│   └── Dockerfile          # Container configuration
├── frontend/               # React application
│   ├── src/                # React components and pages
│   ├── public/             # Static assets
│   └── Dockerfile          # Container configuration
├── infrastructure/         # Terraform configurations
│   ├── main.tf            # Main infrastructure
│   ├── variables.tf       # Input variables
│   └── outputs.tf         # Output values
├── k8s/                   # Kubernetes manifests
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── ingress.yaml
│   └── monitoring/        # Monitoring stack
├── .github/workflows/     # GitHub Actions
│   ├── ci.yml            # Continuous Integration
│   ├── deploy-staging.yml # Staging deployment
│   └── deploy-production.yml # Production deployment
├── docs/                  # Documentation
│   ├── SETUP_GUIDE.md    # Setup instructions
│   ├── ARCHITECTURE.md   # Architecture overview
│   └── DEPLOYMENT_GUIDE.md # Deployment guide
├── scripts/               # Automation scripts
│   ├── setup.sh          # Local setup
│   └── deploy.sh         # AWS deployment
└── docker-compose.yml     # Local development
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Router** - Navigation

### Backend
- **Node.js 18** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **JWT** - Authentication
- **Winston** - Logging

### Infrastructure
- **AWS EKS** - Kubernetes cluster
- **AWS RDS** - PostgreSQL database
- **AWS ECR** - Container registry
- **AWS ALB** - Load balancer
- **Terraform** - Infrastructure as Code

### DevOps
- **GitHub Actions** - CI/CD
- **Docker** - Containerization
- **Kubernetes** - Orchestration
- **Prometheus** - Monitoring
- **Grafana** - Visualization

## 🔄 CI/CD Pipeline

### Continuous Integration
1. **Code Quality** - Linting, formatting, security audit
2. **Testing** - Unit, integration, and end-to-end tests
3. **Docker Build** - Multi-stage container builds
4. **Security Scan** - Vulnerability scanning with Trivy
5. **Infrastructure Validation** - Terraform plan validation

### Continuous Deployment
1. **Staging** - Automatic deployment on `develop` branch
2. **Production** - Manual approval deployment on `main` branch
3. **Health Checks** - Comprehensive application monitoring
4. **Rollback** - Automated rollback on failure

## ☸️ Kubernetes Features

- **Auto-scaling** - Horizontal Pod Autoscaler
- **Health Checks** - Liveness, readiness, and startup probes
- **Service Mesh** - Inter-service communication
- **Ingress** - Load balancing and SSL termination
- **ConfigMaps** - Configuration management
- **Secrets** - Sensitive data management

## 🔒 Security Features

- **IAM Roles** - Least privilege access
- **Security Groups** - Network-level security
- **JWT Authentication** - Secure API access
- **HTTPS Everywhere** - SSL/TLS encryption
- **Input Validation** - Comprehensive data validation
- **Secrets Management** - GitHub Secrets and AWS Secrets Manager

## 📊 Monitoring & Observability

- **CloudWatch** - AWS native monitoring
- **Prometheus** - Metrics collection
- **Grafana** - Visualization dashboards
- **Health Endpoints** - Application health checks
- **Log Aggregation** - Centralized logging
- **Alerting** - Proactive issue detection

## 🎓 Learning Objectives

By working with GV Playground, you'll learn:

### CI/CD Practices
- GitHub Actions workflow design
- Automated testing and deployment
- Infrastructure as Code with Terraform
- Container orchestration with Kubernetes

### Cloud-Native Development
- Microservices architecture
- Service mesh communication
- Auto-scaling and load balancing
- Monitoring and observability

### Security Best Practices
- IAM role management
- Network security
- Secrets management
- Vulnerability scanning

### DevOps Tools
- Docker containerization
- Kubernetes deployment
- Terraform infrastructure
- Monitoring and alerting

## 📚 Documentation

- **[Setup Guide](docs/SETUP_GUIDE.md)** - Complete setup instructions
- **[Architecture Guide](docs/ARCHITECTURE.md)** - Detailed architecture overview
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - AWS deployment instructions

## 🚀 Getting Started

### 1. Local Development
```bash
# Setup local environment
./scripts/setup.sh

# Start development servers
docker-compose up --build
```

### 2. Deploy to AWS
```bash
# Deploy to development
./scripts/deploy.sh -e dev

# Deploy to staging
./scripts/deploy.sh -e staging
```

### 3. CI/CD Pipeline
- Push to `develop` → Deploy to staging
- Push to `main` → Deploy to production
- Automated testing and deployment

## 🔧 Configuration

### Environment Variables
- Copy `backend/env.example` to `backend/.env`
- Copy `frontend/env.example` to `frontend/.env`
- Update with your configuration

### AWS Configuration
- Configure AWS CLI with your credentials
- Update Terraform variables in `infrastructure/terraform.tfvars`
- Set up GitHub repository secrets

## 🚨 Troubleshooting

### Common Issues
- **Pods not starting** - Check logs and resource limits
- **Database connection** - Verify RDS endpoint and credentials
- **Load balancer** - Check ALB configuration and health checks
- **CI/CD pipeline** - Review GitHub Actions logs

### Getting Help
1. Check the documentation
2. Review error logs
3. Search existing issues
4. Create a new issue with details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AWS for cloud infrastructure
- Kubernetes community for orchestration
- Terraform for Infrastructure as Code
- GitHub for CI/CD platform
- All open-source contributors

---

**Happy Learning! 🎓**

GV Playground is designed to help you master modern DevOps practices through hands-on experience with production-ready tools and techniques.