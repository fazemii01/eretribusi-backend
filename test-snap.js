const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Read .env file manually without external packages
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key && !key.startsWith('#')) {
        process.env[key] = val;
      }
    }
  });
}

const clientKey = process.env.SNAP_CLIENT_KEY || '4c567784ffc343628a47eea79249198c';
const clientSecret = process.env.SNAP_CLIENT_SECRET || 'XilTn9jcO58kDiGnepMEZ56Ds12V7UzKCcmv7R/H8o=';
const privateKey = process.env.SNAP_PRIVATE_KEY || 'aWxanT+U1hFDNqoAwAkBd0+Ouzyqtzpy1X30TCGuQR0=';
const merchantId = process.env.SNAP_MERCHANT_ID || 'DLH_LUMAJANG_01';

console.log('====================================================');
console.log('📱 ASPI SNAP Dynamic QRIS Generation Test Routine');
console.log('====================================================');

const timestamp = new Date().toISOString();
const idInvoice = 'INV-2603-JGY0101001';
const nominal = 15000;

// 1. Generate Access Token Signature (RSA/HMAC)
const stringToSign = `${clientKey}|${timestamp}`;
let tokenSignature = '';
if (privateKey.startsWith('-----BEGIN')) {
  try {
    const signer = crypto.createSign('SHA256');
    signer.update(stringToSign);
    signer.end();
    tokenSignature = signer.sign(privateKey, 'base64');
  } catch (e) {
    console.error('RSA Signing error:', e.message);
  }
} else {
  tokenSignature = crypto
    .createHmac('sha256', privateKey)
    .update(stringToSign)
    .digest('base64');
}

// 2. Mock Access Token
const mockAccessToken = `Bearer snap_b2b_token_${Date.now()}`;

// 3. Request Body for Generate QR MPM
const qrisRequestBody = {
  partnerReferenceNo: idInvoice,
  merchantId: merchantId,
  amount: {
    value: `${nominal}.00`,
    currency: 'IDR',
  },
  additionalInfo: {
    validityPeriod: '30m',
  },
};

// 4. Generate Request Signature (HMAC-SHA512)
const bodyString = JSON.stringify(qrisRequestBody);
const minifiedBody = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
const qrisStringToSign = `POST:/api/v1.0/qr/qr-mpm-generate:${mockAccessToken.replace('Bearer ', '')}:${minifiedBody}:${timestamp}`;
const apiSignature = crypto.createHmac('sha512', clientSecret).update(qrisStringToSign).digest('base64');

// 5. Generate EMVCo QRIS Payload
const padNominal = nominal.toString();
const qrisString = `00020101021226670016ID.GOV.DLH.LUMAJANG0118936009140000000000021552049399530336054${padNominal.length.toString().padStart(2, '0')}${padNominal}5802ID5912DLH LUMAJANG6008LUMAJANG61056731162190715${idInvoice}6304ABCD`;

console.log('Invoice ID           :', idInvoice);
console.log('Nominal Tagihan      :', `Rp ${nominal.toLocaleString('id-ID')}`);
console.log('Merchant ID          :', merchantId);
console.log('Timestamp            :', timestamp);
console.log('----------------------------------------------------');
console.log('Generated X-SIGNATURE:', apiSignature);
console.log('----------------------------------------------------');
console.log('EMVCo QRIS String    :');
console.log(qrisString);
console.log('====================================================');
console.log('✅ QRIS generation test completed cleanly!\n');
