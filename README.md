
#### Installation
- install node > 12
- define $HS_SCRIPTS: 
    - nano ~/.bash_profile
    - add:
        - export HS_SCRIPTS=/Users/haystack/Documents/scripts/bin
        - export PATH=$HS_SCRIPTS:$PATH
    - For instance: /Users/me/Documents/scripts/bin (folders structure should exist)
- run: ./install.sh
    - folder added: $HS_SCRIPTS/hls-live-stats
    - command added: $HS_SCRIPTS/bin/hs-live-tester

#### How is it used?
Run 
hs-live-tester {TIME} {FILE_NAME} {URL}
where
- TIME: time in seconds
- FILE_NAME: name of report
- URL: protocol should not be included (remove http:// or https://)
