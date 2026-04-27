/**
 * PromptPay QR Code Payload Generator
 * Based on EMVCo Standard
 */

const crc16 = (data) => {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xFF;
        x ^= x >> 4;
        crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
};

const f = (id, value) => {
    return id + (value.length.toString().padStart(2, '0')) + value;
};

/**
 * Generates PromptPay payload string
 * @param {string} id - Phone number (08x...) or ID Card number
 * @param {number} amount - Amount in THB
 * @returns {string} Payload string
 */
export const generatePromptPayPayload = (id, amount) => {
    // Sanitize ID
    let raw = id.replace(/[^0-9]/g, '');
    let target = raw;
    let type = '01'; // Default to mobile

    if (raw.length === 10) {
        // Mobile number: prefix with 0066 and remove leading 0
        target = '0066' + raw.substring(1);
        type = '01';
    } else if (raw.length === 13) {
        if (raw.startsWith('0066')) {
            // Already formatted mobile
            target = raw;
            type = '01';
        } else {
            // ID Card
            target = raw;
            type = '02';
        }
    }

    const payload = [
        f('00', '01'), // Payload Format Indicator
        f('01', '11'), // Point of Initiation Method (11 = Static)
        f('29', 
            f('00', 'A000000677010111') + // PromptPay GUID
            f(type, target)
        ),
        f('53', '764'), // Currency Code (THB = 764)
        amount ? f('54', amount.toFixed(2)) : '', // Amount
        f('58', 'TH'), // Country Code
    ].join('');

    const crcPayload = payload + '6304';
    return crcPayload + crc16(crcPayload);
};
