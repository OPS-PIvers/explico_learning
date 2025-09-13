---
description: "Build, push, and redeploy to Google Apps Script using clasp"
argument-hint: "[build|push|redeploy|full] - Optional action, defaults to full workflow"
allowed-tools: [Bash, Read]
---

# Clasp Deploy Command

I'll handle the Google Apps Script deployment workflow for you.

First, let me check what action you want to perform:

```bash
# Get the current deployment info
clasp deployments
```

Based on the argument provided (`$1`), I'll execute the appropriate workflow:

- **build**: Run ./build.sh only
- **push**: Push files to Apps Script without deploying  
- **redeploy**: Just redeploy the current version (no build/push)
- **full** (default): Complete workflow - build → push → redeploy

Let me execute the requested workflow:

```bash
# Determine the action (default to "full" if no argument provided)
ACTION="${1:-full}"

echo "🚀 Starting clasp workflow: $ACTION"

case "$ACTION" in
  "build")
    echo "📦 Building project..."
    ./build.sh
    ;;
  "push") 
    echo "📦 Building project..."
    ./build.sh
    echo "⬆️ Pushing to Google Apps Script..."
    clasp push --force
    ;;
  "redeploy")
    echo "🔄 Redeploying current version..."
    # Get the latest deployment ID and redeploy it
    echo "🔍 Getting current deployment info..."
    DEPLOYMENT_ID=$(clasp deployments | head -n 2 | tail -n 1 | awk '{print $2}' | tr -d '-')
    if [ -n "$DEPLOYMENT_ID" ] && [ "$DEPLOYMENT_ID" != "@HEAD" ]; then
      echo "📋 Found deployment ID: $DEPLOYMENT_ID"
      clasp deploy --deploymentId "$DEPLOYMENT_ID" --description "Updated $(date '+%Y-%m-%d %H:%M:%S')"
    else
      echo "⚠️ No existing deployment found. Creating new deployment..."
      clasp deploy --description "New deployment $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    ;;
  "full"|*)
    echo "📦 Building project..."
    ./build.sh
    echo "⬆️ Pushing to Google Apps Script..."
    clasp push --force
    echo "🔄 Redeploying..."
    # Get the latest deployment ID and redeploy it
    echo "🔍 Getting current deployment info..."
    DEPLOYMENT_ID=$(clasp deployments | head -n 2 | tail -n 1 | awk '{print $2}' | tr -d '-')
    if [ -n "$DEPLOYMENT_ID" ] && [ "$DEPLOYMENT_ID" != "@HEAD" ]; then
      echo "📋 Found deployment ID: $DEPLOYMENT_ID" 
      clasp deploy --deploymentId "$DEPLOYMENT_ID" --description "Updated $(date '+%Y-%m-%d %H:%M:%S')"
    else
      echo "⚠️ No existing deployment found. Creating new deployment..."
      clasp deploy --description "New deployment $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    ;;
esac

echo "✅ Clasp workflow completed!"
echo ""
echo "📋 Current deployments:"
clasp deployments
```

The command will:

1. **Build** the project using your existing `build.sh` script
2. **Push** the built files to Google Apps Script with `--force` 
3. **Redeploy** to the existing deployment (or create new if none exists)
4. **Show** the current deployment status

You can use it with different options:
- `/clasp` or `/clasp full` - Complete build → push → redeploy workflow
- `/clasp build` - Just build the project  
- `/clasp push` - Build and push to Apps Script
- `/clasp redeploy` - Just redeploy the current version (no build/push)

The command automatically finds your latest deployment ID and updates it, so you won't create multiple deployments unnecessarily.