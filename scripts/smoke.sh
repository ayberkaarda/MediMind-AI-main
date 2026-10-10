#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:8080}}"
WAIT="${WAIT:-30}"
LEGACY="${LEGACY:-1}"
CLIENT_ID="11111111-1111-4111-8111-111111111111"
API="${BASE_URL%/}/api/v1"
PASS_COUNT=0
FAIL_COUNT=0

for tool in curl jq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'ERROR: required command not found: %s\n' "$tool" >&2
    exit 2
  fi
done

check() {
  local name="$1" ok="$2"
  if [[ "$ok" == true ]]; then
    printf 'PASS %s\n' "$name"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    printf 'FAIL %s\n' "$name"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

request() {
  local method="$1" url="$2" body="${3:-}" client="${4:-}" response
  local -a args=(-sS -X "$method" -w $'\n%{http_code}')
  if [[ -n "$body" ]]; then args+=(-H 'Content-Type: application/json' --data "$body"); fi
  if [[ -n "$client" ]]; then args+=(-H "X-Client-Id: $client"); fi
  response="$(curl "${args[@]}" "$url" 2>/dev/null)" || { REPLY_BODY=''; REPLY_CODE=000; return 1; }
  REPLY_CODE="${response##*$'\n'}"
  REPLY_BODY="${response%$'\n'*}"
}

health_ok=false
attempt=0
while (( attempt <= WAIT )); do
  if request GET "$API/health" && [[ "$REPLY_CODE" == 200 ]] && jq -e '.status == "ok" and .model_loaded == true' >/dev/null 2>&1 <<<"$REPLY_BODY"; then
    health_ok=true
    break
  fi
  (( attempt == WAIT )) && break
  sleep 1
  attempt=$((attempt + 1))
done
check 'GET /health returns ready service' "$health_ok"

if request GET "$API/symptoms" && [[ "$REPLY_CODE" == 200 ]] && jq -e '.symptoms | length == 131' >/dev/null 2>&1 <<<"$REPLY_BODY" && jq -e '.regions | length == 8' >/dev/null 2>&1 <<<"$REPLY_BODY"; then
  check 'GET /api/v1/symptoms returns 131 symptoms and 8 regions' true
else
  check 'GET /api/v1/symptoms returns 131 symptoms and 8 regions' false
fi

PREDICT_BODY='{"symptoms":["itching","skin_rash","nodal_skin_eruptions","dischromic_patches"]}'
if request POST "$API/predict" "$PREDICT_BODY" "$CLIENT_ID"; then
  predict_body="$REPLY_BODY"
  predict_code="$REPLY_CODE"
else
  predict_body=''
  predict_code=000
fi
if [[ "$predict_code" == 200 ]] && jq -e '.top_prediction.name == "Mantar Enfeksiyonu" and (.analysis_id | type == "number")' >/dev/null 2>&1 <<<"$predict_body"; then
  check 'POST /api/v1/predict returns expected prediction and analysis id' true
else
  check 'POST /api/v1/predict returns expected prediction and analysis id' false
fi

has_request_id=false
headers="$(curl -sS -D - -o /dev/null -X POST -H 'Content-Type: application/json' -H "X-Client-Id: $CLIENT_ID" --data "$PREDICT_BODY" "$API/predict" 2>/dev/null || true)"
while IFS= read -r line; do
  if [[ "${line,,}" == x-request-id:* ]]; then has_request_id=true; fi
done <<<"$headers"
check 'POST /api/v1/predict includes X-Request-ID' "$has_request_id"

if request POST "$API/predict" "$PREDICT_BODY" && [[ "$REPLY_CODE" == 200 ]] && jq -e '.analysis_id == null' >/dev/null 2>&1 <<<"$REPLY_BODY"; then
  check 'POST /api/v1/predict without client id returns null analysis id' true
else
  check 'POST /api/v1/predict without client id returns null analysis id' false
fi

UNKNOWN_BODY='{"symptoms":["yok_boyle_bir_sey"]}'
if request POST "$API/predict" "$UNKNOWN_BODY"; then
  unknown_body="$REPLY_BODY"
  unknown_code="$REPLY_CODE"
else
  unknown_body=''
  unknown_code=000
fi
if [[ "$unknown_code" == 422 ]] && jq -e '.code == "unknown_symptom"' >/dev/null 2>&1 <<<"$unknown_body"; then
  check 'POST /api/v1/predict rejects unknown symptom with 422' true
else
  check 'POST /api/v1/predict rejects unknown symptom with 422' false
fi
problem_type="$(curl -sS -D - -o /dev/null -X POST -H 'Content-Type: application/json' --data "$UNKNOWN_BODY" "$API/predict" 2>/dev/null | while IFS= read -r line; do if [[ "${line,,}" == content-type:* ]]; then printf '%s' "${line#*:}"; break; fi; done | tr -d '\r ' || true)"
check 'Unknown symptom response uses application/problem+json' "$([[ "$problem_type" == application/problem+json* ]] && printf true || printf false)"

if request GET "$API/history" '' "$CLIENT_ID" && [[ "$REPLY_CODE" == 200 ]] && jq -e '.total >= 1' >/dev/null 2>&1 <<<"$REPLY_BODY"; then
  check 'GET /api/v1/history contains prediction' true
else
  check 'GET /api/v1/history contains prediction' false
fi
if request DELETE "$API/history" '' "$CLIENT_ID" && [[ "$REPLY_CODE" == 204 ]]; then
  check 'DELETE /api/v1/history returns 204' true
else
  check 'DELETE /api/v1/history returns 204' false
fi
if request GET "$API/history" '' "$CLIENT_ID" && [[ "$REPLY_CODE" == 200 ]] && jq -e '.total == 0' >/dev/null 2>&1 <<<"$REPLY_BODY"; then
  check 'GET /api/v1/history is empty after delete' true
else
  check 'GET /api/v1/history is empty after delete' false
fi

if [[ "$LEGACY" == 0 ]]; then
  printf 'PASS Legacy GET /symptoms skipped (LEGACY=0)\n'
else
  if request GET "${BASE_URL%/}/symptoms" && [[ "$REPLY_CODE" == 200 ]] && jq -e '.symptoms | length == 131' >/dev/null 2>&1 <<<"$REPLY_BODY"; then
    check 'GET /symptoms legacy route returns 131 symptoms' true
  else
    check 'GET /symptoms legacy route returns 131 symptoms' false
  fi
fi

printf 'Summary: %d passed, %d failed\n' "$PASS_COUNT" "$FAIL_COUNT"
(( FAIL_COUNT == 0 ))
