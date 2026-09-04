import re

with open("frontend/src/views/web/portals/vendor/views/VendorScannerView.tsx", "r") as f:
    content = f.read()

replacement = """      const onDetect = (decodedText: string) => {
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
            setScanning(false);
            setScannedId(decodedText.trim());
          }).catch(() => {
            setScanning(false);
            setScannedId(decodedText.trim());
          });
        } else {
          setScanning(false);
          setScannedId(decodedText.trim());
        }
      };"""

content = re.sub(
    r'const onDetect = \(decodedText: string\) => \{[^}]+\setScannedId\(decodedText\.trim\(\)\);\n\s+\};',
    replacement,
    content,
    flags=re.MULTILINE
)

with open("frontend/src/views/web/portals/vendor/views/VendorScannerView.tsx", "w") as f:
    f.write(content)
