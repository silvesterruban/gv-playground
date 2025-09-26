# 🛠️ GV Playground Development Guide

This guide provides comprehensive instructions for developing and contributing to the GV Playground project.

## 📋 Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [API Development](#api-development)
- [Frontend Development](#frontend-development)
- [Database Development](#database-development)
- [Docker Development](#docker-development)
- [Kubernetes Development](#kubernetes-development)
- [Troubleshooting](#troubleshooting)

## 🚀 Development Environment Setup

### Prerequisites

- **Node.js** 18+ and npm 8+
- **Docker** and Docker Compose
- **PostgreSQL** 15+ (or use Docker)
- **Git** for version control
- **VS Code** (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - Prisma
  - Docker
  - Kubernetes
  - GitLens

### Quick Setup

```bash
# Clone the repository
git clone <repository-url>
cd gv-playground

# Run the setup script
./scripts/setup.sh

# Start development environment
docker-compose up --build
```

### Manual Setup

```bash
# Backend setup
cd backend
npm install
cp env.example .env
# Edit .env with your configuration
npm run db:generate
npm run db:push
npm run db:seed

# Frontend setup
cd ../frontend
npm install
cp env.example .env
# Edit .env with your configuration

# Start development servers
npm run dev  # Backend
npm start    # Frontend
```

## 📁 Project Structure

```
gv-playground/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   ├── validators/      # Input validation
│   │   ├── tests/           # Test files
│   │   ├── app.ts           # Express app configuration
│   │   └── index.ts         # Application entry point
│   ├── prisma/              # Database schema and migrations
│   ├── package.json         # Dependencies and scripts
│   └── Dockerfile           # Container configuration
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── services/        # API services
│   │   ├── App.tsx          # Main app component
│   │   └── index.tsx        # Application entry point
│   ├── public/              # Static assets
│   ├── package.json         # Dependencies and scripts
│   └── Dockerfile           # Container configuration
├── infrastructure/          # Terraform configurations
├── k8s/                     # Kubernetes manifests
├── .github/workflows/       # GitHub Actions
├── docs/                    # Documentation
├── scripts/                 # Automation scripts
└── docker-compose.yml       # Local development setup
```

## 🔄 Development Workflow

### 1. Feature Development

```bash
# Create a new feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ... develop your feature ...

# Run tests
./scripts/test.sh

# Commit your changes
git add .
git commit -m "feat: add your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### 2. Bug Fixes

```bash
# Create a bug fix branch
git checkout -b fix/your-bug-description

# Fix the bug
# ... implement fix ...

# Run tests
./scripts/test.sh

# Commit your changes
git add .
git commit -m "fix: describe the bug fix"

# Push and create PR
git push origin fix/your-bug-description
```

### 3. Code Review Process

1. **Create Pull Request** with clear description
2. **Run Tests** - All tests must pass
3. **Code Review** - At least one reviewer required
4. **Merge** - Squash and merge to main branch

## 📝 Code Standards

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Use **meaningful variable names**
- Add **JSDoc comments** for complex functions
- Keep functions **small and focused**

```typescript
/**
 * Validates user input for registration
 * @param userData - User registration data
 * @returns Promise<boolean> - Validation result
 */
async function validateUserRegistration(userData: UserData): Promise<boolean> {
  // Implementation
}
```

### React Components

- Use **functional components** with hooks
- Follow **component naming conventions**
- Use **TypeScript interfaces** for props
- Implement **error boundaries** where needed

```typescript
interface UserProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  // Component implementation
};
```

### API Development

- Follow **RESTful conventions**
- Use **proper HTTP status codes**
- Implement **input validation**
- Add **comprehensive error handling**
- Include **API documentation**

```typescript
// GET /api/users/:id
router.get('/:id', 
  validateUserId,
  handleValidationErrors,
  UserController.getUserById
);
```

## 🧪 Testing Guidelines

### Backend Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Frontend Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### Test Structure

```typescript
describe('UserController', () => {
  describe('getProfile', () => {
    it('should return user profile when authenticated', async () => {
      // Arrange
      const mockUser = { id: '1', email: 'test@example.com' };
      
      // Act
      const result = await UserController.getProfile(mockRequest, mockResponse);
      
      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

## 🔌 API Development

### Adding New Endpoints

1. **Create Controller**
```typescript
// src/controllers/exampleController.ts
export class ExampleController {
  static async getExample(req: Request, res: Response) {
    // Implementation
  }
}
```

2. **Create Routes**
```typescript
// src/routes/example.ts
import { ExampleController } from '../controllers/exampleController';

const router = Router();
router.get('/', ExampleController.getExample);
export default router;
```

3. **Add to App**
```typescript
// src/app.ts
import exampleRoutes from './routes/example';
app.use('/api/example', exampleRoutes);
```

4. **Add Tests**
```typescript
// src/tests/example.test.ts
describe('Example API', () => {
  it('should return example data', async () => {
    // Test implementation
  });
});
```

### Database Operations

```typescript
// Using Prisma
const user = await prisma.user.create({
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    password: hashedPassword
  }
});
```

## ⚛️ Frontend Development

### Adding New Components

1. **Create Component**
```typescript
// src/components/NewComponent.tsx
interface NewComponentProps {
  title: string;
  onAction: () => void;
}

const NewComponent: React.FC<NewComponentProps> = ({ title, onAction }) => {
  return (
    <div className="new-component">
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
};

export default NewComponent;
```

2. **Add to App**
```typescript
// src/App.tsx
import NewComponent from './components/NewComponent';

// Use in your app
<NewComponent title="Hello" onAction={() => {}} />
```

### State Management

```typescript
// Using React Context
const { user, login, logout } = useAuth();

// Using local state
const [loading, setLoading] = useState(false);
```

## 🗄️ Database Development

### Schema Changes

1. **Update Prisma Schema**
```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

2. **Generate Migration**
```bash
npx prisma migrate dev --name add-user-model
```

3. **Update Seed Data**
```typescript
// prisma/seed.ts
const user = await prisma.user.create({
  data: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});
```

### Database Queries

```typescript
// Find user
const user = await prisma.user.findUnique({
  where: { email: 'john@example.com' }
});

// Create user
const newUser = await prisma.user.create({
  data: { name: 'Jane', email: 'jane@example.com' }
});

// Update user
const updatedUser = await prisma.user.update({
  where: { id: 'user-id' },
  data: { name: 'Jane Smith' }
});
```

## 🐳 Docker Development

### Building Images

```bash
# Build backend image
docker build -t gv-playground-backend ./backend

# Build frontend image
docker build -t gv-playground-frontend ./frontend

# Build all services
docker-compose build
```

### Running Containers

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Development with Docker

```dockerfile
# Dockerfile.dev
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

## ☸️ Kubernetes Development

### Local Development

```bash
# Start minikube
minikube start

# Apply manifests
kubectl apply -f k8s/

# Check status
kubectl get pods -n gv-playground

# View logs
kubectl logs -f deployment/backend -n gv-playground
```

### Manifest Development

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: gv-playground
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: gv-playground-backend:latest
        ports:
        - containerPort: 3001
```

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

2. **Database Connection Issues**
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres
```

3. **Node Modules Issues**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

4. **Docker Build Issues**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Debugging

1. **Backend Debugging**
```bash
# Run with debug logs
DEBUG=* npm run dev

# Use VS Code debugger
# Set breakpoints and run "Debug Backend" configuration
```

2. **Frontend Debugging**
```bash
# Use React Developer Tools
# Install browser extension for React debugging
```

3. **Database Debugging**
```bash
# Use Prisma Studio
npx prisma studio

# Check database logs
docker-compose logs postgres
```

## 📚 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://reactjs.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform Documentation](https://www.terraform.io/docs/)

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests**
5. **Run the test suite**
6. **Submit a pull request**

### Commit Message Format

```
type(scope): description

feat(auth): add JWT authentication
fix(api): resolve user validation issue
docs(readme): update setup instructions
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build process or auxiliary tool changes

---

**Happy Coding! 🚀**