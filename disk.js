module.exports = DiskDrawer;
var fs = require('fs');
var crypto = require('crypto');
var config = {}; try {config=require('./config.json')} catch(err){};

// ============================================================================
// === DISKDRAWER
// ============================================================================
const maxDisksInDrawer=config.maxDisksInDrawer||512; // max number of disks in disk-drawer

function DiskDrawer() {
	this.index = [];
}

DiskDrawer.prototype.newDisk = function(id) {
	if (id) {
		let disk=this.findDisk(id);
		if (disk) {return disk} 
		else {
			if (this.index.length<=maxDisksInDrawer) {
				let newDisk = new Disk(id);
				this.index.push(newDisk);
				return newDisk;
			} else {return undefined}
		}   
	}
}

DiskDrawer.prototype.findDisk = function(id) {
	if ((typeof id=='string') && this.index instanceof Array && id) {
		return this.index.find(s => s.id.toLowerCase()==id.toLowerCase())||false;
	} else {return undefined}
}

DiskDrawer.prototype.formatDisk = function(id) {
	this.index = this.index.filter(i => i.id!==id);
	return {"info":"disk formatted"};
}

DiskDrawer.prototype.housekeeping = function() {
	// remove all disks with no blocks
	this.index = this.index.filter(i => i.blocks.length>0);
	return {"info":"all unused/empty disks removed from disk-drawer"};
}

DiskDrawer.prototype.info = function() {
	let disks=this.index.length;
	let blockcount=this.index.map((i)=>{return i.blocks.length}).reduce((a,c)=>(a+c),0);
	let used=JSON.stringify(this).length;
	let disklist=this.index.map((i)=>{return i.info()}).sort();
	let maxdisks=maxDisksInDrawer;
	return {disks:disks,blockcount:blockcount,used:used,maxdisks:maxdisks,disklist:disklist};
}

// ============================================================================
// === DISK
// ============================================================================

const maxDiskSize=config.maxDiskSize||1440000; // max number of byte on disk
const maxBlockSize=config.maxBlockSize||512; // max number of byte in block

function Disk(id) {
	this.id = id.toLowerCase()||'';
	this.blocks = [];
	this.lastwrite = undefined;
	this.secret = undefined; // todo: implement secret
}

Disk.prototype.write = function(block) {
	if (block) {
		this.blocks.push(block.toString().substr(0,maxBlockSize));
		this.lastwrite=new Date().getTime();
		this.rotate();
	}
	//return {"id":this.id,"success":block||''};
	return this.read(1);
}
Disk.prototype.rotate = function() {
	// delete blocks from beginning of the blocks-array until blocks-array fits on disk
	while (this.used()>maxDiskSize) {this.blocks.shift()}
}

Disk.prototype.read = function(n) {
	return {"id":this.id,"blocks":this.blocks.slice(n*-1),"filter":n};
}

Disk.prototype.delete = function(block) {
	this.blocks=this.blocks.filter(b => b!==block);
	return this.read();
}

Disk.prototype.info = function() {
	let id='--hidden--';
	if (this.id.length<=6) {id=this.id}
	let blockcount=this.blocks.length;
	let byte=this.blocks.reduce((a,c)=>{return a+c.length},0);
	let used=this.used();
	let secret=(this.secret)?'***':undefined;
	let idle=(new Date().getTime()-this.lastwrite);
	let maxblocksize=maxBlockSize;
	let maxdisksize=maxDiskSize;
	let free=maxDiskSize-used;
	let df=((used/maxDiskSize)*100).toFixed(2)+'%';
	return {id:id,blockcount:blockcount,byte:byte,used:used,secret:secret,idle:idle,maxblocksize:maxblocksize,maxdisksize:maxdisksize,free:free,df:df};
}
Disk.prototype.used = function() {
	return JSON.stringify(this).length;
}

// ============================================================================
// === SAVE TO OR LOAD FROM DISK
// ============================================================================
DiskDrawer.prototype.save_to_file = function(callback) {
	let data=JSON.stringify(this);
	// encrypt
	if (process.env.SECRET||config.cryptosecret) {
		data=encrypt(data,process.env.SECRET||config.cryptosecret);
	}
	let filepath=config.datafilepath||'data';
	let filename=config.datafile||'data.json';
	fs.writeFile(filepath+'/'+filename, data, 'utf8', (err)=>{
		console.log('File '+filepath+'/'+filename+' saved.'+(err?' !!! '+err:''));
		// try saving backup
		filepath+='/backup';
		filename=hash(JSON.stringify(this));
		fs.writeFile(filepath+'/'+filename, data, 'utf8', (err)=>{
			if (err) {} else {
				console.log('File '+filepath+'/'+filename+' saved.'+(err?' !!! '+err:''));
			}
			callback(this);
		});
	});
}

DiskDrawer.prototype.load_from_file = function(callback) {
	this.index=[];
	let filepath=config.datafilepath||'data';
	let filename=config.datafile||'data.json';
	fs.readFile(filepath+'/'+filename, 'utf8', (err, data_encrypted)=>{
		if (err){console.log('No data-file.')} else {
			// decrypt
			if (process.env.SECRET||config.cryptosecret) {
				try {data_encrypted=decrypt(JSON.parse(data_encrypted),process.env.SECRET||config.cryptosecret)} catch (err) {console.log('decryption failed',err)}
			}
			try {data = JSON.parse(data_encrypted)} catch (err) {data={}};
			// parse / map
			if (data.hasOwnProperty('index')) {
				data.index.forEach((d)=>{
					var disk=this.newDisk(d.id||undefined);
					if (disk) {
						disk.blocks=d.blocks||[];
						disk.lastwrite=d.lastwrite||undefined;
						disk.secret=d.secret||undefined;
						disk.rotate();
					}
				});
			}
		}
		callback(this);
	});
}

function encrypt(text,cryptosecret) {
	let iv=crypto.randomBytes(16);
	let cipher = crypto.createCipheriv('aes-256-cbc', getCipherKey(cryptosecret), iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return JSON.stringify({ iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') });
}
function decrypt(text,cryptosecret) {
	let iv = Buffer.from(text.iv, 'hex');
	let encryptedText = Buffer.from(text.encryptedData, 'hex');
	let decipher = crypto.createDecipheriv('aes-256-cbc', getCipherKey(cryptosecret), iv);
	let decrypted = decipher.update(encryptedText);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
}
function getCipherKey(key) {if ((typeof key!= 'string')||(key.length<1)) {key="nosecret"}; while (key.length<32) {key+=key}; while (key.length>32) {key=key.slice(0,-1)}; return key;}
function hash(data) {return require('crypto').createHash('md5').update(data).digest("hex")}
