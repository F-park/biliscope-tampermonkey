const BILIBILI_API_URL = "https://api.bilibili.com"
const NUM_PER_PAGE = 50

/*
 * Bilibili http request util
 */

var biliMixin = null;

async function getBiliMixin() {
    const OE = [46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45,
                35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38,
                41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60,
                51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
                20, 34, 44, 52];

    return fetch("https://api.bilibili.com/x/web-interface/nav")
        .then((response) => response.json())
        .then((data) => {
            let img_val = data["data"]["wbi_img"]["img_url"].split("/").pop().split(".")[0];
            let sub_val = data["data"]["wbi_img"]["sub_url"].split("/").pop().split(".")[0];
            let val = img_val + sub_val;
            return OE.reduce((s, v) => s + val[v], "").substring(0, 32);
        });
}

async function biliGet(url, params, retry = 5) {
    const origUrl = url;

    if (biliMixin === null) {
        biliMixin = await getBiliMixin();
    }

    if (url.indexOf("/wbi/") != -1 || url.indexOf("/conclusion/get") != -1) {
        // convert params to url in a sorted order
        params["wts"] = Math.floor(Date.now() / 1000);
        let keys = Object.keys(params).sort();
        let paramsStr = keys.map((key) => `${key}=${params[key]}`).join("&");
        let sign = md5(paramsStr + biliMixin);
        url = `${url}?${paramsStr}&w_rid=${sign}`;
    } else {
        let keys = Object.keys(params).sort();
        let paramsStr = keys.map((key) => `${key}=${params[key]}`).join("&");
        url = `${url}?${paramsStr}`;
    }

    return fetch(url, {"credentials": "include", "mode": "cors"})
        .then((response) => response.json())
        .then((data) => {
            if (data['code'] == -403) {
                biliMixin = null;
            }
            if (data['code'] == -799 && retry > 0) {
                return new Promise(resolve => setTimeout(resolve, 1000))
                    .then(() => biliGet(origUrl, params, retry - 1));
            }
            return data;
        });
}

async function biliPost(url, params) {
    let cookieData = parseCookie(document.cookie);
    let csrf = cookieData["bili_jct"];
    let keys = Object.keys(params).sort();
    let paramsStr = keys.map((key) => `${key}=${params[key]}`).join("&");
    url = `${url}?${paramsStr}&csrf=${csrf}`;

    return fetch(url, {"method": "POST", "credentials": "include", "mode": "cors"})
        .then((response) => response.json())
        .then((data) => {
            return data;
        });
}

/*
 * Data requests
 */

var videoInfoCache = new Map();


function cacheValidVideo(cache) {
    if (!cache) {
        return false;
    }

    return ["conclusion"].every((key) => cache[key]);
}

function cacheAndUpdateVideo(callback, videoId, api, payload) {
    let cache = videoInfoCache.get(videoId) ?? {};

    cache[api] = payload;

    videoInfoCache.set(videoId, cache);

    callback({"bvid": videoId, "api": api, "payload": payload});
}

function updateVideoInfo(videoId, callback) {
    let cache = videoInfoCache.get(videoId);
    if (cacheValidVideo(cache)) {
        for (let api in cache) {
            callback({"videoId": videoId, "api": api, "payload": cache[api]});
        }
        return;
    }

    biliGet(`${BILIBILI_API_URL}/x/web-interface/view`, {
        bvid: videoId,
    })
    .then((data) => {
        if (data["code"] == 0) {
            cacheAndUpdateVideo(callback, videoId, "view", data["data"]);
            biliGet(`${BILIBILI_API_URL}/x/web-interface/view/conclusion/get`, {
                bvid: videoId,
                cid: data["data"]["cid"],
                up_mid: data["data"]["owner"]["mid"],
            })
            .then((data) => {
                cacheAndUpdateVideo(callback, videoId, "conclusion", data["data"]);
            })

            biliGet(`${BILIBILI_API_URL}/x/v2/reply/wbi/main`, {
                type: 1,
                oid: data["data"]["aid"],
            })
            .then((data) => {
                cacheAndUpdateVideo(callback, videoId, "reply", data["data"]);
            })
        }
    })
}
