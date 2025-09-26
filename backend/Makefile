.PHONY: test test-watch test-coverage test-db test-aws clean \
	test-auth test-student test-donor test-admin test-payment test-welcome test-school test-registry test-otp

# Default test command
test:
	npm run test

# Watch mode for tests
test-watch:
	npm run test -- --watch

# Run tests with coverage
test-coverage:
	npm run test -- --coverage

# Run database tests
test-db:
	npm run db:generate && npm run db:push && npm run test

# Run AWS integration tests
test-aws:
	npm run aws:setup && npm run aws:test

# Authentication Tests
test-auth:
	@echo "Current directory: $$(pwd)"
	@echo "Checking Prisma schema location..."
	@ls -la prisma/schema.prisma || echo "Schema not found in prisma/schema.prisma"
	@echo "Running auth tests..."
	cd .. && pwd && \
	./scripts/testing/simple-auth-testing.sh backend && \
	./scripts/testing/focused-auth-test.sh backend

# Student-related Tests
test-student:
	@echo "Current directory: $$(pwd)"
	@echo "Checking Prisma schema location..."
	@ls -la prisma/schema.prisma || echo "Schema not found in prisma/schema.prisma"
	cd .. && ./scripts/testing/test-student-profiles.sh backend
	cd .. && ./scripts/testing/test-student-registry.sh backend
	cd .. && ./scripts/testing/test-student-donations.sh backend
	cd .. && ./scripts/testing/robust-profile-test.sh backend

# Donor-related Tests
test-donor:
	@echo "Current directory: $$(pwd)"
	@echo "Checking Prisma schema location..."
	@ls -la prisma/schema.prisma || echo "Schema not found in prisma/schema.prisma"
	cd .. && ./scripts/testing/test-donor-features.sh backend
	cd .. && ./scripts/testing/test-donor-components.sh backend
	cd .. && ./scripts/testing/test-donations.sh backend

# Admin-related Tests
test-admin:
	@echo "Current directory: $$(pwd)"
	@echo "Checking Prisma schema location..."
	@ls -la prisma/schema.prisma || echo "Schema not found in prisma/schema.prisma"
	cd .. && ./scripts/testing/test-admin-components.sh backend

# Payment and Registration Tests
test-payment:
	@echo "Current directory: $$(pwd)"
	@echo "Checking Prisma schema location..."
	@ls -la prisma/schema.prisma || echo "Schema not found in prisma/schema.prisma"
	cd .. && ./scripts/testing/test-registration-payment.sh backend

# OTP Verification Tests
test-otp:
	@echo "Current directory: $$(pwd)"
	@echo "Checking Prisma schema location..."
	@ls -la prisma/schema.prisma || echo "Schema not found in prisma/schema.prisma"
	cd .. && ./scripts/testing/test-otp-verification.sh backend

# Welcome Box Tests
test-welcome:
	@echo "Current directory: $$(pwd)"
	@echo "Checking Prisma schema location..."
	@ls -la prisma/schema.prisma || echo "Schema not found in prisma/schema.prisma"
	cd .. && ./scripts/testing/test-welcome-box.sh backend

# School Verification Tests
test-school:
	@echo "Current directory: $$(pwd)"
	@echo "Checking Prisma schema location..."
	@ls -la prisma/schema.prisma || echo "Schema not found in prisma/schema.prisma"
	cd .. && ./scripts/testing/test-school-verification.sh backend

# Registry Viewing Tests
test-registry:
	@echo "Current directory: $$(pwd)"
	@echo "Checking Prisma schema location..."
	@ls -la prisma/schema.prisma || echo "Schema not found in prisma/schema.prisma"
	cd .. && ./scripts/testing/test-registry-viewing.sh backend

# Run all shell script tests
test-shell-all: test-auth test-student test-donor test-admin test-payment test-otp test-welcome test-school test-registry

# Clean up test artifacts
clean:
	rm -rf coverage
	rm -rf dist
	rm -rf node_modules/.cache

# Run all tests (including shell scripts)
test-all: clean test-db test-aws test test-shell-all

# Help command
help:
	@echo "Available commands:"
	@echo "  make test          - Run all Jest tests"
	@echo "  make test-watch    - Run tests in watch mode"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make test-db       - Run database tests"
	@echo "  make test-aws      - Run AWS integration tests"
	@echo "  make test-auth     - Run authentication tests"
	@echo "  make test-student  - Run student-related tests"
	@echo "  make test-donor    - Run donor-related tests"
	@echo "  make test-admin    - Run admin-related tests"
	@echo "  make test-payment  - Run payment and registration tests"
	@echo "  make test-otp      - Run OTP verification tests"
	@echo "  make test-welcome  - Run welcome box tests"
	@echo "  make test-school   - Run school verification tests"
	@echo "  make test-registry - Run registry viewing tests"
	@echo "  make test-shell-all - Run all shell script tests"
	@echo "  make clean         - Clean up test artifacts"
	@echo "  make test-all      - Run all test suites (including shell scripts)" 