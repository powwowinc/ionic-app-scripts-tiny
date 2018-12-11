#!/bin/bash
echo "***************************************************************************"
echo 
echo "Building ionic-app-scripts-tiny" 
echo "  branch ${GIT_BRANCH}"
echo "  commit ${GIT_COMMIT}"
echo 
echo "***************************************************************************"

set -e

for NPM_PATH in /usr/bin/npm /usr/local/bin/npm
do
    if [ -f ${NPM_PATH} ];
    then
        NPM=${NPM_PATH}
        break
    fi
done

if [ ! -f ${NPM} ];
then
    echo -------
    echo unable to locate NPM executable; aborting
    echo
    exit 10
fi

echo installing
rm -rf package-lock.json npm-shrinkwrap.json node_modules dist
${NPM} install
${NPM} run build

echo testing
${NPM} run test

