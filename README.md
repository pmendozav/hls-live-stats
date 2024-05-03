  

### Installation

  

#### 1. Requisites:

1.1 Install HLS tools from [here](https://developer.apple.com/download/all/?q=hls)

  

![1](assets/1.png?raw=true  "x")

  

In order to verify the installation:

- Press cmd + space

- Open “terminal”

- Test the command: `hlsreport`

Result:

![2](assets/2.png?raw=true  "x")

  

1.2 Directory structure

  

- Inside of the terminal, write:

  

```

mkdir -p ~/haystack/bin

```

  

1.3 Create the environment variable `HS_SCRIPTS`

  

- Open `.bash_profile` using: `nano ~/.bash_profile`

- Add the following lines:

```

export HS_SCRIPTS=~/haystack

export PATH=$PATH:$HS_SCRIPTS/bin

```

- Save changes : “ctrl + x” -> Y

- Execute: `source ~/.bash_profile`

- To verify use: `echo $HS_SCRIPTS`

  

![3](assets/3.png?raw=true  "x")

  

#### 2. Script installation:

2.1 Copy and save `install.sh`

  

![4](assets/4.png?raw=true  "x")

  

2.2 Update permissions with:

  

```

chmod 777 install.sh

```

  

2.3 Run the script with:

  

```

bash install.sh

```

![5](assets/5.png?raw=true  "x")

  

Now you are able to use “hs-live-tester”.

  

#### Observations:

  

- If “npm” is missed install it:

	- brew update

	- brew install nvm

	- nvm install v12.21.0

	- nvm use v12.21.0

  
  

### How is it used?

Run

hs-live-tester {TIME} {FILE_NAME} {URL}

where

- TIME: time in seconds

- FILE_NAME: name of report

- URL: protocol should not be included (remove http:// or https://)

  

### Config Example

  

```

yahooLive [https://d1ewctnvcwvvvu.cloudfront.net/v1/....../playlist.m3u8](https://d1ewctnvcwvvvu.cloudfront.net/v1/....../playlist.m3u8)

NewsmaxLive [https://d3ut7rvli78ywi.cloudfront.net/v1/master/......../index.m3u8](https://d3ut7rvli78ywi.cloudfront.net/v1/master/......../index.m3u8)

```