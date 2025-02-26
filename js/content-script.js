var _videoObj = [];
var _videoSrc = [];
var _key = [];
chrome.runtime.onMessage.addListener(function (Message, sender, sendResponse) {
    // 获取页面视频对象
    if (Message.Message == "getVideoState") {
        let videoObj = [];
        let videoSrc = [];
        document.querySelectorAll("video, audio").forEach(function (video) {
            if (video.currentSrc != "" && video.currentSrc != undefined) {
                videoObj.push(video);
                videoSrc.push(video.currentSrc);
            }
        });
        const iframe = document.querySelectorAll("iframe");
        if (iframe.length > 0) {
            iframe.forEach(function (iframe) {
                if (iframe.contentDocument == null) { return true; }
                iframe.contentDocument.querySelectorAll("video, audio").forEach(function (video) {
                    if (video.currentSrc != "" && video.currentSrc != undefined) {
                        videoObj.push(video);
                        videoSrc.push(video.currentSrc);
                    }
                });
            });
        }
        if (videoObj.length > 0) {
            if (videoObj.length !== _videoObj.length || videoSrc.toString() !== _videoSrc.toString()) {
                _videoSrc = videoSrc;
                _videoObj = videoObj;
            }
            Message.index = Message.index == -1 ? 0 : Message.index;
            const video = videoObj[Message.index];
            const timePCT = video.currentTime / video.duration * 100;
            sendResponse({
                time: timePCT,
                currentTime: video.currentTime,
                duration: video.duration,
                volume: video.volume,
                count: _videoObj.length,
                src: _videoSrc,
                paused: video.paused,
                loop: video.loop,
                speed: video.playbackRate,
                muted: video.muted,
                type: video.tagName.toLowerCase()
            });
            return true;
        }
        sendResponse({ count: 0 });
        return true;
    }
    // 速度控制
    if (Message.Message == "speed") {
        _videoObj[Message.index].playbackRate = Message.speed;
        return true;
    }
    // 画中画
    if (Message.Message == "pip") {
        if (document.pictureInPictureElement) {
            try { document.exitPictureInPicture(); } catch (e) { return true; }
            sendResponse({ state: false });
            return true;
        }
        try { _videoObj[Message.index].requestPictureInPicture(); } catch (e) { return true; }
        sendResponse({ state: true });
        return true;
    }
    // 全屏
    if (Message.Message == "fullScreen") {
        if (document.fullscreenElement) {
            try { document.exitFullscreen(); } catch (e) { return true; }
            sendResponse({ state: false });
            return true;
        }
        setTimeout(function () {
            try { _videoObj[Message.index].requestFullscreen(); } catch (e) { return true; }
        }, 500);
        sendResponse({ state: true });
        return true;
    }
    // 播放
    if (Message.Message == "play") {
        _videoObj[Message.index].play();
        return true;
    }
    // 暂停
    if (Message.Message == "pause") {
        _videoObj[Message.index].pause();
        return true;
    }
    // 循环播放
    if (Message.Message == "loop") {
        _videoObj[Message.index].loop = Message.action;
        return true;
    }
    // 设置音量
    if (Message.Message == "setVolume") {
        _videoObj[Message.index].volume = Message.volume;
        sendResponse("ok");
        return true;
    }
    // 静音
    if (Message.Message == "muted") {
        _videoObj[Message.index].muted = Message.action;
        return true;
    }
    // 设置视频进度
    if (Message.Message == "setTime") {
        const time = Message.time * _videoObj[Message.index].duration / 100;
        _videoObj[Message.index].currentTime = time;
        sendResponse("ok");
        return true;
    }
    // 截图视频图片
    if (Message.Message == "screenshot") {
        try {
            const video = _videoObj[Message.index];
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/jpeg");
            link.download = `${location.hostname}-${secToTime(video.currentTime)}.jpg`;
            link.click();
            delete canvas;
            delete link;
            sendResponse("ok");
            return true;
        } catch (e) { console.log(e); return true; }
    }
    if (Message.Message == "getKey") {
        sendResponse(_key);
        return true;
    }
});

// Heart Beat
var Port;
function connect() {
    Port = chrome.runtime.connect(chrome.runtime.id, { name: "HeartBeat" });
    Port.postMessage("HeartBeat");
    Port.onMessage.addListener(function (message, Port) { return true; });
    Port.onDisconnect.addListener(connect);
}
connect();

function secToTime(sec) {
    let time = "";
    let hour = Math.floor(sec / 3600);
    let min = Math.floor((sec % 3600) / 60);
    sec = Math.floor(sec % 60);
    if (hour > 0) { time = hour + "'"; }
    if (min < 10) { time += "0"; }
    time += min + "'";
    if (sec < 10) { time += "0"; }
    time += sec;
    return time;
}

window.addEventListener("message", (event) => {
    if (event.data.type == "addMedia") {
        chrome.runtime.sendMessage({ Message: "addMedia", url: event.data.url, href: event.data.href, extraExt: event.data.ext });
    }
    if (event.data.type == "addKey") {
        let key = event.data.ext == "key" ? ArrayToBase64(event.data.key) : event.data.key;
        if (_key.includes(key)) { return; }
        _key.push(key);
    }
}, false);

function ArrayToBase64(data) {
    let bytes = new Uint8Array(data);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    if (typeof _btoa == "function") {
        return _btoa(binary);
    }
    return btoa(binary);
}