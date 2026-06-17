import dns.resolver
import sys

def resolve_srv(hostname):
    try:
        res = dns.resolver.resolve(f"_mongodb._tcp.{hostname}", "SRV")
        hosts = []
        for rdata in res:
            hosts.append(f"{rdata.target.to_text().rstrip('.')}:{rdata.port}")
        print(",".join(hosts))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    resolve_srv("studentalumniadmin.hhu4uao.mongodb.net")
