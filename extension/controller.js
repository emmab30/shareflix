import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import Constants from '../shared/constants';
import ProgressState from '../shared/model/progressState';
import toast, { Toaster } from '../node_modules/react-hot-toast/dist/index';
import PairBox from './components/PairBox';

import FadeIn from './components/FadeIn/index';
import { PRIMARY_FONT } from './utils/fonts';
import { isAudioStream, isMixedStream } from './utils/streams';
import CameraIcon from './icons/CameraIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SliderVolume from './components/SliderVolume';

const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.l.google.com:5349" },
    { urls: "stun:stun1.l.google.com:3478" },
    { urls: "stun:stun1.l.google.com:5349" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:5349" },
    { urls: "stun:stun3.l.google.com:3478" },
    { urls: "stun:stun3.l.google.com:5349" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:5349" }
];

const { RTCPeerConnection, RTCSessionDescription } = window;

let enabled = false;
let setEnabled = (value) => {
    enabled = value;
}

let loadingToastId;
let pairedRoom = false;

// Some constants, move them to a constants file
const VIDEO_WIDTH = 120;
const VIDEO_HEIGHT = 120;
const USERS_PANEL_TOP = 70;
const USERS_PANEL_HEIGHT = 150; // ToDo - measure it

const NetflixController = () => {
    /* const [controllerProgress, setControllerProgress] = useState(new ProgressState()); */
    const [ignoreQ, setIgnoreQ] = useState([]);
    const [candidates, setCandidates] = useState([]);

    // For fullscreen mode
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [backdrop, setBackdrop] = useState(false);

    const [pairCode, setPairCode] = useState(null);
    const [state, _setState] = useState({
        syncing: true,
        synced: false,
        playingState: -1,
        progress: new ProgressState(),
    });
    const [toasts,] = useState({
        syncing: null
    });
    const [lobby, _setLobby] = useState(null);

    // For media elements
    const [positions, setPositions] = useState([]);
    const [userIdTalking, setUserIdTalking] = useState(null);
    const [hoveredUserId, setHoveredUserId] = useState(null);

    const streamPanelRef = useRef(null);
    const usersPanelRef = useRef(null);
    const lobbyRef = useRef(lobby);
    const stateRef = useRef(state);
    const toastsRef = useRef(toasts);
    const systemMessagesRef = useRef([]);

    // Peer connections
    const streams = useRef([]);
    const [streamVolume, setStreamVolume] = useState({});
    const myLocalStream = useRef(null);
    const peerConnections = useRef({});
    const iceCandidatesQueue = useRef({});

    /* Util functions */
    const getState = () => stateRef.current;
    const setState = (newState) => {
        stateRef.current = newState;
        _setState({ ...newState });
    }

    const getToasts = () => toastsRef.current;
    const setToasts = (newToasts) => {
        toastsRef.current = newToasts;
    }

    const getLobby = () => lobbyRef.current;
    const setLobby = (newLobby) => {
        const users = newLobby.users;

        // If there are more than 2 members in the lobby, disable the pair code
        if (newLobby.users.length > 1) {
            /* setPairCode(null);

            if (!pairedRoom) {
                pairedRoom = true;
                initialize();
            } */
        } else {
            // Check if any user disconnected and show a toast
            const oldLobby = getLobby();
            if (oldLobby) {
                const oldUsers = oldLobby.users;
                const newUsers = newLobby.users;

                const disconnectedUser = oldUsers.find(u => !newUsers.find(nu => nu.id === u.id));
                if (disconnectedUser) {
                    toast.error(`${disconnectedUser.alias} has left the room!`);
                }
            }
        }

        // Create peer connection if does not exist for users
        for (var idx in users) {
            const user = users[idx];
            if (!user.me) {
                if (!peerConnections.current[user.id]) {
                    console.log(`[Debug] Creating peer connection for user ${user.id}`);
                    peerConnections.current[user.id] = new RTCPeerConnection({
                        'iceServers': iceServers
                    });
                    setupPeerConnection(peerConnections.current[user.id], user.id);
                }
            }
        }

        lobbyRef.current = newLobby;
        _setLobby(newLobby);
    }

    const getMe = () => {
        if (getLobby()) {
            return getLobby().users.find(u => u.me);
        }
        return null;
    };

    useEffect(() => {
        console.log('Netflix Controller Loaded');

        loadScripts().then(loadFonts).then(() => {
            enableController();
        });

        // Set positions for every stream
        const positions = {};
        const numberOfCameras = 4;
        for (let i = 0; i < numberOfCameras; i++) {
            positions[i] = { x: window.innerWidth - 90, y: 40 + USERS_PANEL_HEIGHT + i * 90 };
        }
        setPositions(positions);

        window.addEventListener('message', handleMessage);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            window.removeEventListener('message', handleMessage);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const handleFullscreenChange = () => {
        const backdrop = document.querySelector('.watch-video');
        setIsFullscreen(document.fullscreenElement != null);
        setBackdrop(backdrop);
    };

    useEffect(() => {
        if (userIdTalking != null) {
            setTimeout(() => {
                setUserIdTalking(null);
            }, 500);
        }
    }, [userIdTalking]);

    const setupPeerConnection = (peerConnection, userId) => {
        peerConnection.ontrack = event => {
            if (event && event.streams && event.streams.length > 0) {
                const stream = event.streams[0];
                if (stream.getTracks().length < 1) {
                    console.log(`[Debug] Stream has no tracks!`, stream);
                    return;
                }

                console.log(`[Event] Received stream`, stream);
                // Check if stream already exists
                const existingStreamIndex = streams.current.findIndex(s => s.id === stream.id);
                if (existingStreamIndex > -1) {
                    streams.current[existingStreamIndex] = stream;
                } else {
                    streams.current.push(stream);
                }

                if (getMyStream()) {
                    console.log(`[Debug] Adding tracks to peer connection`);
                    getMyStream().getTracks().forEach(track => addTrackToPeerConnections(track, getMyStream()));
                }
            }
        };

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                sendToWS({
                    type: Constants.Protocol.Stream.ICE_CANDIDATE,
                    candidate: JSON.stringify(event.candidate),
                    _target: userId,
                    _source: getMe().id
                });
            } else {
                processIceCandidates(userId); // Ensure ICE candidates are processed as they come in
            }
        };

        // Add transceivers for the media lines
        peerConnection.addTransceiver('video', { direction: 'sendrecv' });
        peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
    };

    /* console.log(`[Debug] List of updated streams`, streams) */

    const loadScripts = () => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
            document.body.appendChild(script);
            script.onload = () => {
                const script2 = document.createElement('script');
                script2.src = 'https://code.jquery.com/ui/1.12.1/jquery-ui.min.js';
                document.body.appendChild(script2);
                script2.onload = resolve;
                script2.onerror = reject;
            };
            script.onerror = reject;
        });
    };

    const loadFonts = () => {
        return new Promise((resolve, reject) => {
            const link1 = document.createElement('link');
            link1.rel = 'preconnect';
            link1.href = 'https://fonts.googleapis.com';
            document.head.appendChild(link1);

            const link2 = document.createElement('link');
            link2.rel = 'preconnect';
            link2.href = 'https://fonts.gstatic.com';
            link2.crossOrigin = 'anonymous';
            document.head.appendChild(link2);

            const link3 = document.createElement('link');
            link3.rel = 'stylesheet';
            link3.href = 'https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap';
            link3.onload = resolve;
            link3.onerror = reject;
            document.head.appendChild(link3);
        });
    };

    const enableController = () => {
        if (enabled) return;
        let foundMutation = false;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                /* // Find in the dom if there's a control that has the attribute "data-uia" with the value "control-flag" and remove it
                // This is the button for report (which overlaps with stream-panel)
                const controlFlag = document.querySelector('[data-uia="control-flag"]');
                if (controlFlag) {
                    controlFlag.remove();
                } */

                if (mutation.target.className === 'watch-video' && !foundMutation) {
                    /* mutation.target.appendChild(streamPanelRef.current); */
                    foundMutation = true;
                    const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer;
                    const sessionId = videoPlayer.getAllPlayerSessionIds()[0];
                    const player = videoPlayer.getVideoPlayerBySessionId(sessionId);
                    /* setProgressState((prev) => ({
                        ...prev,
                        elapsed: player.getCurrentTime(),
                        duration: player.getDuration()
                    })); */
                    const videoElement = document.getElementsByTagName('video')[0];
                    videoElement.addEventListener('play', userPlay);
                    videoElement.addEventListener('pause', userPause);
                    videoElement.addEventListener('timeupdate', timeUpdate);
                    videoElement.addEventListener('seeked', userSeek);
                    observer.disconnect();
                    setEnabled(true);
                    requestCode();
                    // initialize();
                    pause(true);
                }
            });
        });

        observer.observe(document.getElementById('appMountPoint'), {
            childList: true,
            subtree: true
        });
    };

    // Function to request code and connect to a session
    const requestCode = () => {
        /* showLoading(`Requesting code..`); */
        const req = {
            type: Constants.Protocol.Messages.REQUEST_CODE
        };
        sendToWS(req);
    };

    const onStartSession = () => {
        showLoading(`Starting session..`);
        const req = {
            type: Constants.Protocol.Messages.START_SESSION
        };
        sendToWS(req);
    };

    const joinCode = (code) => {
        /* if (code == pairCode) {
            toast.error(`You can't join to your own room`);
            return;
        } */

        console.log(`[Event] Joining to code ${code}..`);
        showLoading(`You have just joined room. We're awaiting for room owner to start!`);
        const req = {
            type: Constants.Protocol.Messages.CONNECT_CODE,
            code
        };
        sendToWS(req);
    }

    const showLoading = (text) => {
        if (loadingToastId != null) dismissLoading();
        loadingToastId = toast.loading(text);
    }

    const dismissLoading = () => {
        if (loadingToastId != null) {
            toast.dismiss(loadingToastId);
        }
    }

    const play = (force = false) => {
        if (enabled || force) {
            const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer;
            const sessionId = videoPlayer.getAllPlayerSessionIds()[0];
            const player = videoPlayer.getVideoPlayerBySessionId(sessionId);
            player.play();
            /* addSystemMessage('Playing movie', { duration: 3000 }); */
        }
    };

    const pause = (force = false) => {
        if (enabled || force) {
            const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer;
            const sessionId = videoPlayer.getAllPlayerSessionIds()[0];
            const player = videoPlayer.getVideoPlayerBySessionId(sessionId);
            player.pause();
            /* addSystemMessage('Paused movie', { duration: 3000 }); */
        }
    };

    const seek = (time) => {
        if (enabled) {
            const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer;
            const sessionId = videoPlayer.getAllPlayerSessionIds()[0];
            const player = videoPlayer.getVideoPlayerBySessionId(sessionId);
            player.seek(time);
            const seconds = time / 1000;
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const sec = Math.floor(seconds % 60);
            const pad = (num) => num.toString().padStart(2, '0');
            /* const timeStr = `${pad(hours)}:${pad(minutes)}:${pad(sec)}`;
            if (timeStr !== '00:00:00') addSystemMessage(`Time: ${timeStr}`); */
        }
    };

    const spinHtml = (msg) => (
        '<div style="text-align: center;"><h1>' +
        msg +
        '</h1><img src="https://cdnjs.cloudflare.com/ajax/libs/galleriffic/2.0.1/css/loader.gif" /></div>'
    );

    const addSystemMessage = (msg, { duration } = { duration: -1 }) => {
        // Avoid duplicated messages
        if (systemMessagesRef.current.includes(msg)) return;
        systemMessagesRef.current.push(msg);

        toast.success(msg, {
            position: 'bottom-center',
            autoClose: duration,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
        });
    };

    // Track player state changes
    useEffect(() => {
        const _state = getState();
        /* console.log(`[Event] The state has been changed`, state); */

        if (_state.syncing && !getToasts().syncing) {
            /* setToasts({ syncing: toast.loading('Syncing...') }); */
        } else if (!_state.syncing) {
            if (getToasts().syncing) {
                toast.dismiss(getToasts().syncing);
                setToasts({ ...getToasts(), syncing: null });
            }

            if (_state.playingState == Constants.ControllerState.PLAY) {
                play(true);
            } else if (_state.playingState == Constants.ControllerState.PAUSE) {
                pause(true);
            }
        }
    }, [state.syncing, state.synced, state.playingState]);

    // Track seek
    useEffect(() => {
        const _state = getState();
        /* console.log(`[Event] The progress state has been changed`, _state.progress); */

        seek(_state.progress.elapsed);
    }, [state.progress.elapsed]);

    const handleMessage = (event) => {
        if (typeof event.data !== 'object') return;

        let isMe = false;
        if (event.data.me && event.data.user) {
            isMe = event.data.me.id === event.data.user.id;
        }

        /* console.log(`[Event] Received message from ${isMe ? 'me' : 'other'}`, event.data); */

        switch (event.data.type) {
            /* Codes */
            case Constants.Protocol.Messages.REQUEST_CODE_ACK:
                setPairCode(event.data.code);
                dismissLoading();
                break;
            case Constants.Protocol.Messages.CONNECT_CODE_ACK:
                if (event.data.code == Constants.Protocol.FAIL) {
                    if (event.data.message) {
                        toast.error(event.data.message);
                        if (event.data.lobby_owner != null && event.data.lobby_owner.urlParams) {
                            // Wait 3 seconds and ask if want to be redirected to the owner's room
                            setTimeout(() => {
                                if (confirm(`Do you want to be redirected to the owner's room?`)) {
                                    window.location.href = `https://www.netflix.com/${event.data.lobby_owner.urlParams}`;
                                }
                            }, 1500);
                        }
                    } else {
                        toast.error(`The code is not valid. Please try it again`);
                    }
                    return;
                }

                break;
            case Constants.Protocol.Messages.START_SESSION_ACK:
                dismissLoading();
                setPairCode(null);

                if (!pairedRoom) {
                    pairedRoom = true;
                    initialize();
                }

                break;
            case Constants.Protocol.Messages.DISCONNECT_ACK:
                dismissLoading();
                toast.success(`Disconnected from the session!`);
                break;
            /* Synchronization */
            case Constants.Protocol.Messages.SYNC_INIT:
                dismissLoading();
                setState({ ...getState(), syncing: true });
                break;
            case Constants.Protocol.Messages.SYNC_INIT_ACK:
                dismissLoading();
                break;
            case Constants.Protocol.Messages.SYNC_END:
                addSystemMessage(`You and your friend are now connected!`);
                setState({ ...getState(), syncing: false, synced: true });
                break;
            case Constants.Protocol.Messages.UPDATE_CONTROL_SCRIPT:
                if (event.data.code) {
                    enableController();
                } else {
                    setEnabled(false);
                }
                break;
            case Constants.Protocol.Messages.SYNC_TIME:
                /* setControllerProgress(event.data.progressState); */
                seek(event.data.progressState.elapsed);
                const ack = {
                    type: Constants.Protocol.Messages.SYNC_TIME_ACK
                };
                sendToWS(ack);
                break;
            case Constants.Protocol.Stream.OFFER:
                const offer = JSON.parse(event.data.offer);
                let isOfferForMe = event.data._target == getMe().id;

                if (isOfferForMe) {
                    const peerConnection = peerConnections.current[event.data._source];
                    const target = event.data._target;
                    const source = event.data._source;

                    console.log(`[Debug] Received offer for me [${getMe().id}]. Sending answer to ${source}`);
                    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
                        .then(() => peerConnection.createAnswer())
                        .then(answer => {
                            peerConnection.setLocalDescription(answer).then(() => {
                                sendToWS({
                                    type: Constants.Protocol.Stream.ANSWER,
                                    answer: JSON.stringify(answer),
                                    _source: getMe().id,
                                    _target: event.data._source
                                });
                            });
                        })
                        .catch(console.error);
                }

                break;
            case Constants.Protocol.Stream.ANSWER:
                const answer = JSON.parse(event.data.answer);
                const isAnswerForMe = event.data._target == getMe().id;

                if (isAnswerForMe) {
                    console.log(`[Debug] Received answer for [${event.data._source}]. Me: ${getMe().id}`);
                    peerConnections.current[event.data._source].setRemoteDescription(new RTCSessionDescription(answer)).then(() => {
                        processIceCandidates(event.data._source);
                    }).catch(console.error);
                }

                break;
            case Constants.Protocol.Stream.ICE_CANDIDATE:
                handleIceCandidate(event);

                break;
            case Constants.Protocol.Video.PAUSE:
                const streamId = event.data.streamId;
                break;
            case Constants.Protocol.Events.LOBBY_UPDATED:
                setLobby(event.data.lobby);
                break;
            case Constants.Protocol.Messages.UPDATE_STATE:
                switch (event.data.controllerState) {
                    case Constants.ControllerState.PLAY:
                        setState({ ...getState(), playingState: event.data.controllerState });
                        break;
                    case Constants.ControllerState.PENDING:
                    case Constants.ControllerState.PAUSE:
                        setState({ ...getState(), playingState: event.data.controllerState });
                        break;
                    default:
                        break;
                }
                break;
            case Constants.Protocol.Messages.UPDATE_SEEK:
                setState({ ...getState(), progress: event.data.progressState });
                break;
            default:
                break;
        }
    };

    const initialize = () => {
        showLoading(`Syncing with your friend..`);
        const req = {
            type: Constants.Protocol.Messages.SYNC_INIT
        };
        sendToWS(req);
    };

    const processIceCandidates = (userId) => {
        if (iceCandidatesQueue.current[userId]) {
            while (iceCandidatesQueue.current[userId].length) {
                const candidate = iceCandidatesQueue.current[userId].shift();
                peerConnections.current[userId].addIceCandidate(candidate).catch(console.error);
            }
        }
    };

    const handleIceCandidate = (event) => {
        if (peerConnections.current[event.data._source]) {
            const peerConnection = peerConnections.current[event.data._source];
            const candidateObject = new RTCIceCandidate(JSON.parse(event.data.candidate));
            if (peerConnection.remoteDescription) {
                peerConnection.addIceCandidate(candidateObject).catch(console.error);
            } else {
                if (!iceCandidatesQueue.current[event.data._source]) {
                    iceCandidatesQueue.current[event.data._source] = [];
                }
                iceCandidatesQueue.current[event.data._source].push(candidateObject);
            }
        }
    };

    const toggleVideoStream = () => {
        const user = getMe();
        // Find my stream
        const streamObj = getLobby().streams.find(s => s.userId == user.id && s.video);
        if (streamObj) {
            const stream = getStreamById(streamObj.streamId);
            if (stream) {
                stream.getVideoTracks().forEach(track => {
                    track.stop();
                    stream.removeTrack(track);

                    for (var idx in Object.keys(peerConnections.current)) {
                        const userId = Object.keys(peerConnections.current)[idx];
                        peerConnections.current[userId].getSenders().forEach(sender => {
                            if (sender.track === track) {
                                peerConnections.current[userId].removeTrack(sender);
                            }
                        });
                    }
                });

                createOffer(stream);

                // Send to websocket
                sendToWS({
                    type: Constants.Protocol.Video.PAUSE,
                    streamId: stream.id
                });

                return;
            }
        }

        // Initialize video again
        initializeVideo();
    };

    const toggleAudioStream = () => {
        const user = getMe();

        // Find my stream
        const streamObj = getLobby().streams.find(s => s.userId == user.id && s.audio);
        if (streamObj) {
            const stream = getStreamById(streamObj.streamId);
            if (stream) {
                stream.getAudioTracks().forEach(track => {
                    track.stop();
                    stream.removeTrack(track);

                    for (var idx in Object.keys(peerConnections.current)) {
                        const userId = Object.keys(peerConnections.current)[idx];
                        peerConnections.current[userId].getSenders().forEach(sender => {
                            if (sender.track === track) {
                                peerConnections.current[userId].removeTrack(sender);
                            }
                        });
                    }
                });

                createOffer(stream);

                // Send to websocket
                sendToWS({
                    type: Constants.Protocol.Audio.MUTE,
                    streamId: stream.id
                });

                return;
            }
        }

        initializeAudio().then(() => {

        });
    }

    const getStreamById = (streamId) => {
        return streams.current.find(s => s.id === streamId);
    };

    const addTrackToPeerConnections = (track, stream) => {
        for (let peerId in peerConnections.current) {
            const peerConnection = peerConnections.current[peerId];
            const senders = peerConnection.getSenders();
            if (!senders.find(sender => sender.track === track)) {
                peerConnection.addTrack(track, stream);
            }
        }
    };

    const configureStream = (stream) => {
        if (!stream) throw new Error(`Invalid stream!`);

        stream.getTracks().forEach(track => addTrackToPeerConnections(track, stream));
        streams.current.push(stream);
        createOffer(stream);

        myLocalStream.current = stream;
    };

    const createOffer = (stream) => {
        // Look into participants and send the offers
        for (var idx in getLobby().users) {
            const user = getLobby().users[idx];
            if (user.id == getMe().id) continue;

            console.log(`[Debug] Creating offer from me [${getMe().id}] to ${user.id} and assign it to peerConnection[${user.id}]`)
            const peerConnection = peerConnections.current[user.id];
            peerConnection.addStream(stream);
            peerConnection.createOffer().then((offer) => {
                peerConnection.setLocalDescription(new RTCSessionDescription(offer)).then(() => {
                    sendToWS({
                        type: Constants.Protocol.Stream.OFFER,
                        offer: JSON.stringify(peerConnection.localDescription),
                        streamId: stream.id,
                        _source: getMe().id,
                        _target: user.id,
                    });
                });
            });
        }
    }

    const initializeVideo = () => {
        const toastId = toast.loading(`Sharing your camera..`);
        return new Promise((resolve, reject) => {
            navigator.getUserMedia(
                { video: true }, (stream) => {
                    // Add tracks to my stream or configure a new one
                    const myStream = getMyStream();
                    if (myStream) {
                        stream.getTracks().forEach(track => myStream.addTrack(track));
                        stream.getTracks().forEach(track => addTrackToPeerConnections(track, myStream));
                        createOffer(myStream);
                    } else {
                        configureStream(stream);
                    }

                    sendToWS({
                        type: Constants.Protocol.Video.PLAY,
                        streamId: stream.id
                    });

                    toast.remove(toastId);
                    resolve(true);
                }, (error) => {
                    toast.remove(toastId);
                    console.warn(error.message);
                    reject(error);
                }
            );
        });
    };

    const initializeAudio = () => {
        const toastId = toast.loading(`Initializing audio..`);
        return new Promise((resolve, reject) => {
            navigator.getUserMedia(
                { audio: true }, (stream) => {
                    // Add tracks to my stream or configure a new one
                    const myStream = getMyStream();
                    if (myStream) {
                        stream.getTracks().forEach(track => myStream.addTrack(track));
                        stream.getTracks().forEach(track => addTrackToPeerConnections(track, myStream));
                        createOffer(myStream);
                    } else {
                        configureStream(stream);
                    }

                    sendToWS({
                        type: Constants.Protocol.Audio.UNMUTE,
                        streamId: stream.id
                    });

                    toast.remove(toastId);
                    resolve(true);
                }, (error) => {
                    toast.remove(toastId);
                    console.warn(error.message);
                    reject(error);
                }
            );
        });
    };

    const sendToWS = (msg) => {
        window.postMessage(msg, '*');
    };

    const userPlay = (event) => {
        if (shouldIgnore(event)) return;
        stateUpdate(Constants.ControllerState.PLAY);
    };

    const userPause = (event) => {
        if (shouldIgnore(event)) return;
        stateUpdate(Constants.ControllerState.PAUSE);
    };

    const userSeek = (event) => {
        if (shouldIgnore(event)) return;
        seekUpdate();
    };

    const timeUpdate = (event) => {
        /* updateProgress();
        const req = {
            type: Constants.Protocol.Messages.UPDATE_TIME,
            progressState: progressState
        };
        sendToWS(req); */
    };

    const stateUpdate = (controllerState) => {
        const req = {
            type: Constants.Protocol.Messages.UPDATE_STATE,
            controllerState
        };
        sendToWS(req);
    };

    const seekUpdate = () => {
        const req = {
            type: Constants.Protocol.Messages.UPDATE_SEEK,
            progressState: getProgress()
        };
        sendToWS(req);
    };

    const getProgress = () => {
        const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer;
        const sessionId = videoPlayer.getAllPlayerSessionIds()[0];
        const player = videoPlayer.getVideoPlayerBySessionId(sessionId);
        /* setProgressState((prev) => ({
            ...prev,
            elapsed: player.getCurrentTime(),
            duration: player.getDuration()
        })); */
        return {
            elapsed: player.getCurrentTime(),
            duration: player.getDuration()
        }
    };

    const shouldIgnore = (event) => {
        if (ignoreQ.length < 1) {
            return false;
        }
        let frontType = ignoreQ[0];
        if (frontType === event.type) {
            ignoreQ.splice(0, 1);
            return true;
        }
        return false;
    };

    const getUserById = (userId) => {
        return getLobby().users.find(u => u.id === userId);
    };

    /* Util functions */
    const isSyncReady = () => {
        return getState().synced;
    }

    const isUserMediaActive = (userId, type = 'video') => {
        if (['audio', 'video'].indexOf(type) == -1) throw new Error(`Invalid media type`);

        const stream = getLobby().streams.find(s => s.userId == userId);
        if (stream) {
            return stream[type];
        }

        return false;
    }

    const handlePositionChange = (id, newPos) => {
        /* const newPositions = { ...positions, [id]: newPos };
        setPositions(newPositions); */
    };

    const handleVolumeChange = (userId, volume) => {
        setStreamVolume((prevVolumes) => ({
            ...prevVolumes,
            [userId]: volume,
        }));
    };

    const isUserTalking = (userId) => {
        return userIdTalking == userId;
    }

    const getMyStream = () => {
        return myLocalStream.current;
    }

    const getStreamPosition = (streamId) => {
        const listOfStreams = streams.current.filter(s => s.active);
        const index = listOfStreams.findIndex(s => s.id === streamId);
        if (index > -1 && usersPanelRef) {
            const width = usersPanelRef.current.offsetWidth;
            const height = usersPanelRef.current.offsetHeight;
            const top = USERS_PANEL_TOP + 10;

            const fixedY = height + top;
            const x = window.innerWidth - VIDEO_WIDTH - 5;
            const y = fixedY + (index * (VIDEO_HEIGHT + 10));

            return { x, y };
        }

        return {
            x: 0,
            y: 0
        };
    }

    const content = (
        <div style={{ zIndex: 999999999999999999 }}>
            <ToasterComponent />

            <AnimatePresence>
                {pairCode && pairCode > 0 && (
                    <PairBox
                        key="pairbox" // Add a unique key for proper handling
                        code={pairCode}
                        lobby={lobby}
                        user={getMe()}
                        onStartSession={() => onStartSession()}
                        onJoin={(code) => joinCode(code)}
                        onClose={() => {
                            setPairCode(null);
                        }}
                    />
                )}

                {isSyncReady() &&
                    <div
                        id="stream-panel"
                        ref={streamPanelRef}
                        style={{
                            position: 'fixed',
                            background: 'rgba(0,0,0,0)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            top: USERS_PANEL_TOP, // To avoid the report flag
                            right: 5,
                            width: '200px',
                            /* height: '80%', */
                            zIndex: 10000000000
                        }}>
                        <div
                            id="users-panel"
                            ref={usersPanelRef}
                            style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 5,
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingTop: 15
                            }}>
                            {/* <h1 style={{ fontFamily: PRIMARY_FONT, fontWeight: 400, color: 'white', fontSize: '16px', color: 'rgba(255,255,255,.2)', marginBottom: 10 }}>Room members</h1> */}
                            {getLobby() && _.orderBy(getLobby().users, ['me'], ['desc']).map((user, index) => {
                                return (
                                    <FadeIn delay={index * 1000} duration={index * 1000} style={{ minWidth: '100%' }}>
                                        <div
                                            style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: 10, justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                                            <div
                                                onMouseEnter={() => setHoveredUserId(user.id)}
                                                onMouseLeave={() => setHoveredUserId(null)}
                                                style={{ display: 'flex', flexDirection: 'column' }}>
                                                <p
                                                    style={{
                                                        transition: 'all 0.1s ease-in',
                                                        webkitTransition: 'all 0.1s ease-in',
                                                        width: '100%',
                                                        fontSize: 12,
                                                        fontWeight: 800,
                                                        margin: 0,
                                                        textAlign: 'left',
                                                        opacity: 1,
                                                        color: isUserTalking(user.id) ? '#febc4b' : '#ffffff'
                                                    }}>{user.alias || user.username}</p>

                                                <AnimatePresence>
                                                    {!user.me && isUserMediaActive(user.id, 'audio') && hoveredUserId === user.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, translateY: 10 }}
                                                            animate={{ opacity: 1, translateY: 0 }}
                                                            exit={{ opacity: 0, translateY: 10 }}
                                                            transition={{ duration: 0.1 }}
                                                            style={{ position: 'absolute', top: '-7px', width: '94%' }}
                                                        >
                                                            <SliderVolume
                                                                volume={streamVolume[user.id] || 100}
                                                                onChangeVolume={(volume) => handleVolumeChange(user.id, volume)}
                                                            />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'row', gap: 5 }}>
                                                <div style={{ transition: 'all 0.1s ease-in', webkitTransition: 'all 0.1s ease-in', cursor: 'pointer', opacity: user.me ? 1 : 0.4 }}>
                                                    <CameraIcon
                                                        onClick={() => {
                                                            if (user.me) toggleVideoStream();
                                                        }}
                                                        style={{
                                                            transition: 'all 0.2s ease-in',
                                                            webkitTransition: 'all 0.2s ease-in',
                                                            fill: isUserMediaActive(user.id, 'video') ? '#febc4b' : '#ffffff',
                                                            maxWidth: 20,
                                                            maxHeight: 20,
                                                            cursor: user.me ? 'pointer' : 'not-allowed'
                                                        }}
                                                    />
                                                </div>

                                                <div style={{ transition: 'all 0.1s ease-in', webkitTransition: 'all 0.1s ease-in', cursor: 'pointer', opacity: user.me ? 1 : 0.4 }}>
                                                    <MicrophoneIcon
                                                        onClick={() => {
                                                            if (user.me) toggleAudioStream();
                                                        }}
                                                        style={{
                                                            transition: 'all 0.2s ease-in',
                                                            webkitTransition: 'all 0.2s ease-in',
                                                            fill: isUserMediaActive(user.id, 'audio') ? '#febc4b' : '#ffffff',
                                                            maxWidth: 20,
                                                            maxHeight: 20,
                                                            cursor: user.me ? 'pointer' : 'not-allowed'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </FadeIn>
                                )
                            })}
                        </div>
                    </div>
                }
            </AnimatePresence>

            {getLobby()?.streams && _.uniq(getLobby()?.streams, (str) => str.id).map((_stream, videoIndex) => {
                const stream = getStreamById(_stream.streamId);
                if (stream && stream.getTracks()?.length > 0) {
                    // Print tracks for stream
                    if (isMixedStream(stream)) {
                        return [
                            <VideoItem
                                index={videoIndex}
                                stream={stream}
                                user={getUserById(_stream.userId)}
                                position={getStreamPosition(stream.id)}
                                onPositionChange={handlePositionChange}
                            />,
                            <AudioItem
                                stream={stream}
                                user={getUserById(_stream.userId)}
                                volume={streamVolume[_stream.userId] || 100}
                                position={getStreamPosition(stream.id)}
                                onPositionChange={handlePositionChange}
                                onDetectedVoice={(userId) => {
                                    setUserIdTalking(userId)
                                }}
                            />
                        ];
                    }

                    if (isAudioStream(stream)) {
                        return (
                            <AudioItem
                                index={videoIndex}
                                stream={stream}
                                user={getUserById(_stream.userId)}
                                volume={streamVolume[_stream.userId] || 100}
                                position={getStreamPosition(stream.id)}
                                onPositionChange={handlePositionChange}
                                onDetectedVoice={(userId) => {
                                    setUserIdTalking(userId)
                                }}
                            />
                        )
                    }

                    return (
                        <VideoItem
                            index={videoIndex}
                            stream={stream}
                            user={getUserById(_stream.userId)}
                            position={getStreamPosition(stream.id)}
                            onPositionChange={handlePositionChange}
                        />
                    );
                }

                return null;
            })}
        </div>
    );

    return isFullscreen && backdrop ? ReactDOM.createPortal(content, backdrop) : content;
};

