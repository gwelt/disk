# DISK
This database stores 512-byte-text-blocks. It emulates 3,5"-disks with a maximum storage of 1.44MB. If more text-blocks are written to a disk, old text-blocks will be removed automatically (block-rotate).

## REST-API
You can use GET, POST (or PUT) and DELETE with a JSON-object in the request-body:
```
GET /[diskid](/[id])
POST|PUT /[diskid](/[id]) JSON-object
DELETE /[diskid]/[id]
```
When POSTing, [id] will be added to the JSON-object with key "id".  
The block will contain the JSON (text), limited to the defined block-size(!).
## API
You can POST a JSON-object, that contains your request: 
```
{
  diskid:[diskid],
  command:[read|write|delete|format|info|help|housekeeping],
  block:[text],
  filter:[filter]
}
```
## HTTP-API
You can use GET (just call the URL): 
```
/[diskid](/[command])(/[block])
```
## HTTP-COMMANDLINE
The server provides an HTML-interface with a command-line-emulator:
```
/insert [diskid]  
/eject  
/read ([diskid]) ([number of blocks from tail])  
/write [text]  
/delete [text]  
/format [diskid]  
/info  
/help  
/housekeeping  
any line not starting with / will be written to current disk  
```
