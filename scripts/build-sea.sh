#!/bin/sh

scriptdir=`dirname $0`

node --experimental-sea-config "${scriptdir}/../sea-config.json"

cp $(command -v node) "${scriptdir}/../dist/jsmuggle"

npx postject "${scriptdir}/../dist/jsmuggle" NODE_SEA_BLOB "${scriptdir}/../dist/sea-prep.blob" \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    #--macho-segment-name NODE_SEA