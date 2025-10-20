var DiskDrawer = require('./disk.js');
var dd=new DiskDrawer();
dd.load_from_file(()=>{
	console.log('\n=============================================\nTHIS IS INFORMATION ON DATA-FILE data.json!\nUSE /housekeeping TO SAVE MEMORY TO FILE.\n=============================================\n'+(dd.index.map((i)=>{
		return i.id.padEnd(16,' ')+' df: '+(((i.used()/1474560)*100).toFixed(0)+'%').padEnd(6,' ')+' last write: '+Number.parseInt((new Date().getTime()-i.lastwrite)/1000/60/60)+'h';
	}).sort()).join('\n'));
	console.log('=============================================\n');
});
