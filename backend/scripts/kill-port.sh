#!/bin/bash

# Kill any process running on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null || true 