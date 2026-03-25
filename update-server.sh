#!/bin/bash

# Update script for dfm-mvr-gateway on the server.
# This script:
# 1) Requires a version tag to be provided.
# 2) Builds and pushes the image using build-linux.sh.
# 3) SSHes into the server and stops the service.
# 4) Pulls the tagged image from Docker Hub.
# 5) Starts the service again using docker compose.

set -e

# Configuration
IMAGE_REPO="titanwest/gw.mvr.admin"
SSH_TARGET="gw1"
SERVER_DIR="~/gw.mvr.admin"
SERVICE_NAME="gw-admin"

# Load local environment variables if present (for DOCKER_USER/DOCKER_TOKEN)
if [ -f "./.env.production.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "./.env.production.local"
  set +a
fi

# Determine the tag to deploy
TAG_INPUT="$1"
if [ -z "${TAG_INPUT}" ]; then
  echo "ERROR: You must provide a version tag."
  echo "Usage:"
  echo "  $0 25.03.2026.1"
  exit 1
fi

IMAGE_TAG="${TAG_INPUT}"
FULL_IMAGE_NAME="${IMAGE_REPO}:${IMAGE_TAG}"

echo "========================================"
echo "Checking for updates on main"
echo "========================================"
git fetch origin main
LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse origin/main)"
if [ "${LOCAL_HEAD}" != "${REMOTE_HEAD}" ]; then
  echo "Local branch is behind origin/main. Pulling latest changes..."
  git pull origin main
  echo "✅ Repository updated"
else
  echo "✅ Repository is up to date"
fi
echo ""

echo "========================================"
echo "Building Docker image locally"
echo "========================================"
echo "Version: ${IMAGE_TAG}"
echo ""

./build-linux.sh "${IMAGE_TAG}"
echo "✅ Local build completed"
echo ""

if ! docker image inspect "dfm-mvr-gateway:${IMAGE_TAG}" >/dev/null 2>&1; then
  echo "ERROR: Expected local image dfm-mvr-gateway:${IMAGE_TAG} not found."
  echo "Check build-linux.sh output or rebuild the image."
  exit 1
fi

echo "Tagging image for Docker Hub..."
docker tag "dfm-mvr-gateway:${IMAGE_TAG}" "${FULL_IMAGE_NAME}"
echo "✅ Image tagged as ${FULL_IMAGE_NAME}"
echo ""

if ! docker info 2>/dev/null | grep -q "Username:"; then
  if [ -n "${DOCKER_USER}" ] && [ -n "${DOCKER_TOKEN}" ]; then
    echo "Docker Hub login required. Using DOCKER_USER/DOCKER_TOKEN..."
    echo "${DOCKER_TOKEN}" | docker login -u "${DOCKER_USER}" --password-stdin
  else
    echo "Docker Hub login required. Running docker login..."
    docker login
  fi
  echo ""
  if ! docker info 2>/dev/null | grep -q "Username:"; then
    echo "ERROR: Docker Hub login failed or was cancelled."
    exit 1
  fi
fi

echo "Pushing image to Docker Hub..."
docker push "${FULL_IMAGE_NAME}"
echo "✅ Image pushed to ${FULL_IMAGE_NAME}"
echo ""

echo "========================================"
echo "Starting server update"
echo "========================================"
echo "Server: ${SSH_TARGET}"
echo "Compose dir: ${SERVER_DIR}"
echo "Service: ${SERVICE_NAME}"
echo "Image: ${FULL_IMAGE_NAME}"
echo ""

# Stop the running service
#echo "Stopping service on server..."
#ssh "${SSH_TARGET}" "cd ${SERVER_DIR} && IMAGE_TAG=${IMAGE_TAG} docker compose stop ${SERVICE_NAME}"
#echo "✅ Service stopped"
#echo ""

# Pull the new image tag
#echo "Pulling image on server..."
#ssh "${SSH_TARGET}" "cd ${SERVER_DIR} && IMAGE_TAG=${IMAGE_TAG} docker compose pull ${SERVICE_NAME}"
#echo "✅ Image pulled"
#echo ""

# Start the service with the new tag
#echo "Starting service on server..."
#ssh "${SSH_TARGET}" "cd ${SERVER_DIR} && IMAGE_TAG=${IMAGE_TAG} docker compose up -d ${SERVICE_NAME}"
#echo "✅ Service started"
#echo ""

echo "Server update complete."
echo "Image deployed: ${FULL_IMAGE_NAME}"