// Streams related
export const isAudioStream = (stream) => {
    if (!stream) return false;

    const audioTracks = stream.getAudioTracks();
    return audioTracks.length > 0 && audioTracks.some((track) => isLiveTrack(track));
}

export const isVideoStream = (stream) => {
    if (!stream) return false;

    const videoTracks = stream.getVideoTracks();
    return videoTracks.length > 0 && videoTracks.some((track) => isLiveTrack(track));
}

export const isMixedStream = (stream) => {
    return isVideoStream(stream) && isAudioStream(stream);
}

export const isLiveTrack = (track) => {
    return track && track.readyState === 'live';
}