const VideoItem = ({ key, index, stream, position, onPositionChange, user }) => {
    const videoRef = useRef(null);
    const [x, setX] = useState(position.x);
    const [y, setY] = useState(position.y);
    const [renderDelta, setRenderDelta] = useState(0);
    const width = useMotionValue(VIDEO_WIDTH);
    const height = useMotionValue(VIDEO_HEIGHT);

    useEffect(() => {
        setX(position.x);
        setY(position.y);
    }, [position]);

    const handleDragEnd = (event, info) => {
        const newPos = { x: position.x + info.offset.x, y: position.y + info.offset.y };
        onPositionChange(index, newPos);
    };

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]); // Update when stream changes

    const handleResize = (event, info) => {
        const MAX_WIDTH = 220;
        const MIN_WIDTH = 80;
        const ASPECT_RATIO = 1;

        const newWidth = Math.min(Math.max(MIN_WIDTH, width.get() + info.delta.x), MAX_WIDTH);
        const newHeight = newWidth / ASPECT_RATIO;
        width.set(newWidth);
        height.set(newHeight);

        setRenderDelta(renderDelta + 1)
    };

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 500,
                damping: 30,
                when: 'beforeChildren',
                staggerChildren: 0.3,
            },
        },
        exit: { opacity: 0, scale: 0.8, transition: { duration: 1 } },
    };

    const particleVariants = {
        hidden: { opacity: 0, y: -10 },
        visible: { opacity: 1, y: 0, transition: { duration: 1 } },
    };

    return (
        <motion.div
            className={`video-item-${user.id}`}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={containerVariants}
            drag
            dragConstraints={{ top: USERS_PANEL_HEIGHT, left: 5, right: window.innerWidth - width.get() - 5, bottom: window.innerHeight - height.get() }}
            dragElastic={0.2}
            dragTransition={{
                power: 0.1,
                timeConstant: 300,
                restDelta: 0.01,
            }}
            onDragEnd={handleDragEnd}
            style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'row',
                gap: 10,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'grab',
                pointerEvents: 'auto',
                x: position.x,
                y: position.y,
                width: width.get(),
                height: height.get(),
            }}
        >
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 50,
                    height: 50,
                    background: 'rgba(255,255,255,0)',
                    borderRadius: '50%',
                    cursor: 'se-resize',
                    zIndex: 1,
                }}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                onDrag={handleResize}
            />
            <video
                ref={videoRef}
                autoPlay
                muted={user.me}
                style={{
                    objectFit: 'cover',
                    width: '100%',
                    height: '100%',
                    borderRadius: 10,
                    overflow: 'hidden',
                    transform: 'scaleX(-1)'
                }}
            ></video>
            <motion.div variants={particleVariants} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,255,255,0)', width: 20, height: 20, borderRadius: '50%' }} />

            { /* Add username */}
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    background: 'rgba(0,0,0,.5)',
                    padding: 5
                }}>
                <p style={{ margin: 0, color: 'white', fontSize: 10, fontWeight: 200, textAlign: 'center' }}>{user.alias || user.username}</p>
            </motion.div>
        </motion.div>
    );
};

