# DISK
This database stores 512-byte-text-blocks. It emulates 3,5"-disks with a maximum storage of 1.44MB. If more text-blocks are written to a disk, old text-blocks will be removed automatically (block-rotate).

## REST-API
```
GET /[diskid](/[id])
POST|PUT /[diskid](/[id]) JSON-object
DELETE /[diskid]/[id]
```
## API
`{diskid:[diskid],command:[read|write|delete|format|info|help|housekeeping],block:[text],filter:[filter]}`
## HTTP-API
`/[diskid](/[command])(/[block])`
## HTTP-COMMANDLINE
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