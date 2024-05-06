rm -rf $HS_SCRIPTS/hls-live-stats
# to use github
git clone https://github.com/pmendozav/hls-live-stats.git
mv ./hls-live-stats $HS_SCRIPTS/hls-live-stats
# to local test
# cp -rf ./ $HS_SCRIPTS/hls-live-stats

cd $HS_SCRIPTS
rm -rf ccextractor
git clone https://github.com/CCExtractor/ccextractor.git
cd $HS_SCRIPTS/ccextractor/mac
./build.command


cd $HS_SCRIPTS/hls-live-stats
npm install

OUTPUT=$(pwd)

if ! [ -d "../bin" ];
then
	mkdir ../bin
fi

cd ../bin

# create hs-live-tester script
echo '#!/bin/sh' > hs-live-tester
echo '' >> hs-live-tester

echo 'DATA_SOURCE="$1"' >> hs-live-tester
echo 'TARGET="$2"' >> hs-live-tester
echo 'TIME="$3"' >> hs-live-tester
echo '' >> hs-live-tester

# echo 'node $HS_SCRIPTS/../mainScript.js $DATA_SOURCE $TARGET $TIME' >> hs-live-tester

printf "node %s/hls-live-stats/mainScript.js \$DATA_SOURCE \$TARGET \$TIME\n" $HS_SCRIPTS >> hs-live-tester

echo '' >> hs-live-tester

echo 'open "http://localhost:3000/stats"' >> hs-live-tester

chmod 777 hs-live-tester

# create hs-cc-live-tester script
echo '#!/bin/sh' > hs-cc-live-tester
echo '' >> hs-cc-live-tester
echo 'TIME="$1"' >> hs-cc-live-tester
echo 'DATA_SOURCE="$2"' >> hs-cc-live-tester
printf "node %s/hls-live-stats/checkCC.js \$TIME \$DATA_SOURCE\n" $HS_SCRIPTS >> hs-cc-live-tester
chmod 777 hs-cc-live-tester
