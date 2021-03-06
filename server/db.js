var Promise = require("bluebird");
var fs = require("fs");
var file = "netdata.db";
var exists = fs.existsSync(file);
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);

Promise.promisifyAll(db);

module.exports = {

    //could we do db.allAsync instead here?
    fetch_hosts: function(){
      db.serialize(function(){
	       var results = [];
	       return db.eachAsync("SELECT DISTINCT host FROM urls", function(err,row){
	         results.push(row.host);
	       }).then(function(){
	          return results;
	       });
      });
    },


    fetch_min_ts_for_hosts: function(hosts, smallest){
      var hstr = hosts.map(function(host){return "\'" + host + "\'";}).join();
      var sql = "SELECT min(u.ts) as ts FROM URLS u WHERE u.host IN (" + hstr + ") AND u.ts != '' AND u.ts >= " + smallest;

      return db.serializeAsync()

      .then(function(){
        return db.allAsync(sql);
      })

      .then(function(rows){
        console.log("min rows are");
        console.log(rows[0]);
        return rows[0];
      },function(err){
          console.log(err);
          return [];
      });
    },

    fetch_max_ts_for_hosts: function(hosts){

      var hstr = hosts.map(function(host){return "\'" + host + "\'";}).join();
      var sql = "SELECT max(u.ts) as ts FROM URLS u WHERE u.host IN (" + hstr + ") AND u.ts != ''";

      return db.serializeAsync()

        .then(function(){
          return db.allAsync(sql);
        })

        .then(function(rows){
          console.log("max rows are");
          console.log(rows[0]);
          return rows[0];
        },function(err){
            console.log(err);
            return [];
        });
    },

    fetch_categories_for_hosts: function(hosts){
      var hstr = hosts.map(function(host){return "\'" + host + "\'";}).join();
  		var sql = "SELECT GROUP_CONCAT(u.ts) as ts, GROUP_CONCAT(u.tld) as tld, c.classification FROM URLS u, CLASSIFICATION c WHERE host in ("+hstr+") AND u.tld = c.tld AND c.success = 1 GROUP BY c.classification";
      //var sql = "SELECT DISTINCT u.tld as tld, c.classification FROM URLS u, CLASSIFICATION c WHERE host in ("+hstr+") AND u.tld = c.tld AND c.success = 1 GROUP BY c.classification"
      return db.serializeAsync().then(function(){
          return db.allAsync(sql);
      }).then(function (rows){
          return rows.map(function(item){
            var classification = item.classification.split("/");
            classification.shift();
            return {
              ts: item.ts,
              tld: item.tld,
              classification: classification,
            };
          });
      });

  		//data = [{"ts":row[0], "tld":row[1], "classification":row[2].strip().split("/")[1:]}  for row in result]
  		//return data
    },

    fetch_matching_categories: function(partial){
        var sql = "SELECT DISTINCT(classification) FROM CLASSIFICATION WHERE classification LIKE '/%" + partial + "%'";
        console.log(sql);
        return db.serializeAsync().then(function(){
          return db.allAsync(sql);
        }).then(function (rows){
          return rows.map(function(item){
            return item.classification;
          });
        });
    },

    fetch_matching_categories_for_url: function(partial, hosts){
        var hstr = hosts.map(function(host){return "\'" + host + "\'";}).join();
        var sql = "SELECT DISTINCT(u.tld) as tld, c.classification FROM URLS u LEFT JOIN CLASSIFICATION c ON c.tld = u.tld  WHERE u.tld LIKE '%" + partial + "%' AND u.host IN (" + hstr + ") AND c.success = 1";
        console.log(sql);
        
        return db.serializeAsync().then(function(){
            return db.allAsync(sql);
        }).then(function (rows){
            console.log(rows);
            return rows;
        });
    },

    fetch_urls_for_hosts: function(hosts, from, to){

      var hstr = hosts.map(function(host){return "\'" + host + "\'";}).join();
      var sql = "SELECT tld as url, count(tld) as total from urls WHERE host in ("+hstr+")  AND (ts >= "+from+" AND ts <= "+to+") GROUP BY url ORDER BY total DESC ";
      console.log(sql);

      return db.serializeAsync().then(function(){
          return db.allAsync(sql);
      }).then(function (rows){
          return rows;
      });
    },

    fetch_ts_for_url: function(hosts, url){
      var hstr = hosts.map(function(host){return "\'" + host + "\'";}).join();
      var sql = "SELECT ts from urls WHERE host in ("+hstr+") AND tld='" + url + "' ORDER BY ts ASC ";
      console.log(sql);

      return db.serializeAsync().then(function(){
          return db.allAsync(sql);
      }).then(function (rows){
          return rows.map(function(item){
            return item.ts;
          });
      });
    },

    fetch_binned_browsing_for_hosts: function(hosts, bin, from, to){
       var hstr = hosts.map(function(host){return "\'" + host + "\'";}).join();
       var sql = "SELECT (ts/" + bin + ") * " + bin + " as bin, host,  COUNT(tld) as total from urls WHERE host in ("+hstr+")  AND (bin >= "+from+" AND bin <= "+to+") GROUP BY host, bin ORDER BY host, bin";
       console.log(sql);
       return db.serializeAsync().then(function(){
           return db.allAsync(sql);
       }).then(function (rows){
           return rows;
       });
    },

    fetch_browsing_for_hosts: function(hosts, from, to){

        var hstr = hosts.map(function(host){return "\'" + host + "\'";}).join();
        var sql = "SELECT DISTINCT u.ts, u.tld, u.host from URLS u WHERE u.host IN ("+hstr+") AND (u.ts >= "+from+" AND u.ts <= "+to+") ORDER BY u.host, u.ts ASC";

        return db.serializeAsync().then(function(){
            return db.allAsync(sql);
        }).then(function (rows){
            return rows;
        });
    },


};
