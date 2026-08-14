const crypto = require('crypto');

module.exports = function(options = {}) {
    // Buffer işlemleri string işlemlerinden hızlıdır, secret'ı hazırda tutuyoruz.
    const secretKey = options.secret ? Buffer.from(options.secret) : crypto.randomBytes(32);
    const timeout = options.timeout || 1000 * 60 * 10;
    const ALGORITHM = 'sha1'; // Hız için SHA1 (CSRF için yeterince güvenli). Daha yüksek güvenlik için 'sha256' yapın.

    // Response tipi ve özel hata mesajları ayarı (type belirtilmemişse veya null ise varsayılan 'json')
    const responseType = options.type || 'json';
    const messages = options.messages || {};

    // IP'yi en hızlı şekilde alma fonksiyonu
    // Proxy güvenliği için 'trust proxy' ayarının express'te yapılı olduğunu varsayıyoruz.
    function getIP(req) {
        return req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress ||  '';
    }

    // Type'a (redirect / json) göre hata yanıtını dinamik dönen yardımcı fonksiyon
    function sendError(res, errorCode, fallbackMessage) {
        const messageOrUrl = messages[errorCode] || fallbackMessage;
        
        if (responseType === 'redirect') {
            return res.redirect(messageOrUrl);
        }
        
        return res.status(403).json({ status: false, message: messageOrUrl });
    }

    return {
        middleware: function(req, res, next) {
            // MEMOIZATION: Token sadece ilk çağrıldığında hesaplanır, sonra cache'den gelir.
            let _cachedToken = null;

            req.csrfToken = function() {
                if (_cachedToken) return _cachedToken;

                const timestamp = Date.now();
                // User-Agent ve IP'yi al
                const ua = req.headers['user-agent'] || '';
                const ip = getIP(req);

                // Tek seferlik string birleştirme (V8 motoru bunu çok iyi optimize eder)
                // Format: timestamp|ip|ua
                const payload = timestamp + '|' + ip + '|' + ua;

                // C++ Binding'e tek çağrı (Overhead'i azaltır)
                const signature = crypto.createHmac(ALGORITHM, secretKey)
                                        .update(payload)
                                        .digest('base64');

                // Token: timestamp:signature
                _cachedToken = timestamp + ':' + signature;
                return _cachedToken;
            };
            next();
        },
        
        verifyToken: function() {
            return function(req, res, next) {
                // Token'ı en olası lokasyonlardan sırayla dene
                const token = req.body?._csrf || req.headers['x-csrf-token'] || req.query?._csrf;
                
                if (!token) {
                    return sendError(res, 'MISSING_TOKEN', 'MISSING_TOKEN');
                }

                // OPTIMIZASYON: Split yerine hızlı indeks bulma
                const separatorIndex = token.indexOf(':');
                if (separatorIndex === -1) {
                    return sendError(res, 'INVALID_FORMAT', 'INVALID_FORMAT');
                }

                // Timestamp'i parse et
                const timestampStr = token.substring(0, separatorIndex);
                const receivedSignature = token.substring(separatorIndex + 1);
                const timestamp = parseInt(timestampStr, 10);

                // 1. ADIM: Kriptografik işlemden ÖNCE zaman kontrolü 
                if (!timestamp || (Date.now() - timestamp > timeout)) {
                    return sendError(res, 'INVALID_TOKEN', messages.TOKEN_EXPIRED || 'TOKEN_EXPIRED');
                }

                // 2. ADIM: İmzayı yeniden oluştur
                const ua = req.headers['user-agent'] || '';
                const ip = getIP(req);
                
                const expectedSignature = crypto.createHmac(ALGORITHM, secretKey)
                                                .update(timestampStr + '|' + ip + '|' + ua)
                                                .digest('base64');

                // 3. ADIM: Timing-Safe karşılaştırma (Buffer seviyesinde)
                const signatureBuf = Buffer.from(receivedSignature);
                const expectedBuf = Buffer.from(expectedSignature);

                if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
                    // console.log('CSRF token mismatch:', {
                    //     received: receivedSignature,
                    //     expected: expectedSignature,
                    //     ip: ip,
                    //     ua: ua
                    // });
                    
                    return sendError(res, 'CSRF_TOKEN_INVALID', 'CSRF_TOKEN_INVALID');
                }

                next();
            };
        }
    };
};
