cd $HS_SCRIPTS/../
rm -rf ccextractor
git clone https://github.com/CCExtractor/ccextractor.git

cd $HS_SCRIPTS/../ccextractor/mac
./build.command

cp ./ccextractor $HS_SCRIPTS/ccextractor

cd $HS_SCRIPTS/../
rm -rf hls-live-stats
git clone https://github.com/pmendozav/hls-live-stats.git

cd hls-live-stats
npm ci

OUTPUT=$(pwd)

cd ../bin


echo '#!/bin/sh' > hs-live-tester
echo '' >> hs-live-tester

echo '# init server' >> hs-live-tester
echo 'kill -9 $(lsof -ti:3000)' >>  hs-live-tester
printf "node %s/server.js &\n" $OUTPUT >> hs-live-tester
echo '' >> hs-live-tester

echo 'TIME="$1"' >> hs-live-tester
echo 'FILE_NAME="$2"' >> hs-live-tester
echo 'URL="$3"' >> hs-live-tester
echo '' >> hs-live-tester

echo '# register source' >> hs-live-tester
echo 'sleep 3' >> hs-live-tester
echo 'curl -s "http://localhost:3000/$URL" >> log' >> hs-live-tester
echo '' >> hs-live-tester

echo 'sleep 2' >> hs-live-tester
echo '' >> hs-live-tester

echo 'mediastreamvalidator -t $TIME -O $FILE_NAME.json https://$URL' >> hs-live-tester
echo 'hlsreport $FILE_NAME.json' >> hs-live-tester
echo 'open $FILE_NAME.html' >> hs-live-tester
echo '' >> hs-live-tester

echo "URL_2=\"'\$3'\"" >> hs-live-tester
echo 'urlencode=$(node --eval "console.log(encodeURIComponent($URL_2))")' >> hs-live-tester
echo 'open "http://localhost:3000/stats/$urlencode"' >> hs-live-tester

chmod 777 hs-live-tester
