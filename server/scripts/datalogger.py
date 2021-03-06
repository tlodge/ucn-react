from tld import get_tld
import logging
from os import listdir
from os.path import isfile, isdir, join
import psycopg2
logger = logging.getLogger( "collect_logger" )


def reconnect(fn):
	""" decorator to reconnect to the database if needed """
	def wrapped(self, *args, **kwargs):
		if self.connected is not True:
			self.connect()
		return fn(self, *args, **kwargs)
	return wrapped


class DataLogger( object ):
	
	''' classdocs '''

	def __init__(self):
		self.connected = False
		self.dbname = 'hostview'
		self.dbuser = 'hostview'
		self.dbhost = 'localhost'
		self.dbpass = 'hostview'
	
	#///////////////////////////////////////
	def connect( self ):
		#print "connecting to postgres database %s " % self.dbname
		
		if self.connected is False:
		
			try:
				constr = "dbname=%s user=%s host=%s password=%s" % (self.dbname,self.dbuser,self.dbhost,self.dbpass)
				#print constr
				self.conn = psycopg2.connect("dbname=hostview user=hostview host=localhost password=hostview")
				self.cur = self.conn.cursor()
				self.connected = True
				#print "successfully connected!"
				
			except Exception, e:
				logger.error(e)
				logger.error("unable to connect to the database!")
	
	
	@reconnect
	def remove_zones(self, deviceid, date):
		try:
			sql = "DELETE FROM zones WHERE deviceid = %s AND date = %s"
			data = (deviceid,date)
			self.cur.execute(sql,data)
			self.conn.commit()
		except Exception, e:
			logger.error("error removing zones %s %s" % (deviceid, date))

	@reconnect
	def insert_zones(self, zones):
		try:
			for zone in zones:
				sql = "INSERT INTO zones(deviceid, date, locationid, name, lat, lng, enter, exit) VALUES(%s,%s,%s,%s,%s,%s,%s,%s)"
				data = (zone['deviceid'],zone['date'],zone['locationid'], zone['name'], zone['lat'], zone['lng'], zone['enter'], zone['exit'])
				self.cur.execute(sql,data)
			self.conn.commit()
		except Exception, e:
			logger.error("error inserting zones %s" % str(zones))
	
	@reconnect
	def deviceid_for_host(self, host):
		try:
			sql = "SELECT deviceid from vpnips WHERE ip=%s"
			data = (host,)
			self.cur.execute(sql,data)
			deviceid =  self.cur.fetchone()
			if deviceid is not None:
				return deviceid[0]
			return None
			
		except Exception, e:
			return None
	
	@reconnect
	def bulk_insert_dns(self, deviceid, content):
		
		for line in content:
			sql = "INSERT INTO dns (id, host, timestamp) VALUES (%s,%s,%s)"
			data = (deviceid, line['domain'], line['ts'])			
			
			try:
				self.cur.execute(sql,data)
			except Exception, e:
				logger.error(e)
				logger.error("error inserting url %s" % str(url))

		#commit now..
		try:
			self.conn.commit()				
		except Exception, e:
			logger.error(e)
			logger.error("error bulk committing dns")				
			
	@reconnect
	def bulk_insert_urls(self, content):
		
		for line in content:

			items = line.split()
			
			
			if len(items) < 9:
				logger.error("error parsing line")
				logger.error(line)
			else:
				if ("http" in items[8]  and "//" in items[8]):
					parts  = items[8].split("//")[1].split("/")

					domain = parts[0]	
					res = get_tld(items[8], as_object=True, fail_silently=True)

					if res is not None:
						tld = "%s.%s" % (res.domain, res.suffix)
					else:
						tld = parts[0]
						
					
					path = ""
					if len(parts) > 0:
						path = "".join(parts[1:])
					
					#sometimes dest can just be a '-', need to set it to a valid host so postgres does not barf
					if items[11].split("/")[1].strip() == "-":
						dest = "0.0.0.0"
					else:
						dest = items[11].split("/")[1]
					
					#url = {'ts':items[2].split(".")[0], 'host':items[4], 'tld':tld, 'domain':domain, 'path': path}
					url = {'ts':items[2].replace(".",""), 
							'host':items[4], 
							'tld':tld, 
							'domain':domain, 
							'path': path, 
							'verb':items[7],
							'clength':items[6],
							'statuscode':items[5].split("/")[1],
							'dest':dest,
							'contenttype':items[12],
						}
					
					try:
						#print "inserting %s %s %s %s %s %s" % (url['ts'], url['host'],url['tld'], url['domain'], url['path'], 'squid')
						sql = "SELECT deviceid from vpnips WHERE ip=%s"
						data = (url['host'],)
						self.cur.execute(sql,data)
						deviceid =  self.cur.fetchone()
						
						
						sql = "INSERT INTO http3 (id, httpverb, httpverbparam, httpstatuscode, httphost, contenttype, contentlength, src, dest, timestamp) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
						data = (deviceid,url['verb'],url['path'], url['statuscode'],url['tld'], url['contenttype'], url['clength'], url['host'], url['dest'], url['ts'])			
						self.cur.execute(sql,data)
					except Exception, e:
						logger.error(e)
						logger.error("error inserting url %s" % str(url))

		#commit now..
		try:
			self.conn.commit()				
		except Exception, e:
			logger.error("error bulk committing urls")				

	@reconnect
	def bulk_insert_images(self, content):
		
		for line in content:
			items = line.split()
			
			
			if len(items) < 9:
				logger.error("error parsing line")
				logger.error(line)
			else:
				if ("http" in items[8]  and "//" in items[8]):
					parts  = items[8].split("//")[1].split("/")

					domain = parts[0]	
					res = get_tld(items[8], as_object=True, fail_silently=True)

					if res is not None:
						tld = "%s.%s" % (res.domain, res.suffix)
					else:
						tld = parts[0]
						
					
					path = ""
					if len(parts) > 0:
						path = "/".join(parts[1:])
					
					#sometimes dest can just be a '-', need to set it to a valid host so postgres does not barf
					if items[11].split("/")[1].strip() == "-":
						dest = "0.0.0.0"
					else:
						dest = items[11].split("/")[1]
					
					for img in ["svg", "jpg", "jpeg", "png", "gif"]:
						if img in parts[-1]:
							try:
						
								sql = "SELECT deviceid from vpnips WHERE ip=%s"
								data = (items[4],)
								self.cur.execute(sql,data)
								deviceid =  self.cur.fetchone()
								if deviceid is not None:
									print "%s %s %s %s" % (deviceid[0], items[2].replace(".",""), domain, items[8])
									sql = "INSERT INTO images (id, ts, domain, path) VALUES (%s, %s, %s, %s)"
									data = (deviceid[0],items[2].replace(".",""),domain,items[8])			
									self.cur.execute(sql,data)
							except Exception, e:
								print "hmm error"
								print e
						
					try:
						self.conn.commit()				
					except Exception, e:
						logger.error("error bulk committing images")	