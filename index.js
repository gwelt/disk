var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var path = require('path');
var config = {}; try {config=require('./config.json')} catch(err){};
var port = process.env.PORT || config.port || 3000;

var DiskDrawer = require('./disk.js');
var dd=new DiskDrawer();
server.listen(port, function () { dd.load_from_file(()=>{console.log('SERVER LISTENING ON PORT '+port+'\n'+JSON.stringify(dd.info()))}) });
process.on('SIGINT', function(){ if (config.SIGINT==undefined) {config.SIGINT=true; console.log('SIGINT'); dd.save_to_file(()=>{process.exit(0)})} });
process.on('SIGTERM', function(){ if (config.SIGTERM==undefined) {config.SIGTERM=true; console.log('SIGTERM'); dd.save_to_file(()=>{process.exit(0)})} });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('(/disk)?/disk.svg', function(req,res) {res.sendFile('3_5_floppy_diskette.svg',{root:path.join(__dirname,'public')})}); 
app.use('(/disk)?/:diskid?/:command?/:block?/:secret?', function (req, res) {
	
	//dd.newDisk('log').write(JSON.stringify(Object.assign({'dt':new Date().toUTCString()},req.params,req.body)));

	let diskid = req.params.diskid||req.body.diskid;
	let command = req.params.command||req.body.command;
	let block = req.params.block||req.body.block;
	let filter = req.body.filter; //||req.params.block||req.body.block;

	if (diskid) {

		let disk = dd.findDisk(diskid);
		if ((!disk)&&(command=='write')) {disk=dd.newDisk(diskid)}
		if (disk) {

			switch (command) {

				case 'write':
					res.json(disk.write(block));
					break;

				case 'read':
					res.json(disk.read(filter));
					break;

				case 'delete':
					res.json(disk.delete(block));
					break;

				case 'info':
					res.json(disk.info());
					break;

				case 'format':
					res.json(dd.formatDisk(disk.id));
					break;

				default:
					// when POSTing to /diskid, write payload/body to disk 
					if (req.method=='POST') {res.json(JSON.parse(disk.write(JSON.stringify(req.body)).blocks[0]))}
					// when GETting /diskid, return last block 
					else if (req.method=='GET') {res.json(JSON.parse(disk.read(1).blocks[0]))}
					else {res.json(disk.read())}
					break;

			}
		
		} else {res.status(404).json({"error":"disk not found"})}

	} else if (command) {

		switch (command) {

			case 'info':
				res.json(dd.info());
				break;

			case 'housekeeping':
				res.json(dd.housekeeping());
				break;

			case 'help':
				res.json({
					'README':'<h1>DISK</h1>This database stores '+(config.maxBlockSize||512)+'-byte-text-blocks. It emulates 3,5"-disks with a maximum storage of 1.44MB. If more text-blocks are written to a disk, old text-blocks will be removed automatically (block-rotate).',
					'RESTAPI':'{diskid:[diskid],command:[read|write|delete|format|info|help|housekeeping],block:[text],filter:[filter],secret:[secret]}',
					'HTTPAPI':'/[diskid](/[command])(/[block])(/[secret])',
					'CLI':'/insert [diskid]<br>/eject<br>/read ([diskid]) ([number of blocks from tail])<br>/write [text]<br>/delete [text]<br>/format [diskid]<br>/help<br>/info<br>/housekeeping<br>any line not starting with / will be written to current disk'
				});
				break;

			default:
				res.status(404).json({"error":"no disk - nothing to do"})
				break;

		}

	} else {
		res.sendFile('index.html',{root:path.join(__dirname,'public')});
	}
		
});
