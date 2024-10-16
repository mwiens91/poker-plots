#!/usr/bin/env bash

npx rollup ../js/main.js --file ../js/temp.js --format es
npx terser ../js/temp.js -m -o ../js/pokerplots.min.js --compress ecma=6

rm ../js/temp.js
