#!/usr/bin/env bash
# sync-env.sh — Fetches consumer Cognito pool values from CloudFormation and writes them to .env
#
# Usage: ./scripts/sync-env.sh [stage]
#   stage defaults to "dev"

set -euo pipefail

STAGE="${1:-dev}"
STACK_NAME="NearDeal-${STAGE}-Auth"
ENV_FILE="$(dirname "$0")/../.env"

echo "Fetching outputs from stack: ${STACK_NAME}..."

OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs" \
  --output json \
  --region eu-west-1)

CONSUMER_POOL_ID=$(echo "${OUTPUTS}" | python3 -c "
import sys, json
outputs = json.load(sys.stdin)
for o in outputs:
    if o['OutputKey'] == 'ConsumerUserPoolId':
        print(o['OutputValue'])
        break
")

CONSUMER_CLIENT_ID=$(echo "${OUTPUTS}" | python3 -c "
import sys, json
outputs = json.load(sys.stdin)
for o in outputs:
    if o['OutputKey'] == 'ConsumerUserPoolClientId':
        print(o['OutputValue'])
        break
")

if [ -z "${CONSUMER_POOL_ID}" ] || [ -z "${CONSUMER_CLIENT_ID}" ]; then
  echo "ERROR: Could not find ConsumerUserPoolId or ConsumerUserPoolClientId in stack outputs."
  exit 1
fi

echo "Consumer Pool ID:     ${CONSUMER_POOL_ID}"
echo "Consumer Client ID:   ${CONSUMER_CLIENT_ID}"

# Update .env file in place
if [ -f "${ENV_FILE}" ]; then
  sed -i.bak "s|^EXPO_PUBLIC_CONSUMER_POOL_ID=.*|EXPO_PUBLIC_CONSUMER_POOL_ID=${CONSUMER_POOL_ID}|" "${ENV_FILE}"
  sed -i.bak "s|^EXPO_PUBLIC_CONSUMER_CLIENT_ID=.*|EXPO_PUBLIC_CONSUMER_CLIENT_ID=${CONSUMER_CLIENT_ID}|" "${ENV_FILE}"
  rm -f "${ENV_FILE}.bak"
  echo "Updated ${ENV_FILE} successfully."
else
  echo "EXPO_PUBLIC_CONSUMER_POOL_ID=${CONSUMER_POOL_ID}" >> "${ENV_FILE}"
  echo "EXPO_PUBLIC_CONSUMER_CLIENT_ID=${CONSUMER_CLIENT_ID}" >> "${ENV_FILE}"
  echo "Created ${ENV_FILE} with consumer pool values."
fi
