# icu-dat-tz-updater

Small node-js tool made for updating icu time-zone data inside a icudtlxx.dat file (used to build node-js)

## Requirements

1. Nodejs 10/12 or more recent

1. apt-get install icu-devtools ( `icupkg` should be in your path)

1. a icu.dat file that require a patch

## How to use

Use either of :

* `node ./index.js ${ICU_DAT_PATH}`
* `npm run start ${ICU_DAT_PATH}`

Parameters are : `targetfile [timezone-version] [icu-version]  [endianness]`

* `targetfile` : a path to a valid icu.dat file
* `[timezone-version]` : default is '2019c'
* `[icu-version]` : default is '44' (for nodejs build)
* `[endianness]` : default is 'le' (for nodejs build)
