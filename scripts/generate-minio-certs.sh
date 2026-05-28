#!/usr/bin/env bash
# Generates a self-signed TLS certificate for MinIO.
# In production, replace these with certs from your CA or Let's Encrypt.
#
# Usage:
#   sudo bash scripts/generate-minio-certs.sh [cert-dir]
#
# Default cert-dir: /etc/minio/certs
# MinIO expects:
#   <certs-dir>/public.crt   — certificate (PEM)
#   <certs-dir>/private.key  — private key  (PEM)

set -euo pipefail

CERTS_DIR="${1:-/etc/minio/certs}"
DAYS=365
CN="${MINIO_TLS_CN:-minio}"

echo "Generating MinIO TLS certificate in ${CERTS_DIR} ..."

mkdir -p "${CERTS_DIR}"
chmod 700 "${CERTS_DIR}"

# Generate private key (2048-bit RSA)
openssl genrsa -out "${CERTS_DIR}/private.key" 2048

# Generate self-signed certificate
openssl req -new -x509 \
  -key "${CERTS_DIR}/private.key" \
  -out "${CERTS_DIR}/public.crt" \
  -days "${DAYS}" \
  -subj "/CN=${CN}" \
  -addext "subjectAltName=DNS:${CN},DNS:localhost,IP:127.0.0.1"

chmod 600 "${CERTS_DIR}/private.key"
chmod 644 "${CERTS_DIR}/public.crt"

echo "Done."
echo "  Certificate : ${CERTS_DIR}/public.crt  (valid ${DAYS} days)"
echo "  Private key : ${CERTS_DIR}/private.key"
echo ""
echo "Mount ${CERTS_DIR} as /certs:ro inside the minio container."
echo "See docs/runbooks/rotate-minio-certs.md for rotation instructions."
