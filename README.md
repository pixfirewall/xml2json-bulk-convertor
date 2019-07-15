# xml to json bulk convertor 
this app convert xml files to json files and for the best performanc use all core of your cpu.

# Dependencies
this app is depended on two below packages:
1. better-queue
2. xml-js

#Usage
```javascript
const Convertor = require('./lib')

const x2j = new Convertor(opt);

x2j.start();
```

#methods

##`const x2j = new Convertor(opt)`

Creates a convertor instance. Pass in an optional `opts` object to configure the instance.

The configuration is shown below:
```javascript
{
	// input dir. the dir that contain all xml files.
	input: 'xml', 
	// output dir.
	output: 'json', 
	// number of concurrent job.
	concurrent: 100
}
```

##`x2j.start()`

Start the convertor.