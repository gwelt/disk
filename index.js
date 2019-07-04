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
app.use('/:diskid?/:command?/:block?/:secret?', function (req, res) {
	let diskid = req.params.diskid||req.body.diskid;
	let command = req.params.command||req.body.command;
	let block = req.params.block||req.body.block;

	if (diskid) {

		let disk = dd.findDisk(diskid);
		if ((!disk)&&(command=='write')) {disk=dd.newDisk(diskid)}
		if (disk) {

		  switch (command) {

			  case 'write':
			  	res.json(disk.write(block));
				  break;

			  case 'read':
			  	res.json(disk.read());
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

		  case 'ddindex':
				res.send(dd.index.map((i)=>{return "<a href=\"javascript:command('/insert "+i.id+"')\">"+i.id+"</a>.info = "+JSON.stringify(i.info())+"<br>"}).sort().reduce((a,c)=>{return a+=c}));
			  break;

		  case 'help':
		  	res.send("<h1>1440kb</h1>HTTP-API: /[diskid]/['read'|'write'|'delete'|'format'|'info'](/[data])(/[secret])<br>REST-API: {'diskid':[diskid],'command':[read|write|delete|format|info|ddinfo|ddindex|ddhousekeeping],'block':[data],'secret':[secret]}<p>COMMANDLINE:<br>/insert [diskid]<br>/eject<br><br>/read ([diskid])<br>/write [diskid] [text]<br>/delete [text]<br>/format [diskid]<br><br>/help<br>/ddinfo<br>/ddindex<br>/ddhousekeeping<p>any line not starting with '/' will be written to current disk");
			  break;

			default:
				res.sendFile('index.html',{root:path.join(__dirname,'public')});
			  break;
		
		}

	}
	  
});
