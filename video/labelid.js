function getVideoIdFromLink(link) {
    const regexBV = /(BV[1-9a-zA-Z]{10})/g;
    return link.match(regexBV)?.[0];
}

function elementImageChildren(el) {
    return el.querySelector("img") || el.querySelector("picture");
}

function labelLinks() {
    for (let el of document.getElementsByTagName("a")) {
        if (el.href.startsWith(BILIBILI_VIDEO_URL) || el.href.startsWith(BILIBILI_WATCH_LATER_URL)) {
            const videoId = getVideoIdFromLink(el.href);
            if (videoId && elementImageChildren(el)) {
                el.setAttribute("biliscope-videoid", videoId);
            }
        }
    }
}

function installIdHooks() {
    let pageObserver = new MutationObserver((mutationList, observer) => {
        labelLinks();
    })

    pageObserver.observe(document.body, {
        childList: true,
        subtree: true,
    })

}
