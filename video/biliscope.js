function showProfile(event, target) {
    const videoId = target.getAttribute("biliscope-videoid");

    if (videoProfileCard?.enable()) {
        const updated = videoProfileCard.updateVideoId(videoId);
        videoProfileCard.updateTarget(target);
        videoProfileCard.updatePosition();
        if (updated) {
            updateVideoInfo(videoId, (data) => {
                videoProfileCard.updateData(data);
            });
        }
    }
}

function showProfileDebounce(event) {
    clearTimeout(this.timer);
    const target = event.target.closest("[biliscope-videoid]");
    if (!target) {
        return;
    }

    target.addEventListener("mouseout", () => clearTimeout(this.timer));

    this.timer = setTimeout(() => {
        showProfile(event, target);
    }, 800);
}

window.addEventListener("load", function() {
    videoProfileCard = new VideoProfileCard();
    this.document.addEventListener("mouseover", showProfileDebounce);
    installIdHooks();
});
