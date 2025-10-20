var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var path = require('path');
var config = {}; try {config=require('./config.json')} catch(err){};
var port = process.env.PORT || config.port || 3000;
module.exports = server;

var DiskDrawer = require('./disk.js');
var dd=new DiskDrawer();
server.listen(port, function () { dd.load_from_file(()=>{console.log('\x1b[44m SERVER LISTENING ON PORT '+port+' \x1b[0m\n'+JSON.stringify(dd.info()))}) });
process.on('SIGINT', function(){ if (config.SIGINT==undefined) {config.SIGINT=true; console.log('SIGINT'); dd.save_to_file(()=>{process.exit(0)})} });
process.on('SIGTERM', function(){ if (config.SIGTERM==undefined) {config.SIGTERM=true; console.log('SIGTERM'); dd.save_to_file(()=>{process.exit(0)})} });
setInterval(()=>{dd.housekeeping(()=>{})},12*3600000);

app.use(bodyParser.json({})); // strict: true 
//app.use(function (error, req, res, next){next()}); // don't show error-message, if it's not JSON ... just ignore it
app.use(bodyParser.text({}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('(/disk)?/disk.svg', function(req,res) {res.sendFile('3_5_floppy_diskette.svg',{root:path.join(__dirname,'public')})}); 
app.use('(/disk)?/:diskid?/:command?/:block?', function (req, res) {

	//res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	let diskid = req.params.diskid||req.body.diskid;
	let command = req.params.command||req.body.command;
	let block = req.params.block||req.body.block;
	if (typeof req.body!=='object') {block=req.body} // in case of text/plain for REST
	let filter = req.body.filter;

	if (diskid) {

		let disk = dd.findDisk(diskid);
		// create new disk if disk is not existing and this is a POST/PUT/WRITE-request
		if ((!disk)&& ( (command=='write')|| ((req.params.diskid==diskid)&&((req.method=='POST')||(req.method=='PUT'))) ) ) {disk=dd.newDisk(diskid)}
		if (disk) {

			switch (command) {

				case 'write': // ~POST
					res.json(disk.write(block));
					break;

				case 'read': // ~GET
					res.json(disk.read(filter));
					break;

				case 'delete': // ~DELETE
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
					// when GETting /diskid/ID, return latest block with "id":ID 
					if (req.method=='GET') {
						let b=disk.blocks.map((x)=>{try {return JSON.parse(x)} catch (e) {return x}});
						if (command) {res.json(b.reverse().find((b)=>{try {return (b.id==command)} catch (e) {return false}}))}
						else {res.json(b)}
					}
					
					// when POSTing to /diskid, write request-body to disk 
					// when POSTing to /diskid/ID, write request-body to disk and add "id":ID
					else if ((req.method=='POST')||(req.method=='PUT')) {
						// check if block is JSON // if not: convert to JSON to to checks and maybe use it
						let b=undefined;
						try {b=JSON.parse(block)} catch (e) {b={'id':undefined,'content':block}}
						// if id is given in POST-URL (param: command - see syntax above) it should be added to the content (block)
						if (command) { // = ID in URL
							// if no id is present in object, add it...
							if (b.id==undefined) {b.id=command};
							// ...and use this to write to disk
							block=JSON.stringify(b);
						}
						// delete blocks with same id (duplicates)
						if (b.id) {disk.blocks.filter((x)=>{try {return (JSON.parse(x).id==b.id)} catch (e) {return false}}).forEach((d)=>{disk.delete(d)})};
						// write block to disk
						res.json(disk.write(block));
					}
					
					// when DELETing /diskid, delete all blocks that equal the posted block
					// when DELETing /diskid/ID, delete all blocks with this id from disk 
					else if (req.method=='DELETE') {
						// if ID is given in POST-URL (param: command - see syntax above) it should be deleted
						if (command) { // = ID in URL
							// delete blocks with this id
							disk.blocks.filter((x)=>{try {return (JSON.parse(x).id==command)} catch (e) {return false}}).forEach((d)=>{disk.delete(d)});
							res.status(204).json();
						} else {
							// delete all blocks that equal the posted block
							disk.delete(block);
							res.status(204).json();
						}
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
					'README':'<h1>DISK</h1>This database stores '+(config.maxBlockSize||512)+'-byte-text-blocks. It emulates '+(config.maxDisksInDrawer||512)+' 3,5"-disks with maximum storage of '+((config.maxDiskSize||1474560)/1024000).toFixed(2)+'MB each. If more text-blocks are written to a disk, oldest text-blocks are removed (block-rotate).',
					'RESTAPI':'GET /[diskid](/[id])<br>POST|PUT /[diskid](/[id]) [text]|{block:[text]}<br>DELETE /[diskid]/[id]',
					'API':'POST {diskid:[diskid],command:[read|write|delete|format|info|help|housekeeping],block:[text],filter:[filter]}',
					'HTTPAPI':'GET /[diskid](/[command])(/[block])',
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
