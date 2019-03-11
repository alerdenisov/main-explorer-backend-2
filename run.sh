#! /bin/bash
echo "wait befor run $@"
sleep 1s
echo "run $@"
yarn start:prod "$@"