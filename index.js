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
app.use(function (error, req, res, next){next()}); // don't show error-message, if it's not JSON ... just ignore it
app.use(bodyParser.text({}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('(/disk)?/disk.svg', function(req,res) {res.sendFile('3_5_floppy_diskette.svg',{root:path.join(__dirname,'public')})}); 
app.use('(/disk)?/:diskid?/:command_or_id?/:block?', function (req, res) {

	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	let diskid = req.params.diskid||req.body.diskid;
	let command = req.params.command_or_id||req.body.command;
	let block = req.params.block||req.body.block;
	let filter = req.body.filter;
	// in case of text/plain for REST or other JSON
	if ((typeof req.body!=='object')||(block==undefined)) {block=req.body}
	if (typeof block==='object') {block=JSON.stringify(block)}

	/*
	function text (i) {if (typeof i==='object') {return JSON.stringify(i)} else {return i}}
	console.log('*** PARAMS: '+text(req.params));
	console.log('*** BODY: '+text(req.body));
	console.log('*** DISKID:'+diskid+' COMMAND:'+command+' BLOCK:'+block);
	*/

	if (diskid) {

		let disk = dd.findDisk(diskid);
		// create new disk if disk is not existing and this is a POST/PUT/WRITE-request
		if ((!disk)&& ( (command=='write')|| ((req.params.diskid==diskid)&&((req.method=='POST')||(req.method=='PUT'))) ) ) {disk=dd.newDisk(diskid)}
		if (disk) {

			if (command=='info') {res.json(disk.info())}
			else if (command=='readDisk') {res.json(disk.readDisk(filter))}
			else if (command=='format') {res.json(dd.formatDisk(disk.id))}
			
			// when GETting /diskid, return all blocks 
			// when GETting /diskid/ID, return latest block with "id":ID 
			else if ((req.method=='GET')||(command=='read')) {
				if ((command!==undefined)&&(command!=='read')) { // (!) command = id (see app.use above)
					//console.log('GET ID: '+command);
					let b=disk.read(filter).map((x)=>{try {return JSON.parse(x)} catch (e) {return x}});
					let r=b.reverse().find((b)=>{try {return (b.id==command)} catch (e) {return false}});
					if (!r) {res.status(204)}
					res.send(r);
				}
				else {
					let r=disk.read(filter).map((x)=>{try {return (JSON.parse(x))} catch (e) {return x}});
					res.send(r);
				}
			}
			
			// when POSTing to /diskid, write request-body to disk 
			// when POSTing to /diskid/ID, write request-body to disk and add "id":ID
			else if ( ((req.method=='POST')||(req.method=='PUT')||(command=='write')) && (!['info','readDisk','format','read','delete'].includes(command)) ) {
				
				// create object from block
				let b=undefined;
				try {b=JSON.parse(block)} catch (e) {}

				// check if id is given in block-object
				if (b&&b.id!==undefined) {
					// nothing to do
					//console.log('POST ID: '+b.id);
				}

				// check if id is given in req.param (command)
				if ((command!==undefined)&&(command!=='write')) { // (!) command = id (see app.use above)
					//console.log('POST ID: '+command);
					// if not an object > turn it into one
					if (typeof b!=='object') {b={'id':undefined,'content':block}}
					// add id
					if (b.id==undefined) {b.id=command};
					// convert to block again
					block=JSON.stringify(b);
					//console.log('BLOCK: '+block);
				}

				// delete blocks with same id (remove duplicates)
				if (b&&b.id) {disk.read(filter).filter((x)=>{try {return (JSON.parse(x).id==b.id)} catch (e) {return false}}).forEach((d)=>{disk.delete(d)})};

				disk.write(block);
				res.send(block);
			}
			
			// when DELETing /diskid, delete all blocks that equal the posted block
			// when DELETing /diskid/ID, delete all blocks with this id from disk 
			else if ((req.method=='DELETE')||(command=='delete')) {
				// if ID is given in POST-URL (param: command - see syntax above) it should be deleted
				if ((command!==undefined)&&(command!=='delete')) { // (!) command = id (see app.use above)
					//console.log('DELETE ID: '+command);
					// delete blocks with this id
					disk.read().filter((x)=>{try {return (JSON.parse(x).id==command)} catch (e) {return false}}).forEach((d)=>{disk.delete(d)});
					res.status(204).end();
				} else {
					// delete all blocks that equal the posted block
					disk.delete(block);
					res.status(204).end();
				}
			}

			else {res.json(disk.read(filter))}
		
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
