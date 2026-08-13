#!/usr/bin/env bash
# Aplica las migraciones pendientes a Supabase.
#
#   ./scripts/db-push.sh            aplica lo pendiente
#   ./scripts/db-push.sh repair 002 marca la 002 como ya aplicada
#
# Lo segundo hace falta cuando una migración se corrió a mano —o quedó a medias
# y se completó por otro lado— y el CLI la sigue viendo pendiente. Sin eso, el
# siguiente push la reintenta y choca con "column already exists".
#
# Pide la contraseña sin mostrarla y la codifica antes de meterla en la URL:
# un '!', un '#' o un '@' en la contraseña rompen la cadena de conexión y el
# error que sale es "password authentication failed", que despista.
#
# La conexión va por el pooler y no por db.<ref>.supabase.co: esa es IPv6-only
# y desde muchas redes da ECONNREFUSED.
set -euo pipefail

REF="qfvhaedkvetknqilygcx"
HOST="aws-0-us-west-2.pooler.supabase.com"

read -rsp "Contraseña de la base de Supabase: " PASS
echo

ENC=$(P="$PASS" python3 -c 'import os, urllib.parse; print(urllib.parse.quote(os.environ["P"], safe=""))')

URL="postgresql://postgres.${REF}:${ENC}@${HOST}:5432/postgres"
cd "$(dirname "$0")/.."

if [ "${1:-}" = "repair" ]; then
  npx supabase migration repair --status applied "${2:?falta el número de migración}" --db-url "$URL"
else
  npx supabase db push --db-url "$URL"
fi