const AudioItem = ({ stream, user, volume, onDetectedVoice }) => {
    const audioRef = useRef(null);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.srcObject = stream;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();

            source.connect(analyser);
            analyser.fftSize = 2048;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkVoiceActivity = () => {
                analyser.getByteTimeDomainData(dataArray);

                const rms = Math.sqrt(
                    dataArray.reduce((sum, value) => sum + (value - 128) ** 2, 0) / bufferLength
                );

                if (rms > 5) {
                    onDetectedVoice(user.id);
                }

                requestAnimationFrame(checkVoiceActivity);
            };

            checkVoiceActivity();
        }
    }, [stream]);

    useEffect(() => {
        audioRef.current.volume = volume / 100;
    }, [volume]);

    return (
        <audio ref={audioRef} autoPlay muted={user.me} style={{ display: 'none' }}></audio>
    );
};

export default NetflixController;

const initController = () => {
    const controllerRoot = document.createElement('div');
    document.body.appendChild(controllerRoot);
    ReactDOM.render(<NetflixController />, controllerRoot);
};

const ToasterComponent = () => {
    return (
        <Toaster
            toastOptions={{
                style: {
                    borderRadius: "10px",
                    background: "#111",
                    boxShadow: "0 0 10px rgba(0,0,0,.1)",
                    border: "1px solid rgba(255,255,255,.1)",
                    color: "#fff",
                    fontWeight: 200,
                    fontSize: 12,
                    textAlign: "center",
                    zIndex: 1000000000000,
                    fontFamily: PRIMARY_FONT
                },
            }}
        />
    )
}

initController();