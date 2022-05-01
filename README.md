# Noom

Zoom clone using nodeJS, webRTC and websockets

# 핵심코드

    if (myStream) {
        const tracks = myStream.getTracks();
        tracks.forEach((track) => track.stop());
    }

카메라를 바꾸기 전, 원래 트랙들을 멈춰줘야 한다.
