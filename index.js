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

app.use(bodyParser.json({ strict: true }));
app.use(function (error, req, res, next){next()}); // don't show error-message, if it's not JSON ... just ignore it
app.use(bodyParser.urlencoded({ extended: true }));
app.use('(/disk)?/disk.svg', function(req,res) {res.sendFile('3_5_floppy_diskette.svg',{root:path.join(__dirname,'public')})}); 
app.use('(/disk)?/:diskid?/:command?/:block?', function (req, res) {

	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	let diskid = req.params.diskid||req.body.diskid;
	let command = req.params.command||req.body.command;
	let block = req.params.block||req.body.block;
	let filter = req.body.filter;

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
					
					// ======== REST ========

					// when GETting /diskid, return all blocks 
					// when GETting /diskid/ID, return block with "id":ID 
					if (req.method=='GET') {
						let b=disk.read().blocks.map((x)=>{try {return JSON.parse(x)} catch (e) {return x}});
						if (command) {res.json(b.reverse().find((b)=>{try {return (b.id==command)} catch (e) {return false}}))}
						else {res.json(b)}
					}
					
					// when POSTing to /diskid, write request-body to disk 
					// when POSTing to /diskid/ID, write request-body to disk and add "id":ID
					else if ((req.method=='POST')||(req.method=='PUT')) {
						let b=undefined;
						try {b=JSON.stringify(req.body)} catch (e) {b={'content':req.body}}
						let bo=JSON.parse(b);
						// if ID is given in POST-URL (command) then add "id":ID to the JSON
						bo.id=command;
						// delete all current blocks with the ID that will be used now => overwrite
						disk.read().blocks.filter((x)=>{if (bo.id==undefined) {return false}; try {return (JSON.parse(x).id==bo.id)} catch (e) {return false}}).forEach((d)=>{disk.delete(d)});
						// write block to disk
						res.json(JSON.parse(disk.write(JSON.stringify(bo)).blocks[0]))
					}
					
					// when DELETing /diskid/ID, delete all blocks with "id":ID from disk 
					else if (req.method=='DELETE') {
						if (command) {
							// get all blocks > filter by ID (given in command) > delete all filtered blocks
							disk.read().blocks.filter((x)=>{try {return (JSON.parse(x).id==command)} catch (e) {return false}}).forEach((d)=>{disk.delete(d)});
							return res.json();
						} else {res.json({"error":"nothing to delete"})}
					}

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
					'RESTAPI':'GET /[diskid](/[id])<br>POST|PUT /[diskid](/[id]) JSON-object<br>DELETE /[diskid]/[id]',
					'API':'{diskid:[diskid],command:[read|write|delete|format|info|help|housekeeping],block:[text],filter:[filter]}',
					'HTTPAPI':'/[diskid](/[command])(/[block])',
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
