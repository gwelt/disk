var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var path = require('path');
var config = {}; try {config=require('./config.json')} catch(err){};
var port = process.env.PORT || config.port || 3000;

var DiskDrawer = require('./1440kb.js');
var dd=new DiskDrawer();
server.listen(port, function () { dd.load_from_file(()=>{console.log('SERVER LISTENING ON PORT '+port+'\n'+JSON.stringify(dd.info()))}) });
process.on('SIGINT', function(){ if (config.SIGINT==undefined) {config.SIGINT=true; console.log('SIGINT'); dd.save_to_file(()=>{process.exit(0)},true)} });
process.on('SIGTERM', function(){ if (config.SIGTERM==undefined) {config.SIGTERM=true; console.log('SIGTERM'); dd.save_to_file(()=>{process.exit(0)},true)} });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/disk.svg', function(req,res) {
	res.sendFile('3_5_floppy_diskette.svg',{root:path.join(__dirname,'public')});
});	
app.use('/:diskid?/:command?/:block?/:secret?', function (req, res) {
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
			  	res.json(disk.read());
				  break;

		  }
		
		} else {res.status(404).json({"error":"disk not found"})}

	} else {

		switch (command) {

		  case 'ddinfo':
		  	res.json(dd.info());
			  break;

		  case 'ddhousekeeping':
		  	res.json(dd.housekeeping());
			  break;

		  case 'help':
		  	res.json({
		  		'README':'<h1>1440kb</h1>This database stores '+(config.maxBlockSize||512)+'-byte-text-blocks. It emulates 3,5"-disks with a maximum storage of 1.44MB. If more text-blocks are written to a disk, old text-blocks will be removed automatically (block-rotate).',
		  		'RESTAPI':'{diskid:[diskid],command:[read|write|delete|format|info|help|ddinfo|ddhousekeeping],block:[text],filter:[filter],secret:[secret]}',
		  		'HTTPAPI':'/[diskid](/[command])(/[block])(/[secret])',
		  		'CLI':'/insert [diskid]<br>/eject<br>/read ([diskid]) ([number of blocks from tail])<br>/write [diskid] [text]<br>/delete [text]<br>/format [diskid]<br>/help<br>/ddinfo<br>/ddhousekeeping<br>any line not starting with / will be written to current disk'
		  	});
			  break;

			default:
				res.sendFile('index.html',{root:path.join(__dirname,'public')});
			  break;
		
		}

	}
	  
});
