#!/bin/bash

# Build script for gw-mvr-admin Docker image (Linux/amd64)
# Usage: ./build-linux.sh [version] [options]
#
# Examples:
#   ./build-linux.sh                    # Build with default version
#   ./build-linux.sh 25.03.2026.1       # Build with specific version
#   ./build-linux.sh --save             # Build and save to tar file
#   ./build-linux.sh --push registry    # Build and push to registry

set -e

# Default values
VERSION="1.0.0-alpha.1"
IMAGE_NAME="gw-mvr-admin"
PLATFORM="linux/amd64"
SAVE_TAR=false
PUSH_REGISTRY=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --save)
      SAVE_TAR=true
      shift
      ;;
    --push)
      PUSH_REGISTRY="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [version] [options]"
      echo ""
      echo "Options:"
      echo "  --save           Save image to tar file"
      echo "  --push REGISTRY  Push image to registry"
      echo "  --help, -h       Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                          # Build with default version"
      echo "  $0 2.0.0-alpha.2            # Build with specific version"
      echo "  $0 --save                   # Build and save to tar"
      echo "  $0 --push ghcr.io/myorg     # Build and push to registry"
      exit 0
      ;;
    *)
      VERSION="$1"
      shift
      ;;
  esac
done

FULL_IMAGE_NAME="${IMAGE_NAME}:${VERSION}"

echo "========================================"
echo "Building Docker Image for Linux"
echo "========================================"
echo "Image: ${FULL_IMAGE_NAME}"
echo "Platform: ${PLATFORM}"
echo "Environment: production"
echo "========================================"

if [ ! -f "./.env.production.local" ]; then
  echo "ERROR: ./.env.production.local is required for production builds."
  exit 1
fi

set -a
# shellcheck disable=SC1091
. "./.env.production.local"
set +a

if [ -z "${NEXT_PUBLIC_SUPABASE_URL}" ] || [ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY}" ]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.production.local."
  exit 1
fi

# Build the image
if docker buildx version >/dev/null 2>&1; then
  docker buildx build \
    --load \
    --platform "${PLATFORM}" \
    --build-arg ENV=production \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -t "${FULL_IMAGE_NAME}" \
    .
else
  echo "WARN: docker buildx not available; building without --platform"
  docker build \
    --build-arg ENV=production \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -t "${FULL_IMAGE_NAME}" \
    .
fi

echo ""
echo "✅ Build completed successfully!"
echo ""

# Save to tar if requested
if [ "$SAVE_TAR" = true ]; then
  TAR_FILE="${IMAGE_NAME}-${VERSION}.tar"
  echo "Saving image to ${TAR_FILE}..."
  docker save "${FULL_IMAGE_NAME}" -o "${TAR_FILE}"
  echo "✅ Image saved to ${TAR_FILE}"
  echo ""
fi

# Push to registry if requested
if [ -n "$PUSH_REGISTRY" ]; then
  REGISTRY_IMAGE="${PUSH_REGISTRY}/${FULL_IMAGE_NAME}"
  echo "Tagging image for registry: ${REGISTRY_IMAGE}"
  docker tag "${FULL_IMAGE_NAME}" "${REGISTRY_IMAGE}"

  echo "Pushing to registry..."
  docker push "${REGISTRY_IMAGE}"
  echo "✅ Image pushed to ${REGISTRY_IMAGE}"
  echo ""
fi

echo "Image: ${FULL_IMAGE_NAME}"
echo ""
echo "Next steps:"
if [ "$SAVE_TAR" = false ] && [ -z "$PUSH_REGISTRY" ]; then
  echo "  • Save to tar:  docker save ${FULL_IMAGE_NAME} -o ${IMAGE_NAME}-${VERSION}.tar"
  echo "  • Push to registry: docker tag ${FULL_IMAGE_NAME} <registry>/${FULL_IMAGE_NAME}"
  echo "                      docker push <registry>/${FULL_IMAGE_NAME}"
fi
echo "  • Run locally:  docker run --env-file .env.production.local -p 3000:3000 ${FULL_IMAGE_NAME}"
echo ""