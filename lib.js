const convert = require('xml-js');
const fs = require('fs');
const path = require('path');
const Queue = require('better-queue');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const _cluster 		= new WeakMap(),
			_readDir 		= new WeakMap(),
			_preCluster = new WeakMap(),
			_x2j 				= new WeakMap(),
			_x2jSmal 		= new WeakMap();
			_xmlPath 		= new WeakMap(),
			_jsonPath		= new WeakMap(),
			_concurrent	= new WeakMap(),
			_fileNames	= new WeakMap(),
			_classMap		= new WeakMap();


class Convertor {
	constructor(opt) {
		if(!opt) opt = {};
		_xmlPath.set(this, opt.input || 'xml');
		_jsonPath.set(this, opt.output || 'json');
		_concurrent.set(this, opt.concurrent || 100);

		_cluster.set(this, () => {
			if (cluster.isMaster) {
				for (let i = 0; i < numCPUs; i++) {
					const worker = cluster.fork()
					worker.send(_classMap.get(this)[i])
				}
			} 
			else {
				process.on('message', msg => {
					_x2j.get(this)(msg)
				})
			}
		})

		_readDir.set(this, () => {
			const pathI = path.join(__dirname, _xmlPath.get(this))
			return fs.readdirSync(pathI).filter(i => /\.xml/.test(i));
		})

		_preCluster.set(this, () => {
			const fileCount = _fileNames.get(this).length;
				const loopCicle = (Math.floor(fileCount/numCPUs)) - 1
				const arr = [];
				for(let j = 0, i = 1 ; i < numCPUs ; j += (loopCicle+1) , i++){
					arr[i-1] = [j, (j+loopCicle)]
					if(i === numCPUs - 1) arr[i] = [(j+loopCicle+1), (fileCount-1)]
				}
				return arr
		})

		_x2j.set(this, i => {
			const q = new Queue((input, cb) => {
				let pathO = path.join(__dirname, _jsonPath.get(this), input.replace('.xml', '.json'))
				const pathI = path.join(__dirname, _xmlPath.get(this), input)
				const jsonContent = convert.xml2json(fs.readFileSync(pathI), {compact: true, spaces: 4});
				if(fs.existsSync(pathO)) pathO = path.join(__dirname, _jsonPath.get(this), input.replace('.xml', `_${Math.ceil(Math.random()*10)}.json`))
				fs.writeFile(pathO, jsonContent, (e) => {
					if (e) console.log(`${input} Error.`)
					else console.log(`${input} Done.`)
				});
				cb(null, result);
			}, { concurrent: _concurrent.get(this) })

			for(let j = i[0] ; j <= i[1] ; j++) {
				q.push(_fileNames.get(this)[j])
			}
		})

		_x2jSmal.set(this, () => {
			_fileNames.get(this).forEach(input => {
				let pathO = path.join(__dirname, _jsonPath.get(this), input.replace('.xml', '.json'))
				const pathI = path.join(__dirname, _xmlPath.get(this), input)
				const jsonContent = convert.xml2json(fs.readFileSync(pathI), {compact: true, spaces: 4});
				fs.writeFile(pathO, jsonContent, () => {
					console.log(`${input} Done.`)
				});
			})
		})
	}

	start() {
		fs.stat(path.join(__dirname, _xmlPath.get(this)), (e) => {
			if(e) return console.log('input dir not exist.')
			_fileNames.set(this, _readDir.get(this)())
			try {
				fs.statSync(path.join(__dirname, _jsonPath.get(this)));
				if(_fileNames.get(this).length < numCPUs) _x2jSmal.get(this)();
				else {
					_classMap.set(this, _preCluster.get(this)())
					_cluster.get(this)();
				}

			} catch(e) {
				console.log('output path not exist.')
			}
		})
	}
}

module.exports = Convertor;