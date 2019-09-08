//var console = {}; console.log = function(){};

/* SUPERTEST HTTP/REST-API TESTS */
const request = require('supertest');
var app = require('../index');
app.close();

// POST/WRITE REQUESTS
describe ('POST', function() {

  describe('USING REST-API POST /mochatest', function() {
    it('should write data to a new disk', function(done) {
      request(app)
        .post('/mochatest')
        .send({"description":"repeat"})
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          console.log(res.text);
          let r=JSON.parse(res.text);
          if ( (r.description=='repeat') ) {
            done()
          } else {
            done(new Error('not written to disk as expected'))
          }
        });
    });
  });

  describe('USING API WRITE JSON', function() {
    it('should write data to disk including ID (from block-data)', function(done) {
      request(app)
        .post('/')
        .send({diskid:'mochatest',command:'write',block:'{"id":"2","description":"eat"}'})
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          console.log(res.text);
          let r=JSON.parse(res.text);
          if ( (r.id=='mochatest') && (JSON.parse(r.blocks[0]).description=='eat') ) {
            done()
          } else {
            done(new Error('not written to disk as expected'))
          }
        });
    });
  });

  describe('USING REST-API POST /mochatest/2', function() {
    it('should write data to disk including ID (from parameter) and overwrite existing block with same ID', function(done) {
      request(app)
        .post('/mochatest/2')
        .send({"description":"sleep"})
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          console.log(res.text);
          let r=JSON.parse(res.text);
          if ( (r.description=='sleep') && (r.id=='2') ) {
            done()
          } else {
            done(new Error('not written to disk as expected'))
          }
        });
    });
  });

})

// GET REQUESTS
describe ('GET', function() {

  describe('USING REST-API GET /mochatest', function() {
    it('should get an array of 2 data-blocks', function(done) {
      request(app)
        .get('/mochatest')
        .send()
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          console.log(res.text);
          let r=JSON.parse(res.text);
          if (r.length==2) {
            done()
          } else {
            done(new Error('could not read from disk as expected'))
          }
        });
    });
  });

  describe('USING REST-API GET /mochatest/2', function() {
    it('should get data with ID 2 from disk', function(done) {
      request(app)
        .get('/mochatest/2')
        .send()
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          console.log(res.text);
          let r=JSON.parse(res.text);
          if ( (r.id=='2') && (r.description=='sleep') ) {
            done()
          } else {
            done(new Error('could not read from disk as expected'))
          }
        });
    });
  });

})

// DELETE REQUESTS
describe ('DELETE', function() {

  describe('USING REST-API DELETE /mochatest/2', function() {
    it('should delete data with ID 2 from disk', function(done) {
      request(app)
        .delete('/mochatest/2')
        .send()
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          console.log(res.text);
          let r=JSON.parse(res.text);
          if ( (r.blocks.length==1) ) {
            done()
          } else {
            done(new Error('could not delete from disk as expected'))
          }
        });
    });
  });

  describe('USING API DELETE JSON', function() {
    it('should delete data from disk (defined by block-data)', function(done) {
      request(app)
        .post('/')
        .send({diskid:'mochatest',command:'delete',block:'{"description":"repeat"}'})
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          console.log(res.text);
          let r=JSON.parse(res.text);
          if ( (r.blocks.length==0) ) {
            done()
          } else {
            done(new Error('could not delete from disk as expected'))
          }
        });
    });
  });

})

// HOUSEKEEPING
describe ('DO HOUSEKEEPING', function() {

  describe('BY CALLING / with housekeeping-command in JSON', function() {
    it('should delete disks with no data', function(done) {
      request(app)
        .get('/')
        .send({command:'housekeeping'})
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          console.log(res.text);
          let r=JSON.parse(res.text);
          if ( r.info=='all unused/empty disks removed from disk-drawer' ) {
            done()
          } else {
            done(new Error('could not do housekeeping as expected'))
          }
        });
    });
  });

  describe('AND CALL GET /mochatest AFTERWARDS', function() {
    it('should get 404 not found', function(done) {
      request(app)
        .get('/mochatest')
        .send()
        .set('Accept', 'application/json')
        .expect(404)
        .end(function(err, res) {
          if (err) throw err;
          console.log(res.text);
          let r=JSON.parse(res.text);
          if (r.error=='disk not found') {
            done()
          } else {
            done(new Error('could not do housekeeping as expected'))
          }
        });
    });
  });

})
