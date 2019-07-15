const convert = require('xml-js');
const fs = require('fs');
const path = require('path');
const Queue = require('better-queue');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

class Convertor {
	constructor(opt) {
		this.xmlPath = opt.input || 'xml';
		this.jsonPath = opt.output || 'json';
		this.concurrent = opt.concurrent || 1;
	}

	start() {
		fs.stat(path.join(__dirname, this.xmlPath), (e) => {
			if(e) return console.log('input dir not exist.')
			this.fileNames = this._readDir()
			try {
				fs.statSync(path.join(__dirname, this.jsonPath));
				if(this.fileNames.length < numCPUs) this._x2jSmal();
				else {
					this.classMap = this._preCluster();
					this._cluster();
				}
	
			} catch(e) {
				console.log('output path not exist.')
			}
		})
	}

	_cluster() {
		if (cluster.isMaster) {
			for (let i = 0; i < numCPUs; i++) {
				const worker = cluster.fork()
				worker.send(this.classMap[i])
			}
		} 
		else {
			process.on('message', msg => {
				this._x2j(msg)
			})
		}
	}

	_readDir() {
		const pathI = path.join(__dirname, this.xmlPath)
		return fs.readdirSync(pathI).filter(i => /\.xml/.test(i));
	}

	_preCluster() {
		const fileCount = this.fileNames.length;
			const loopCicle = (Math.floor(fileCount/numCPUs)) - 1
			const arr = [];
			for(let j = 0, i = 1 ; i < numCPUs ; j += (loopCicle+1) , i++){
				arr[i-1] = [j, (j+loopCicle)]
				if(i === numCPUs - 1) arr[i] = [(j+loopCicle+1), (fileCount-1)]
			}
			return arr
	}

	_x2j(i) {
		const q = new Queue((input, cb) => {
			let pathO = path.join(__dirname, this.jsonPath, input.replace('.xml', '.json'))
			const pathI = path.join(__dirname, this.xmlPath, input)
			const jsonContent = convert.xml2json(fs.readFileSync(pathI), {compact: true, spaces: 4});
			if(fs.existsSync(pathO)) pathO = path.join(__dirname, this.jsonPath, input.replace('.xml', `_${Math.ceil(Math.random()*10)}.json`))
			fs.writeFile(pathO, jsonContent, (e) => {
				if (e) console.log(`${input} Error.`)
				else console.log(`${input} Done.`)
			});
			cb(null, result);
		}, { concurrent: this.concurrent })

		for(let j = i[0] ; j <= i[1] ; j++) {
			q.push(this.fileNames[j])
		}
	}

	_x2jSmal() {
		this.fileNames.forEach(input => {
			let pathO = path.join(__dirname, this.jsonPath, input.replace('.xml', '.json'))
			const pathI = path.join(__dirname, this.xmlPath, input)
			const jsonContent = convert.xml2json(fs.readFileSync(pathI), {compact: true, spaces: 4});
			fs.writeFile(pathO, jsonContent, () => {
				console.log(`${input} Done.`)
			});
		})
	}
	
}

module.exports = Convertor;